//! Demo 3: compacting a caller-owned data structure through the
//! CompactionInput / CompactionOutput traits (Rust only).
//!
//! Run: OPENAI_API_KEY=sk-... cargo run --bin traits

use std::sync::Arc;

use anyhow::Result;
use goose_compaction::{compact, CompactionInput, CompactionOutput, ProviderModel, Templates};
use goose_providers::api_client::{ApiClient, AuthMethod};
use goose_providers::conversation::message::Message;
use goose_providers::conversation::token_usage::ProviderUsage;
use goose_providers::model::ModelConfig;
use goose_providers::openai::OpenAiProviderBuilder;

/// The caller's own transcript type - knows nothing about goose's Message.
struct Transcript {
    turns: Vec<(String, String)>,
}

impl Transcript {
    fn new(turns: &[(&str, &str)]) -> Self {
        Self {
            turns: turns
                .iter()
                .map(|(who, what)| (who.to_string(), what.to_string()))
                .collect(),
        }
    }
}

/// Where the caller wants the result to land.
struct SupportTicket {
    id: String,
    resolution: Option<String>,
    tokens_spent: Option<i32>,
}

impl CompactionInput for Transcript {
    fn messages(&self) -> Vec<Message> {
        self.turns
            .iter()
            .map(|(who, what)| match who.as_str() {
                "customer" => Message::user().with_text(what),
                _ => Message::assistant().with_text(what),
            })
            .collect()
    }

    fn templates(&self) -> Templates {
        Templates::default()
    }
}

impl CompactionOutput for SupportTicket {
    fn set_summary(&mut self, summary: Message) {
        self.resolution = Some(summary.as_concat_text());
    }

    fn set_usage(&mut self, usage: ProviderUsage) {
        self.tokens_spent = usage.usage.total_tokens;
    }
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

    let transcript = Transcript::new(&[
            ("customer", "Card reader won't pair with my iPad."),
            ("agent", "Is the reader's light blinking green or red?"),
            ("customer", "Red, and it never appears in the Bluetooth list."),
            ("agent", "A solid red light usually means the battery is too low to pair. Can you charge it for 30 minutes?"),
            ("customer", "Charged it and now it blinks green, but pairing still times out."),
            ("agent", "Please forget the device in iOS Bluetooth settings, then re-pair from inside the app."),
            ("customer", "That worked - it's connected and I took a test payment."),
            ("agent", "Glad to hear it. Keep the reader charged above 20% to avoid this."),
    ]);

    let mut ticket = SupportTicket {
        id: "TICKET-4417".to_string(),
        resolution: None,
        tokens_spent: None,
    };

    println!("ticket {} has {} turns", ticket.id, transcript.turns.len());
    println!("resolution before: {:?}\n", ticket.resolution);

    compact(&model, None, &transcript, &mut ticket).await?;

    println!(
        "--- resolution written back onto SupportTicket ---\n{}\n",
        ticket.resolution.as_deref().unwrap_or("<none>")
    );
    println!("tokens_spent: {:?}", ticket.tokens_spent);
    Ok(())
}
