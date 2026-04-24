//! # mcp-client-node
//!
//! Node.js (NAPI-RS 3) bindings for [`mcp_client_core`].
//!
//! # FFI design
//!
//! Bridging Rust `async` code to the Node event loop cheaply is the main
//! engineering constraint. We minimize the FFI surface to a single idea:
//! **two JS callbacks, each takes a JSON string, each returns
//! `Promise<string>`.** Every call from Rust to JS looks like that.
//!
//! On the JS side:
//!
//! ```js
//! const aug = new JsAugmentation(
//!   ['primary'],
//!   async (payload) => {
//!     // payload = '{"server":"primary"}'
//!     const { server } = JSON.parse(payload);
//!     const { tools } = await client.listTools();
//!     return JSON.stringify(tools);
//!   },
//!   async (payload) => {
//!     const { server, name, arguments: args } = JSON.parse(payload);
//!     const result = await client.callTool({ name, arguments: args });
//!     return JSON.stringify(result);
//!   },
//!   { discovery: { contextPctThreshold: 0.03 } }
//! );
//! ```
//!
//! On the Rust side, each callback is a
//! `ThreadsafeFunction<String, Promise<String>>`, which:
//!
//! 1. Holds a strong reference to the JS function so the event loop
//!    stays alive.
//! 2. Accepts a `String` argument from any Rust thread.
//! 3. Returns a `Promise<String>` that implements `Future`, so we can
//!    `.await` it directly.

#![deny(clippy::all)]

use async_trait::async_trait;
use mcp_client_core::{
    Augmentation, AugmentationConfig, Broker, CallToolResult, CodeModeConfig, DiscoveryConfig,
    McpConnection, Tool,
};
use napi::bindgen_prelude::{Error, Function, Promise, Result};
use napi::threadsafe_function::ThreadsafeFunction;
use napi_derive::napi;
use serde_json::Value;
use std::sync::Arc;

// ---------------------------------------------------------------------------
// Config mirror
// ---------------------------------------------------------------------------

#[napi(object)]
#[derive(Default)]
pub struct JsDiscoveryConfig {
    pub context_pct_threshold: Option<f64>,
    pub context_budget_bytes: Option<u32>,
    pub search_limit: Option<u32>,
    pub dynamic_servers: Option<bool>,
}

#[napi(object)]
#[derive(Default)]
pub struct JsCodeModeConfig {
    pub enabled: Option<bool>,
    pub output_limit_bytes: Option<u32>,
    pub expose_bash: Option<bool>,
}

#[napi(object)]
#[derive(Default)]
pub struct JsAugmentationConfig {
    pub discovery: Option<JsDiscoveryConfig>,
    pub code_mode: Option<JsCodeModeConfig>,
}

impl From<JsAugmentationConfig> for AugmentationConfig {
    fn from(c: JsAugmentationConfig) -> Self {
        let mut out = AugmentationConfig::default();
        if let Some(d) = c.discovery {
            let mut cfg = DiscoveryConfig::default();
            if let Some(v) = d.context_pct_threshold {
                cfg.context_pct_threshold = v as f32;
            }
            if let Some(v) = d.context_budget_bytes {
                cfg.context_budget_bytes = v as usize;
            }
            if let Some(v) = d.search_limit {
                cfg.search_limit = v as usize;
            }
            if let Some(v) = d.dynamic_servers {
                cfg.dynamic_servers = v;
            }
            out.discovery = cfg;
        }
        if let Some(c) = c.code_mode {
            let mut cfg = CodeModeConfig::default();
            if let Some(v) = c.enabled {
                cfg.enabled = v;
            }
            if let Some(v) = c.output_limit_bytes {
                cfg.output_limit_bytes = v as usize;
            }
            if let Some(v) = c.expose_bash {
                cfg.expose_bash = v;
            }
            out.code_mode = cfg;
        }
        out
    }
}

// ---------------------------------------------------------------------------
// JS-backed connection
// ---------------------------------------------------------------------------

/// Calling a `CalleeHandled = false` TSFN means the JS side is never given
/// a Rust error directly; instead we pass the String straight through and
/// let the JS wrapper return a rejected `Promise` if something goes wrong.
type JsCallback = ThreadsafeFunction<String, Promise<String>, String, napi::Status, false>;

/// A single SDK `Client` routed through two shared threadsafe callbacks.
struct JsConnection {
    name: String,
    list_tools_fn: Arc<JsCallback>,
    call_tool_fn: Arc<JsCallback>,
}

#[async_trait]
impl McpConnection for JsConnection {
    fn name(&self) -> &str {
        &self.name
    }

