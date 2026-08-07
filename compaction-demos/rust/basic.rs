//! Demo 1: compaction via the core `summarize` API.
//!
//! Run: OPENAI_API_KEY=sk-... cargo run --bin basic

use std::sync::Arc;

use anyhow::Result;
use goose_compaction::{summarize, ProviderModel, Templates};
use goose_providers::api_client::{ApiClient, AuthMethod};
use goose_providers::conversation::message::Message;
use goose_providers::model::ModelConfig;
use goose_providers::openai::OpenAiProviderBuilder;

fn conversation() -> Vec<Message> {
    vec![
        Message::user().with_text("I'm debugging a memory leak in our Rust web service."),
        Message::assistant()
            .with_text("Let's start by checking where allocations grow. Do you have heap profiles?"),
        Message::user().with_text("Yes, jemalloc profiles show growth in the request handler."),
        Message::assistant().with_text(
            "That often means a cache without eviction. Check any HashMap that only inserts.",
        ),
        Message::user()
            .with_text("Found it - a session HashMap in AppState that never removes entries."),
        Message::assistant().with_text(
            "Replace it with an LRU cache with a bounded capacity, or add a TTL sweep task.",
        ),
        Message::user().with_text("I used an LruCache with capacity 10_000 and the leak stopped."),
        Message::assistant()
            .with_text("Great. Add a metric for cache size so regressions are visible."),
    ]
}

#[tokio::main]
async fn main() -> Result<()> {
    let api_key = std::env::var("OPENAI_API_KEY")
        .map_err(|_| anyhow::anyhow!("set OPENAI_API_KEY to run this demo"))?;

    let api_client = ApiClient::new_with_tls(
        "https://api.openai.com".to_string(),
        AuthMethod::BearerToken(api_key),
        None,
    )?;
    let provider = OpenAiProviderBuilder::new(api_client).build();
    let model = ProviderModel::new(Arc::new(provider), ModelConfig::new("gpt-4o-mini"));

    let messages = conversation();
    println!("compacting {} messages...\n", messages.len());

    let summary = summarize(&model, None, &Templates::default(), &messages).await?;

    println!("--- summary ---\n{}\n", summary.message.as_concat_text());
    println!(
        "tokens: input={:?} output={:?}",
        summary.usage.usage.input_tokens, summary.usage.usage.output_tokens
    );
    Ok(())
}
