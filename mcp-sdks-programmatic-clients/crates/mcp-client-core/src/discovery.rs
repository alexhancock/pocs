//! Progressive discovery meta-tools.
//!
//! Implements the catalog → inspect → execute pattern described in the
//! [MCP Client Best Practices] doc. The tool names chosen here
//! (`search_tools`, `get_tool_details`) match the examples in that doc
//! verbatim so host prompts can reference them directly.
//!
//! [MCP Client Best Practices]: https://modelcontextprotocol.io/docs/develop/clients/client-best-practices.md

use crate::broker::Broker;
use crate::catalog::ToolCatalog;
use crate::types::{CallToolResult, Tool};
use crate::CoreError;
use serde_json::{json, Value};
use std::sync::Arc;

pub const TOOL_SEARCH: &str = "search_tools";
pub const TOOL_DETAILS: &str = "get_tool_details";
pub const TOOL_ENABLE_SERVER: &str = "enable_server";
pub const TOOL_DISABLE_SERVER: &str = "disable_server";

#[derive(Debug, Clone)]
pub struct DiscoveryConfig {
    /// Fraction of the model's context window (estimate) that tool
    /// definitions are allowed to consume before we switch to discovery
    /// mode. Best-practices doc recommends 1–5%.
    pub context_pct_threshold: f32,
    /// Approximate context window size in bytes, used with the threshold.
    /// Bindings can pass `model.context_window * 4` as a rough
    /// token-to-byte approximation, or override entirely.
    pub context_budget_bytes: usize,
    /// Max results returned by `search_tools`.
    pub search_limit: usize,
    /// Enable the `enable_server` / `disable_server` meta-tools.
    pub dynamic_servers: bool,
}

impl Default for DiscoveryConfig {
    fn default() -> Self {
        Self {
            context_pct_threshold: 0.03,
            context_budget_bytes: 200 * 1024, // ~50k tokens
            search_limit: 10,
            dynamic_servers: false,
        }
    }
}

pub struct ProgressiveDiscovery {
    catalog: ToolCatalog,
    config: DiscoveryConfig,
}

impl ProgressiveDiscovery {
    pub fn new(broker: Arc<Broker>, config: DiscoveryConfig) -> Self {
        Self {
            catalog: ToolCatalog::new(broker),
            config,
        }
    }

    pub async fn invalidate(&self) {
        self.catalog.invalidate();
    }

    pub fn meta_tools(&self) -> Vec<Tool> {
        let mut tools = vec![
            Tool {
                name: TOOL_SEARCH.into(),
                description: Some(
                    "Search the catalog of available MCP tools by keyword. Returns \
                     concise matches (name + one-line description) so you can narrow \
                     down which tool to inspect."
                        .into(),
                ),
                input_schema: json!({
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Natural-language query, e.g. 'update salesforce record'."
                        },
                        "limit": {
                            "type": "integer",
                            "minimum": 1,
                            "maximum": 50,
                            "description": "Maximum number of hits to return."
                        }
                    },
                    "required": ["query"]
                }),
                output_schema: None,
                server: None,
            },
            Tool {
                name: TOOL_DETAILS.into(),
                description: Some(
                    "Fetch the full schema (inputSchema, outputSchema, description) \
                     for a single tool. Call this after `search_tools` before invoking."
                        .into(),
                ),
                input_schema: json!({
                    "type": "object",
                    "properties": {
                        "name": {
                            "type": "string",
                            "description": "Tool name, optionally qualified as 'server/tool'."
                        }
                    },
                    "required": ["name"]
                }),
                output_schema: None,
                server: None,
            },
        ];

        if self.config.dynamic_servers {
            tools.push(Tool {
                name: TOOL_ENABLE_SERVER.into(),
                description: Some(
                    "Connect to a configured-but-inactive MCP server so its tools \
                     become available."
                        .into(),
                ),
                input_schema: json!({
                    "type": "object",
                    "properties": { "name": { "type": "string" } },
                    "required": ["name"]
                }),
                output_schema: None,
                server: None,
            });
            tools.push(Tool {
                name: TOOL_DISABLE_SERVER.into(),
                description: Some("Disconnect an MCP server and free its context.".into()),
                input_schema: json!({
                    "type": "object",
                    "properties": { "name": { "type": "string" } },
                    "required": ["name"]
                }),
                output_schema: None,
                server: None,
            });
        }

        tools
    }

    pub fn handles(&self, name: &str) -> bool {
        matches!(
            name,
            TOOL_SEARCH | TOOL_DETAILS | TOOL_ENABLE_SERVER | TOOL_DISABLE_SERVER
        )
    }

    pub async fn dispatch(
        &self,
        name: &str,
        args: Option<Value>,
    ) -> Result<CallToolResult, CoreError> {
        match name {
            TOOL_SEARCH => {
                let args = args.unwrap_or_default();
                let query = args
                    .get("query")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| CoreError::MetaTool("missing 'query'".into()))?;
                let limit = args
                    .get("limit")
                    .and_then(|v| v.as_u64())
                    .map(|n| n as usize)
                    .unwrap_or(self.config.search_limit);

                let hits = self.catalog.search(query, limit).await?;
                Ok(CallToolResult {
                    content: vec![],
                    structured_content: Some(json!({ "matches": hits })),
                    is_error: false,
                })
            }
            TOOL_DETAILS => {
                let args = args.unwrap_or_default();
                let name = args
                    .get("name")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| CoreError::MetaTool("missing 'name'".into()))?;

                match self.catalog.details(name).await? {
                    Some(tool) => Ok(CallToolResult {
                        content: vec![],
                        structured_content: Some(
                            serde_json::to_value(&tool).map_err(CoreError::Json)?,
                        ),
                        is_error: false,
                    }),
                    None => Err(CoreError::MetaTool(format!("no tool named '{name}'"))),
                }
            }
            TOOL_ENABLE_SERVER | TOOL_DISABLE_SERVER => {
                // Dynamic server management is wired by the language
                // binding (the SDK owns connection lifecycle). The core
                // exposes the meta-tools and leaves dispatch to the host.
                Err(CoreError::MetaTool(format!(
                    "'{name}' must be handled by the host; the binding did not register a handler"
                )))
            }
            _ => Err(CoreError::MetaTool(format!("unknown meta-tool '{name}'"))),
        }
    }

    pub fn should_use_discovery(&self, estimated_bytes: usize) -> bool {
        let budget = (self.config.context_budget_bytes as f32 * self.config.context_pct_threshold)
            as usize;
        estimated_bytes > budget
    }
}

/// Rough byte-size estimate of the serialized tool list. Used to decide
/// whether to switch into discovery mode.
pub fn estimate_tool_bytes(tools: &[Tool]) -> usize {
    serde_json::to_vec(tools).map(|v| v.len()).unwrap_or(0)
}
