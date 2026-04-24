//! Tool catalog: a cached, BM25-indexed view of tools across all connected
//! MCP servers.
//!
//! Mirrors the caching behavior in `ExtensionManager::get_all_tools_cached`
//! / `fetch_all_tools` in goose, and swaps the hand-rolled ranker for
//! `bm25::SearchEngine` so ranking quality is on par with what production
//! retrieval code expects.

use crate::broker::Broker;
use crate::types::Tool;
use crate::CoreError;
use bm25::{Document, LanguageMode, SearchEngine, SearchEngineBuilder};
use parking_lot::RwLock;
use std::sync::Arc;

pub struct ToolCatalog {
    broker: Arc<Broker>,
    cache: RwLock<CacheState>,
}

struct CacheState {
    tools: Option<Vec<Tool>>,
    /// BM25 engine keyed by *index into `tools`*. We use a numeric id
    /// because `SearchEngine` documents it's more efficient and we want
    /// the full `Tool` back by index after scoring.
    engine: Option<SearchEngine<u32>>,
}

impl CacheState {
    fn empty() -> Self {
        Self {
            tools: None,
            engine: None,
        }
    }
}

impl ToolCatalog {
    pub fn new(broker: Arc<Broker>) -> Self {
        Self {
            broker,
            cache: RwLock::new(CacheState::empty()),
        }
    }

    /// Drop the cached tool list and search index. Called by the
    /// augmentation layer in response to `notifications/tools/list_changed`.
    pub fn invalidate(&self) {
        *self.cache.write() = CacheState::empty();
    }

    /// Fetch (possibly cached) tool list. Also eagerly builds/refreshes
    /// the BM25 index so concurrent `search()` calls don't race on it.
    pub async fn tools(&self) -> Result<Vec<Tool>, CoreError> {
        {
            let guard = self.cache.read();
            if let Some(t) = &guard.tools {
                return Ok(t.clone());
            }
        }
        let tools = self.broker.all_tools().await?;
        let engine = build_engine(&tools);
        let mut guard = self.cache.write();
        guard.tools = Some(tools.clone());
        guard.engine = Some(engine);
        Ok(tools)
    }

    /// Ensure the index is built, then return it alongside the tool list.
    async fn ensure_index(&self) -> Result<Vec<Tool>, CoreError> {
        self.tools().await
    }

    /// BM25-scored search. Returns qualified tool names (`server/tool`)
    /// with their first line of description and the raw BM25 score.
    pub async fn search(&self, query: &str, limit: usize) -> Result<Vec<SearchHit>, CoreError> {
        let tools = self.ensure_index().await?;
        let guard = self.cache.read();
        let engine = guard.engine.as_ref().expect("engine built above");

        let results = engine.search(query, limit);
        Ok(results
            .into_iter()
            .filter_map(|r| {
                let tool = tools.get(r.document.id as usize)?;
                Some(SearchHit {
                    name: qualify(tool),
                    description: first_line(tool.description.as_deref().unwrap_or("")),
                    score: r.score,
                })
            })
            .collect())
    }

    /// Look up a tool by qualified name (`server/tool`) or bare name.
    pub async fn details(&self, name: &str) -> Result<Option<Tool>, CoreError> {
        let tools = self.tools().await?;
        Ok(tools
            .into_iter()
            .find(|t| qualify(t) == name || t.name == name))
    }
}

/// Namespace a tool with its source server, matching goose's `server/tool`
/// (or `server__tool`) convention. Used as the canonical tool identifier
/// presented to the model.
pub fn qualify(t: &Tool) -> String {
    match &t.server {
        Some(s) => format!("{s}/{}", t.name),
        None => t.name.clone(),
    }
}

fn first_line(s: &str) -> String {
    s.lines().next().unwrap_or("").trim().to_string()
}

fn build_engine(tools: &[Tool]) -> SearchEngine<u32> {
    // Corpus used for BM25 ranking: the qualified name, description, and
    // server name. This matches the fields goose's `search_available_extensions`
    // considers relevant for lexical matching.
    let docs: Vec<Document<u32>> = tools
        .iter()
        .enumerate()
        .map(|(idx, t)| {
            let body = format!(
                "{} {} {}",
                qualify(t),
                t.description.as_deref().unwrap_or(""),
                t.server.as_deref().unwrap_or("")
            );
            Document::new(idx as u32, body)
        })
        .collect();

    SearchEngineBuilder::<u32>::with_documents(LanguageMode::Fixed(bm25::Language::English), docs)
        .build()
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct SearchHit {
    pub name: String,
    pub description: String,
    pub score: f32,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::broker::McpConnection;
    use crate::types::CallToolResult;
    use async_trait::async_trait;
    use serde_json::json;
    use serde_json::Value;

    struct Fake {
        name: String,
        tools: Vec<Tool>,
    }

    #[async_trait]
    impl McpConnection for Fake {
        fn name(&self) -> &str {
            &self.name
        }
        async fn list_tools(&self) -> Result<Vec<Tool>, CoreError> {
            Ok(self.tools.clone())
        }
        async fn call_tool(
            &self,
            _name: &str,
            _args: Option<Value>,
        ) -> Result<CallToolResult, CoreError> {
            Ok(CallToolResult::text("ok"))
        }
    }

    fn tool(name: &str, desc: &str) -> Tool {
        Tool {
            name: name.into(),
            description: Some(desc.into()),
            input_schema: json!({"type":"object"}),
            output_schema: None,
            server: None,
        }
    }

    #[tokio::test]
    async fn bm25_ranks_exact_match_first() {
        let broker = Arc::new(Broker::with(vec![Arc::new(Fake {
            name: "fs".into(),
            tools: vec![
                tool("read_file", "read the contents of a file on disk"),
                tool("write_file", "write bytes to a file"),
                tool("list_dir", "list entries in a directory"),
                tool("echo", "echo a message back to the caller"),
            ],
        })]));
        let cat = ToolCatalog::new(broker);

        let hits = cat.search("read file", 5).await.unwrap();
        assert!(!hits.is_empty(), "expected hits");
        assert_eq!(hits[0].name, "fs/read_file");
    }

    #[tokio::test]
    async fn invalidate_forces_refetch() {
        let broker = Arc::new(Broker::with(vec![Arc::new(Fake {
            name: "srv".into(),
            tools: vec![tool("a", "alpha")],
        })]));
        let cat = ToolCatalog::new(broker);
        let _ = cat.tools().await.unwrap();
        cat.invalidate();
        // Rebuilds without panicking.
        let _ = cat.search("alpha", 1).await.unwrap();
    }
}
