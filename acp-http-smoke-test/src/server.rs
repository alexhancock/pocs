//! ACP HTTP/WS smoke-test server.
//!
//! Spawns goose's built-in `goose serve` subcommand, which exposes a Goose ACP
//! agent over HTTP+SSE and WebSocket on the same `/acp` endpoint using the
//! `agent-client-protocol-http` server transport from this SDK.
//!
//! We deliberately keep this binary thin: goose already wires its `AcpAgent`
//! into `AcpHttpServer`, so re-implementing that here would add a large dep
//! tree (goose pulls in a v8 vendor crate, etc.) for no extra coverage.
//!
//! Env vars:
//!   ACP_SMOKE_HOST           default 127.0.0.1
//!   ACP_SMOKE_PORT           default 3284
//!   GOOSE_BIN                default ../../../goose-worktrees/acp-http-from-sdk/target/debug/goose
//!                            (resolved from the working directory)

use anyhow::{Context, Result};
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::signal;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .with_target(false)
        .init();

    let host = std::env::var("ACP_SMOKE_HOST").unwrap_or_else(|_| "127.0.0.1".into());
    let port = std::env::var("ACP_SMOKE_PORT").unwrap_or_else(|_| "3284".into());
    let goose_bin = std::env::var("GOOSE_BIN").unwrap_or_else(|_| {
        // Default: sibling worktree's debug build.
        let here = std::env::current_dir().unwrap_or_default();
        here.join("../../goose-worktrees/acp-http-from-sdk/target/debug/goose")
            .to_string_lossy()
            .into_owned()
    });

    tracing::info!("starting goose ACP server: {goose_bin} serve --host {host} --port {port}");

    let mut child = Command::new(&goose_bin)
        .arg("serve")
        .arg("--host")
        .arg(&host)
        .arg("--port")
        .arg(&port)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .with_context(|| format!("failed to spawn `{goose_bin} serve` -- is GOOSE_BIN set?"))?;

    // Forward child output to our stdout/stderr with a [goose] prefix so the
    // client logs stay readable when both run together.
    if let Some(out) = child.stdout.take() {
        tokio::spawn(async move {
            let mut lines = BufReader::new(out).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                println!("[goose] {line}");
            }
        });
    }
    if let Some(err) = child.stderr.take() {
        tokio::spawn(async move {
            let mut lines = BufReader::new(err).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                eprintln!("[goose] {line}");
            }
        });
    }

    tracing::info!("server listening on http://{host}:{port}/acp (health: /health)");

    tokio::select! {
        status = child.wait() => {
            let status = status?;
            anyhow::bail!("goose serve exited unexpectedly: {status}");
        }
        _ = signal::ctrl_c() => {
            tracing::info!("ctrl-c received, shutting down");
            let _ = child.kill().await;
        }
    }

    Ok(())
}