    async fn list_tools(&self) -> std::result::Result<Vec<Tool>, mcp_client_core::CoreError> {
        let payload = serde_json::json!({ "server": self.name }).to_string();
        let promise = self
            .list_tools_fn
            .call_async(payload)
            .await
            .map_err(|e| mcp_client_core::CoreError::Broker(format!("listTools dispatch: {e}")))?;
        let json_str = promise
            .await
            .map_err(|e| mcp_client_core::CoreError::Broker(format!("listTools resolve: {e}")))?;
        serde_json::from_str(&json_str).map_err(mcp_client_core::CoreError::Json)
    }

    async fn call_tool(
        &self,
        name: &str,
        args: Option<Value>,
    ) -> std::result::Result<CallToolResult, mcp_client_core::CoreError> {
        let payload = serde_json::json!({
            "server": self.name,
            "name": name,
            "arguments": args,
        })
        .to_string();
        let promise = self
            .call_tool_fn
            .call_async(payload)
            .await
            .map_err(|e| mcp_client_core::CoreError::Broker(format!("callTool dispatch: {e}")))?;
        let json_str = promise
            .await
            .map_err(|e| mcp_client_core::CoreError::Broker(format!("callTool resolve: {e}")))?;
        serde_json::from_str(&json_str).map_err(mcp_client_core::CoreError::Json)
    }
}

// ---------------------------------------------------------------------------
// Public class
// ---------------------------------------------------------------------------

#[napi]
pub struct JsAugmentation {
    inner: Arc<Augmentation>,
}

#[napi]
impl JsAugmentation {
    /// Construct from a list of server names plus two multiplexed
    /// callbacks. Every call from Rust into JS carries a server-name tag
    /// inside the JSON payload so the shim knows which SDK client to
    /// dispatch to.
    ///
    /// Why one pair of callbacks instead of one pair per connection?
    /// `ThreadsafeFunction` holds a strong JS reference; bundling them up
    /// front keeps the JS wrapper object graph shallow and lets us keep
    /// the constructor's signature flat (napi-derive can't put a
    /// `ThreadsafeFunction` inside an object argument).
    #[napi(constructor)]
    pub fn new(
        server_names: Vec<String>,
        list_tools: Function<'_, String, Promise<String>>,
        call_tool: Function<'_, String, Promise<String>>,
        config: Option<JsAugmentationConfig>,
    ) -> Result<Self> {
        // Convert the raw JS `Function` values into threadsafe handles
        // that we can store and call from any Rust thread. The defaults
        // — `CalleeHandled = false`, `Weak = false`, `MaxQueueSize = 0`
        // — mean: we don't throw on the JS side from Rust errors, we keep
        // the event loop alive while we hold the handle, and the call
        // queue is unbounded.
        let list_tools_tsfn: JsCallback = list_tools
            .build_threadsafe_function()
            .callee_handled::<false>()
            .build()?;
        let call_tool_tsfn: JsCallback = call_tool
            .build_threadsafe_function()
            .callee_handled::<false>()
            .build()?;

        let list_tools = Arc::new(list_tools_tsfn);
        let call_tool = Arc::new(call_tool_tsfn);

        let broker = Broker::new();
        for name in server_names {
            let conn: Arc<dyn McpConnection> = Arc::new(JsConnection {
                name,
                list_tools_fn: list_tools.clone(),
                call_tool_fn: call_tool.clone(),
            });
            broker.add(conn);
        }
        let config: AugmentationConfig = config.unwrap_or_default().into();
        Ok(Self {
            inner: Arc::new(Augmentation::new(broker, config)),
        })
    }

    /// Returns the augmented tool list as a JSON string.
    #[napi]
    pub async fn list_tools(&self) -> Result<String> {
        let tools = self
            .inner
            .list_tools()
            .await
            .map_err(|e| Error::from_reason(e.to_string()))?;
        serde_json::to_string(&tools).map_err(|e| Error::from_reason(e.to_string()))
    }

    /// Dispatch a tool call. Takes name + optional JSON-string args,
    /// returns a JSON-stringified `CallToolResult`.
    #[napi]
    pub async fn call_tool(&self, name: String, args_json: Option<String>) -> Result<String> {
        let args: Option<Value> = match args_json {
            Some(s) if !s.is_empty() => {
                Some(serde_json::from_str(&s).map_err(|e| Error::from_reason(e.to_string()))?)
            }
            _ => None,
        };
        let result = self
            .inner
            .call_tool(&name, args)
            .await
            .map_err(|e| Error::from_reason(e.to_string()))?;
        serde_json::to_string(&result).map_err(|e| Error::from_reason(e.to_string()))
    }

    /// Invalidate the catalog cache. Call on
    /// `notifications/tools/list_changed`.
    #[napi]
    pub async fn on_list_changed(&self) -> Result<()> {
        self.inner.on_list_changed().await;
        Ok(())
    }
}
