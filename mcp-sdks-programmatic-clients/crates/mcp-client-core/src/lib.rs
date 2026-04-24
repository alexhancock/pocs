//! # mcp-client-core
//!
//! Transport-agnostic augmentation layer for MCP client SDKs. Provides two
//! capabilities defined in the [MCP Client Best Practices] doc:
//!
//! 1. **Progressive tool discovery** — lightweight `search_tools` /
//!    `get_tool_details` meta-tools that keep the full catalog out of the
//!    model's context window.
//! 2. **Programmatic tool calling** — a sandboxed "code mode" that lets the
//!    model emit a single script invoking many tools, only returning the
//!    final summary to the model.
//!
//! This crate contains no language-specific code. It is consumed by:
//! - `mcp-client-node` (NAPI-RS, for the TypeScript SDK)
//! - `mcp-client-python` (PyO3, for the Python SDK) — future
//! - `mcp-client-uniffi` (Go, Kotlin, Swift, C#) — future
//!
//! The shape mirrors goose's extension-manager and code-execution extensions,
//! which are already production-tested:
//! - `~/Development/goose/crates/goose/src/agents/extension_manager.rs`
//! - `~/Development/goose/crates/goose/src/agents/platform_extensions/code_execution.rs`
//!
//! [MCP Client Best Practices]: https://modelcontextprotocol.io/docs/develop/clients/client-best-practices.md

pub mod broker;
pub mod catalog;
pub mod code_mode;
pub mod discovery;
pub mod types;

pub use broker::{Broker, McpConnection};
pub use catalog::ToolCatalog;
pub use code_mode::{CodeMode, CodeModeConfig};
pub use discovery::{DiscoveryConfig, ProgressiveDiscovery};
pub use types::*;

use async_trait::async_trait;
use serde_json::Value;
use std::sync::Arc;

/// Top-level configuration for the augmentation layer.
#[derive(Debug, Clone)]
pub struct AugmentationConfig {
    pub discovery: DiscoveryConfig,
    pub code_mode: CodeModeConfig,
}

impl Default for AugmentationConfig {
    fn default() -> Self {
        Self {
            discovery: DiscoveryConfig::default(),
            code_mode: CodeModeConfig::default(),
        }
    }
}

/// The main entry point. Wraps a [`Broker`] (which the language binding
/// constructs by adapting its SDK's native `Client`) and exposes the
/// augmented `listTools` / `callTool` surface.
///
/// # Design notes
///
/// - `list_tools` returns **meta-tools only** once the tool definitions
///   would exceed the configured context-window threshold, matching the
///   best-practices doc's 1–5% recommendation.
/// - `call_tool` intercepts meta-tool names (`search_tools`,
///   `get_tool_details`, `execute_typescript`, …) and otherwise passes
///   through to the underlying server.
/// - Meta-tools appear at a **stable position** at the head of the tool
///   list so that provider prompt caches stay warm across turns. Real
///   server tools are appended after the cache breakpoint. See goose's
///   `ExtensionManager::get_prefixed_tools` for the analogous logic.
pub struct Augmentation {
    broker: Arc<Broker>,
    discovery: ProgressiveDiscovery,
    code_mode: Option<CodeMode>,
    #[allow(dead_code)]
    config: AugmentationConfig,
}

impl Augmentation {
    pub fn new(broker: Broker, config: AugmentationConfig) -> Self {
        let broker = Arc::new(broker);
        let discovery = ProgressiveDiscovery::new(broker.clone(), config.discovery.clone());
        let code_mode = if config.code_mode.enabled {
            Some(CodeMode::new(broker.clone(), config.code_mode.clone()))
        } else {
            None
        };
        Self {
            broker,
            discovery,
            code_mode,
            config,
        }
    }

    /// Returns the augmented tool list. Either the full pass-through
    /// catalog (below the context-threshold) or the meta-tools (above it).
    pub async fn list_tools(&self) -> Result<Vec<Tool>, CoreError> {
        let all = self.broker.all_tools().await?;
        let estimated = crate::discovery::estimate_tool_bytes(&all);

        // Below threshold: pass through. Otherwise: meta-tools.
        if !self.discovery.should_use_discovery(estimated) {
            return Ok(all);
        }

        let mut meta = self.discovery.meta_tools();
        if let Some(cm) = &self.code_mode {
            meta.extend(cm.meta_tools());
        }
        Ok(meta)
    }

    /// Dispatch a tool call. Intercepts meta-tools, otherwise forwards
    /// to the appropriate MCP server via the broker.
    pub async fn call_tool(
        &self,
        name: &str,
        args: Option<Value>,
    ) -> Result<CallToolResult, CoreError> {
        if self.discovery.handles(name) {
            return self.discovery.dispatch(name, args).await;
        }
        if let Some(cm) = &self.code_mode {
            if cm.handles(name) {
                return cm.dispatch(name, args).await;
            }
        }
        self.broker.call_tool(name, args).await
    }

    /// Invalidate catalog caches. The language binding should call this
    /// whenever the underlying SDK surfaces a `notifications/tools/list_changed`.
    pub async fn on_list_changed(&self) {
        self.discovery.invalidate().await;
    }
}

/// Cross-cutting error type returned by the core.
#[derive(Debug, thiserror::Error)]
pub enum CoreError {
    #[error("broker error: {0}")]
    Broker(String),

    #[error("meta-tool error: {0}")]
    MetaTool(String),

    #[error("code-mode error: {0}")]
    CodeMode(String),

    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),
}

/// Convenience re-export of the connection trait for binding authors.
#[async_trait]
pub trait IntoConnection: Send + Sync {
    async fn into_connection(self) -> Arc<dyn McpConnection>;
}
