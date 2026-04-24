//! Programmatic tool calling ("code mode") meta-tools.
//!
//! When the `code-mode` Cargo feature is enabled, this module delegates to
//! the [`pctx_code_mode`] crate — the exact same one goose's
//! `CodeExecutionClient` uses in production. It:
//!
//! * Generates a typed TypeScript API from each tool's JSON schemas.
//! * Runs model-authored scripts in a Deno V8 sandbox with no network
//!   permissions; stubs route back through the broker.
//! * Caches the transpiled TypeScript module, keyed by the catalog hash,
//!   so unchanged tool sets don't pay a rebuild cost per execution.
//!
//! When the feature is **off** the meta-tools are advertised but dispatch
//! returns a clear error. This keeps the non-code-mode code path free of
//! Deno/V8 native dependencies for hosts that don't want them.

use crate::broker::Broker;
#[cfg(feature = "code-mode")]
use crate::types::Content;
use crate::types::{CallToolResult, Tool};
use crate::CoreError;
use serde_json::{json, Value};
use std::sync::Arc;

pub const TOOL_LIST_FUNCTIONS: &str = "list_functions";
pub const TOOL_GET_FUNCTION_DETAILS: &str = "get_function_details";
pub const TOOL_EXECUTE_TYPESCRIPT: &str = "execute_typescript";
pub const TOOL_EXECUTE_BASH: &str = "execute_bash";

#[derive(Debug, Clone)]
pub struct CodeModeConfig {
    pub enabled: bool,
    pub sandbox: Sandbox,
    pub output_limit_bytes: usize,
    /// Whether `execute_bash` is advertised. Many hosts will want to leave
    /// this off by default.
    pub expose_bash: bool,
}

#[derive(Debug, Clone, Copy)]
pub enum Sandbox {
    Deno,
}

impl Default for CodeModeConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            sandbox: Sandbox::Deno,
            output_limit_bytes: 32 * 1024,
            expose_bash: false,
        }
    }
}

pub struct CodeMode {
    #[cfg_attr(not(feature = "code-mode"), allow(dead_code))]
    broker: Arc<Broker>,
    config: CodeModeConfig,
}

impl CodeMode {
    pub fn new(broker: Arc<Broker>, config: CodeModeConfig) -> Self {
        Self { broker, config }
    }

    pub fn meta_tools(&self) -> Vec<Tool> {
        let mut out = vec![
            Tool {
                name: TOOL_LIST_FUNCTIONS.into(),
                description: Some(
                    "List the typed TypeScript functions auto-generated from MCP tools. \
                     Call before `execute_typescript` so you know what's available."
                        .into(),
                ),
                input_schema: json!({ "type": "object", "properties": {} }),
                output_schema: None,
                server: None,
            },
            Tool {
                name: TOOL_GET_FUNCTION_DETAILS.into(),
                description: Some(
                    "Get the full TypeScript signature (input/output types + JSDoc) \
                     for one or more functions before using them."
                        .into(),
                ),
                input_schema: json!({
                    "type": "object",
                    "properties": {
                        "names": { "type": "array", "items": { "type": "string" } }
                    },
                    "required": ["names"]
                }),
                output_schema: None,
                server: None,
            },
            Tool {
                name: TOOL_EXECUTE_TYPESCRIPT.into(),
                description: Some(
                    "Run model-authored TypeScript in a Deno sandbox. Calls to the \
                     typed MCP functions are brokered back to this client; only \
                     console output returns to the model."
                        .into(),
                ),
                input_schema: json!({
                    "type": "object",
                    "properties": {
                        "code": { "type": "string" },
                        "tool_graph": {
                            "type": "array",
                            "description": "Optional DAG describing the planned tool calls.",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "tool": { "type": "string" },
                                    "description": { "type": "string" },
                                    "depends_on": {
                                        "type": "array",
                                        "items": { "type": "integer" }
                                    }
                                },
                                "required": ["tool", "description"]
                            }
                        }
                    },
                    "required": ["code"]
                }),
                output_schema: None,
                server: None,
            },
        ];
        if self.config.expose_bash {
            out.push(Tool {
                name: TOOL_EXECUTE_BASH.into(),
                description: Some(
                    "Run a shell command inside the sandbox. Only available when \
                     the host has granted shell access."
                        .into(),
                ),
                input_schema: json!({
                    "type": "object",
                    "properties": { "command": { "type": "string" } },
                    "required": ["command"]
                }),
                output_schema: None,
                server: None,
            });
        }
        out
    }

    pub fn handles(&self, name: &str) -> bool {
        matches!(
            name,
            TOOL_LIST_FUNCTIONS
                | TOOL_GET_FUNCTION_DETAILS
                | TOOL_EXECUTE_TYPESCRIPT
                | TOOL_EXECUTE_BASH
        )
    }

    pub async fn dispatch(
        &self,
        name: &str,
        args: Option<Value>,
    ) -> Result<CallToolResult, CoreError> {
        #[cfg(feature = "code-mode")]
        {
            return self.dispatch_real(name, args).await;
        }
        #[cfg(not(feature = "code-mode"))]
        {
            let _ = args;
            Err(CoreError::CodeMode(format!(
                "code-mode tool '{name}' requires the `code-mode` Cargo feature"
            )))
        }
    }
}

