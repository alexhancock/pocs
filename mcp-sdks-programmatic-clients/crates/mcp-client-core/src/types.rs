//! MCP-shaped types used at the core/binding boundary.
//!
//! These are intentionally a thin JSON-compatible mirror of the MCP spec
//! rather than a full re-implementation. Bindings translate to/from their
//! SDK's native types when crossing the FFI boundary.

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Minimal MCP tool descriptor. Matches the wire shape so that bindings
/// can pass SDK-native `Tool` objects through with at most a rename.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tool {
    pub name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// JSON Schema object.
    #[serde(rename = "inputSchema")]
    pub input_schema: Value,
    #[serde(rename = "outputSchema", default, skip_serializing_if = "Option::is_none")]
    pub output_schema: Option<Value>,
    /// The logical server this tool came from. Used internally for
    /// routing and for grouping in search results.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub server: Option<String>,
}

/// Mirrors MCP's `CallToolResult`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CallToolResult {
    #[serde(default)]
    pub content: Vec<Content>,
    #[serde(rename = "structuredContent", default, skip_serializing_if = "Option::is_none")]
    pub structured_content: Option<Value>,
    #[serde(rename = "isError", default)]
    pub is_error: bool,
}

impl CallToolResult {
    pub fn text(s: impl Into<String>) -> Self {
        Self {
            content: vec![Content::text(s)],
            structured_content: None,
            is_error: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum Content {
    Text { text: String },
    // Future: Image, Resource, etc. — bindings should pass-through unknown
    // variants verbatim.
}

impl Content {
    pub fn text(s: impl Into<String>) -> Self {
        Content::Text { text: s.into() }
    }
}
