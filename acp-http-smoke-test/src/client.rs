//! ACP HTTP/WS smoke-test client.
//!
//! Connects to a running ACP HTTP server (e.g. `goose serve`) twice — once
//! over HTTP+SSE and once over WebSocket — and runs a tiny exchange against
//! each transport:
//!
//!   1. `initialize`
//!   2. `session/new`
//!
//! `session/new` is enough to confirm that POST + Acp-Session-Id round-trips
//! work; we deliberately do not send a `session/prompt`, because that would
//! require a configured LLM provider in goose.
//!
//! Env vars:
//!   ACP_SMOKE_HOST    default 127.0.0.1
//!   ACP_SMOKE_PORT    default 3284

use agent_client_protocol::schema::{
    InitializeRequest, NewSessionRequest, ProtocolVersion,
};
use agent_client_protocol::{Client, ConnectionTo, Agent};
use agent_client_protocol_http::HttpClient;
use anyhow::{Context, Result};
use std::path::PathBuf;
use std::time::Duration;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,agent_client_protocol_http=debug".into()),
        )
        .with_target(false)
        .init();

    let host = std::env::var("ACP_SMOKE_HOST").unwrap_or_else(|_| "127.0.0.1".into());
    let port = std::env::var("ACP_SMOKE_PORT").unwrap_or_else(|_| "3284".into());

    wait_for_health(&host, &port).await?;

    let http_url = format!("http://{host}:{port}/acp");
    let ws_url = format!("ws://{host}:{port}/acp");

    println!("\n══════════════════════════════════════════════════════════════");
    println!(" 1/2  HTTP + SSE transport   ({http_url})");
    println!("══════════════════════════════════════════════════════════════");
    run_exchange(&http_url).await.context("HTTP+SSE exchange failed")?;
    println!("✅  HTTP+SSE exchange OK");

    println!("\n══════════════════════════════════════════════════════════════");
    println!(" 2/2  WebSocket transport    ({ws_url})");
    println!("══════════════════════════════════════════════════════════════");
    run_exchange(&ws_url).await.context("WebSocket exchange failed")?;
    println!("✅  WebSocket exchange OK");

    println!("\n🎉 Both transports succeeded.");
    Ok(())
}

async fn run_exchange(url: &str) -> Result<()> {
    let transport = HttpClient::new(url).context("constructing HttpClient")?;

    Client
        .builder()
        .connect_with(transport, async |cx: ConnectionTo<Agent>| {
            tracing::info!("→ sending initialize");
            let init = cx
                .send_request(InitializeRequest::new(ProtocolVersion::V1))
                .block_task()
                .await?;
            tracing::info!(
                "← initialize OK   protocol_version={:?}   agent={:?}",
                init.protocol_version,
                init.agent_info,
            );

            tracing::info!("→ sending session/new");
            let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("/"));
            let session = cx
                .send_request(NewSessionRequest::new(cwd))
                .block_task()
                .await?;
            tracing::info!("← session/new OK   session_id={:?}", session.session_id);

            Ok::<_, agent_client_protocol::Error>(())
        })
        .await?;

    Ok(())
}

async fn wait_for_health(host: &str, port: &str) -> Result<()> {
    let url = format!("http://{host}:{port}/health");
    let http = reqwest::Client::new();
    let deadline = std::time::Instant::now() + Duration::from_secs(30);
    let mut last_err: Option<String> = None;
    while std::time::Instant::now() < deadline {
        match http.get(&url).send().await {
            Ok(r) if r.status().is_success() => {
                tracing::info!("server is up: {url}");
                return Ok(());
            }
            Ok(r) => last_err = Some(format!("HTTP {}", r.status())),
            Err(e) => last_err = Some(e.to_string()),
        }
        tokio::time::sleep(Duration::from_millis(250)).await;
    }
    anyhow::bail!(
        "server did not become healthy within 30s at {url} (last error: {})",
        last_err.unwrap_or_else(|| "?".into())
    );
}
