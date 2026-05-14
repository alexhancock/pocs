# acp-http-smoke-test

Exercises the new HTTP / WebSocket transport added to the ACP Rust SDK in:

> `feat(transports): add HTTP/WebSocket transport support`
> (`agent-client-protocol-http` crate)

It boots a Goose ACP agent via `goose serve` and runs a vanilla ACP client
against it **twice** — once over HTTP+SSE, once over WebSocket — using the
same `HttpClient` transport from `agent-client-protocol-http`.

## Layout

```
http-smoke-test/
├── Cargo.toml          # stand-alone crate; depends on the local SDK by path
├── src/
│   ├── server.rs       # spawns `goose serve` (HTTP+SSE + WS on /acp)
│   └── client.rs       # connects over HTTP+SSE and WS, runs initialize + session/new
├── run.sh              # one-command end-to-end smoke test
└── README.md
```

The project is **not** a member of the SDK Cargo workspace (it sets
`[workspace]` to an empty table) so you can build and run it without
touching the SDK's own workspace state.

## Layout assumption

This crate references the SDK and the Goose worktree by relative path:

```
~/Development/
├── acp/
│   └── rust-sdk/                           ← ACP Rust SDK (referenced from Cargo.toml)
├── goose-worktrees/
│   └── acp-http-from-sdk/                  ← Goose worktree with HTTP server
│       └── target/debug/goose              ← prebuilt goose binary
└── pocs/
    └── acp-http-smoke-test/                ← this crate
```

If your `goose` binary lives somewhere else, set `GOOSE_BIN`:

```bash
GOOSE_BIN=/path/to/goose ./run.sh
```

## Run it

One command:

```bash
./run.sh
```

That will:

1. `cargo build --bins` (compiles `server` and `client`)
2. start `./target/debug/server`, which spawns `goose serve --host 127.0.0.1 --port 3284`
3. wait for `GET /health` to come up
4. run `./target/debug/client` which:
   - opens a connection to `http://127.0.0.1:3284/acp` (HTTP + SSE)
     and runs `initialize` then `session/new`
   - opens a connection to `ws://127.0.0.1:3284/acp` (WebSocket)
     and runs the same exchange
5. tear down the server

Expected tail of output:

```
✅  HTTP+SSE exchange OK
✅  WebSocket exchange OK
🎉 Both transports succeeded.
```

## Env vars

| Var               | Default                                                              |
|-------------------|----------------------------------------------------------------------|
| `ACP_SMOKE_HOST`  | `127.0.0.1`                                                          |
| `ACP_SMOKE_PORT`  | `3284`                                                               |
| `GOOSE_BIN`       | `../../goose-worktrees/acp-http-from-sdk/target/debug/goose`         |
| `RUST_LOG`        | `info,agent_client_protocol_http=debug` (client), `info` (server)    |

## Running pieces separately

```bash
# terminal 1
cargo run --bin server

# terminal 2
cargo run --bin client
```

## Why `session/new` but no prompt?

`session/new` is enough to confirm POST + `Acp-Session-Id` round-trips, plus
the SSE / WS reply path. A `session/prompt` would require Goose to have an
LLM provider configured (`goose configure`); we keep the smoke test
provider-free on purpose so it works on any machine that can build goose.

If you do have a provider configured, it is trivial to extend `client.rs`
to also send a `PromptRequest`.