// ---------------------------------------------------------------------------
// Real dispatch, backed by pctx_code_mode.
// ---------------------------------------------------------------------------

#[cfg(feature = "code-mode")]
impl CodeMode {
    async fn dispatch_real(
        &self,
        name: &str,
        args: Option<Value>,
    ) -> Result<CallToolResult, CoreError> {
        use pctx_code_mode::config::ToolDisclosure;
        use pctx_code_mode::model::{CallbackConfig, ExecuteBashInput, GetFunctionDetailsInput};
        use pctx_code_mode::CodeMode as PctxCodeMode;

        let tools = self.broker.all_tools().await?;
        let mut pctx = PctxCodeMode::default();

        // Translate each MCP tool into a pctx `CallbackConfig`. The
        // namespace becomes the TS object the model imports from.
        let callbacks: Vec<CallbackConfig> = tools
            .iter()
            .map(|t| CallbackConfig {
                namespace: t.server.clone(),
                name: t.name.clone(),
                description: t.description.clone(),
                input_schema: Some(t.input_schema.clone()),
                output_schema: t.output_schema.clone(),
            })
            .collect();

        for cb in &callbacks {
            pctx.add_callback(cb)
                .map_err(|e| CoreError::CodeMode(format!("add_callback: {e}")))?;
        }

        match name {
            TOOL_LIST_FUNCTIONS => {
                let out = pctx.list_functions();
                Ok(CallToolResult {
                    content: vec![Content::text(out.code)],
                    structured_content: None,
                    is_error: false,
                })
            }
            TOOL_GET_FUNCTION_DETAILS => {
                let args = args.unwrap_or(json!({}));
                let input: GetFunctionDetailsInput = serde_json::from_value(args)
                    .map_err(|e| CoreError::CodeMode(format!("bad args: {e}")))?;
                let out = pctx.get_function_details(input);
                Ok(CallToolResult {
                    content: vec![Content::text(out.code)],
                    structured_content: None,
                    is_error: false,
                })
            }
            TOOL_EXECUTE_BASH => {
                if !self.config.expose_bash {
                    return Err(CoreError::CodeMode(
                        "bash execution is disabled in this configuration".into(),
                    ));
                }
                let input: ExecuteBashInput = serde_json::from_value(args.unwrap_or(json!({})))
                    .map_err(|e| CoreError::CodeMode(format!("bad args: {e}")))?;

                // Deno runtime is !Send; mirror goose's pattern of running
                // it on a blocking thread with its own current-thread
                // runtime. See `code_execution.rs::handle_execute_bash`.
                let command = input.command;
                let out = tokio::task::spawn_blocking(move || {
                    let rt = tokio::runtime::Builder::new_current_thread()
                        .enable_all()
                        .build()
                        .map_err(|e| format!("runtime: {e}"))?;
                    rt.block_on(async move {
                        pctx.execute_bash(&command)
                            .await
                            .map_err(|e| format!("bash: {e}"))
                    })
                })
                .await
                .map_err(|e| CoreError::CodeMode(format!("join: {e}")))?
                .map_err(CoreError::CodeMode)?;

                let md = format!(
                    "Exit Code: {}\n\n# STDOUT\n{}\n\n# STDERR\n{}",
                    out.exit_code, out.stdout, out.stderr
                );
                Ok(CallToolResult {
                    content: vec![Content::text(md)],
                    structured_content: None,
                    is_error: out.exit_code != 0,
                })
            }
            TOOL_EXECUTE_TYPESCRIPT => {
                let args = args.unwrap_or(json!({}));
                let code = args
                    .get("code")
                    .and_then(|v| v.as_str())
                    .ok_or_else(|| CoreError::CodeMode("missing 'code'".into()))?
                    .to_string();

                // Build the registry: for every callback, route back
                // through the broker. Mirrors `create_tool_callback` in
                // goose's `code_execution.rs`.
                let registry = pctx
                    .default_registry()
                    .map_err(|e| CoreError::CodeMode(format!("registry: {e}")))?;

                for cb in &callbacks {
                    let broker = self.broker.clone();
                    let qualified = match &cb.namespace {
                        Some(ns) => format!("{ns}/{}", cb.name),
                        None => cb.name.clone(),
                    };
                    let id = cb.id();
                    registry
                        .add_callback(
                            &id,
                            Arc::new(move |cb_args: Option<Value>| {
                                let broker = broker.clone();
                                let qualified = qualified.clone();
                                Box::pin(async move {
                                    match broker.call_tool(&qualified, cb_args).await {
                                        Ok(result) => {
                                            if let Some(sc) = result.structured_content {
                                                Ok(sc)
                                            } else {
                                                let text = result
                                                    .content
                                                    .iter()
                                                    .filter_map(|c| match c {
                                                        Content::Text { text } => {
                                                            Some(text.clone())
                                                        }
                                                    })
                                                    .collect::<Vec<_>>()
                                                    .join("\n");
                                                Ok(serde_json::from_str(&text)
                                                    .unwrap_or(Value::String(text)))
                                            }
                                        }
                                        Err(e) => Err(format!("broker error: {e}")),
                                    }
                                })
                            }),
                        )
                        .map_err(|e| CoreError::CodeMode(format!("register cb: {e}")))?;
                }

                let disclosure = ToolDisclosure::default();

                // Deno runtime is !Send — run on a blocking thread.
                let output = tokio::task::spawn_blocking(move || {
                    let rt = tokio::runtime::Builder::new_current_thread()
                        .enable_all()
                        .build()
                        .map_err(|e| format!("runtime: {e}"))?;
                    rt.block_on(async move {
                        pctx.execute_typescript(&code, disclosure, Some(registry))
                            .await
                            .map_err(|e| format!("typescript exec: {e}"))
                    })
                })
                .await
                .map_err(|e| CoreError::CodeMode(format!("join: {e}")))?
                .map_err(CoreError::CodeMode)?;

                let mut md = output.markdown();
                if md.len() > self.config.output_limit_bytes {
                    md.truncate(self.config.output_limit_bytes);
                    md.push_str("\n… (output truncated)");
                }
                Ok(CallToolResult {
                    content: vec![Content::text(md)],
                    structured_content: None,
                    is_error: !output.success,
                })
            }
            other => Err(CoreError::CodeMode(format!("unknown: {other}"))),
        }
    }
}
