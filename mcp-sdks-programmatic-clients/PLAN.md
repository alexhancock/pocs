# Automatic Progressive Discovery & Programmatic Tool Calling for MCP SDKs

**Status:** Sketch / proof-of-concept
**Author:** Alex Hancock
**Date:** 2026-04-24

## 1. Motivation

The MCP [Client Best Practices](https://modelcontextprotocol.io/docs/develop/clients/client-best-practices.md)
document defines two scaling patterns that every serious MCP host eventually
has to implement:

1. **Progressive discovery** — don't stuff every tool definition into the
   model's context. Expose `search_tools` / `get_tool_details` meta-tools and
   load full schemas on demand. Extend to servers (`enable_server` /
   `disable_server`) for dynamic connection management.
2. **Programmatic tool calling (a.k.a. "code mode")** — let the model write
   a single sandboxed script that invokes many tools, instead of round-tripping
   every intermediate result through the model.

Both are well understood. Both are implemented and battle-tested in goose:

- Progressive discovery →
  `~/Development/goose/crates/goose/src/agents/extension_manager.rs`
  (`search_available_extensions`, catalog, cache invalidation on
  `list_changed`, per-tool resolution, etc.)
- Programmatic tool calling →
  `~/Development/goose/crates/goose/src/agents/platform_extensions/code_execution.rs`
  (uses the `pctx_code_mode` crate, Deno V8 sandbox, typed stub generation
  from tool `inputSchema` / `outputSchema`, broker-back tool dispatch).

**Why haven't the MCP SDKs shipped these patterns yet?** Maintenance burden.
Re-implementing a search index, schema-to-stub code generator, and a sandbox
in every language (TypeScript, Python, Go, Kotlin, C#, Swift, Java, Ruby…) is
a lot of surface area, and keeping the behavioral contract identical across
implementations is even harder.

## 2. Proposal

**Write it once in Rust. Bind it into every SDK.**

Each official SDK keeps its existing client interface (`client.listTools()`,
`client.callTool()` etc.). We ship an _augmentation package_ alongside each
SDK that decorates any compliant client and transparently enables both
patterns. The augmentation package is a thin, idiomatic wrapper over a
shared Rust core distributed as a prebuilt native addon.

```
                        ┌──────────────────────────────────────┐
                        │        mcp-client-core  (Rust)       │
                        │  • Tool catalog + BM25/embedding     │
                        │  • `search_tools` / `get_tool_details`│
                        │  • Server registry (enable/disable)  │
                        │  • Code-mode via pctx_code_mode      │
                        │  • Cache + list_changed invalidation │
                        │  • Transport-agnostic "Broker" trait │
                        └──────────────┬───────────────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
     NAPI-RS (Node)              PyO3 (Python)         UniFFI / CGo / JNI
              │                        │                        │
 ┌──────────────────────┐  ┌──────────────────────┐ ┌──────────────────────┐
 │ @mcp/client-augment  │  │ mcp-client-augment   │ │  (same story per SDK)│
 │ (TypeScript shim)    │  │ (Python shim)        │ │                      │
 └──────────────────────┘  └──────────────────────┘ └──────────────────────┘
              │                        │                        │
 ┌──────────────────────┐  ┌──────────────────────┐
 │ @modelcontextprotocol│  │ mcp (PyPI)           │
 │ /client  (unchanged) │  │ (unchanged)          │
 └──────────────────────┘  └──────────────────────┘
```

The core is written once; schemas, scoring, cache semantics, sandbox
security, and `list_changed` handling are all defined in one place. Each
language-specific shim does three jobs, and nothing else:

1. Accept the SDK's native `Client` object.
2. Translate between SDK native types (`Tool`, `CallToolResult`, …) and the
   core's JSON-RPC-shaped payloads (which match the MCP spec verbatim).
3. Re-export the same `listTools` / `callTool` surface so user code doesn't
   change.

## 3. Non-goals

- **Replacing the MCP SDKs.** The augmentation is always additive.
- **Changing the MCP wire protocol.** Everything here is client-side.
- **Hosting a new sandbox from scratch.** We reuse `pctx_code_mode` (and
  Deno / Monty / Wasmtime underneath) rather than inventing a sandbox.
- **Forcing opinions on retrieval.** Keyword (BM25) is the default; embedding
  and subagent retrieval are pluggable strategies the host can swap in.

## 4. Architecture

### 4.1 `mcp-client-core` (Rust)

Public surface (sketched in `crates/mcp-client-core/src/lib.rs`):

```rust
pub struct Broker { /* owns a set of McpConnections */ }

pub trait McpConnection: Send + Sync {
    async fn list_tools(&self) -> Result<Vec<Tool>>;
    async fn call_tool(&self, name: &str, args: Value) -> Result<CallToolResult>;
    fn subscribe_list_changed(&self) -> Receiver<ListChangedEvent>;
    // Optional lifecycle for dynamic servers:
    async fn connect(&self) -> Result<()>;
    async fn disconnect(&self) -> Result<()>;
}

pub struct ProgressiveDiscovery {
    /* tool catalog, BM25 index, per-server descriptions */
}
impl ProgressiveDiscovery {
    pub fn meta_tools(&self) -> Vec<Tool>;              // search_tools, get_tool_details,
                                                        // enable_server, disable_server
    pub async fn dispatch(&self, name: &str, args: Value) -> Result<CallToolResult>;
}

pub struct CodeMode { /* wraps pctx_code_mode::CodeMode */ }
impl CodeMode {
    pub fn meta_tools(&self) -> Vec<Tool>;              // list_functions, get_function_details,
                                                        // execute_typescript, execute_bash
    pub async fn dispatch(&self, name: &str, args: Value) -> Result<CallToolResult>;
}

pub struct Augmentation { /* composes both */ }
impl Augmentation {
    pub fn new(broker: Broker, config: AugmentationConfig) -> Self;
    /// Returns the *augmented* tool list the SDK should expose to the model.
    pub async fn list_tools(&self) -> Result<Vec<Tool>>;
    /// Route a call — either a meta-tool call, or a pass-through to the real server.
    pub async fn call_tool(&self, name: &str, args: Value) -> Result<CallToolResult>;
}
```

Key design properties:

- **Preserves prompt-cache stability.** Meta-tool names are stable and live
  at the top of the tools array; server-sourced definitions are appended
  after the cache breakpoint. We mirror goose's "append, don't re-sort"
  policy, which the best-practices doc explicitly calls out.
- **Threshold-driven activation.** `AugmentationConfig` carries the
  context-window threshold (default: 3% of an estimated budget). Below it,
  `list_tools()` just returns the pass-through list; above it, it returns
  the meta-tools instead. This matches the doc's guidance exactly.
- **`list_changed` re-indexes the catalog** automatically, same as goose.
- **Code mode is opt-in.** Disabled unless the host explicitly turns it on,
  because it requires a sandbox binary (Deno) on the host.

### 4.2 Bindings

| Language   | Binding tool           | Package name (proposed)                              |
| ---------- | ---------------------- | ---------------------------------------------------- |
| TypeScript | NAPI-RS                | `@modelcontextprotocol/client-augmentation`          |
| Python     | PyO3 + maturin         | `mcp-client-augmentation`                            |
| Go         | CGo + cbindgen         | `github.com/modelcontextprotocol/go-sdk/augmentation`|
| Kotlin/JVM | UniFFI + JNI           | `io.modelcontextprotocol:client-augmentation`        |
| Swift      | UniFFI                 | `MCPClientAugmentation` (SwiftPM)                    |
| C#         | UniFFI + P/Invoke      | `ModelContextProtocol.Client.Augmentation`           |
| Ruby       | magnus / rb-sys        | `mcp-client-augmentation`                            |

All bindings expose the same shape, roughly:

```ts
interface ClientAugmentation {
  attach(client: Client): AugmentedClient; // wraps listTools/callTool
  detach(): void;
}
```

For most SDKs the native addon ships prebuilt per-platform; consumers don't
need a Rust toolchain. NAPI-RS, PyO3 wheels via `cibuildwheel`, and UniFFI
all have well-trodden release paths.

### 4.3 Transparent integration

The TypeScript example in `example/` shows the exact user-facing shape:

```ts
import { Client } from '@modelcontextprotocol/client';
import { augment } from '@modelcontextprotocol/client-augmentation';

const client = new Client(/* ... */);
await client.connect(transport);

const augmented = augment(client, {
  progressiveDiscovery: { strategy: 'bm25', contextPctThreshold: 0.03 },
  codeMode: { enabled: true, sandbox: 'deno' },
});

// Nothing else changes. listTools() now returns meta-tools once the threshold
// is crossed; callTool() transparently handles meta-tool dispatch.
const { tools } = await augmented.listTools();
const result = await augmented.callTool({ name: 'search_tools', arguments: { query: 'logs' } });
```

If a host chooses not to augment, `new Client(...)` still works as before.

## 5. Implementation Plan

### Phase 1 — Progressive Discovery MVP ✅

Shipped in this repo. End-to-end demo at
`typescript-sdk/examples/augmentation-demo/` runs against an in-process
MCP server and exercises the full data path.

- [x] `mcp-client-core` Rust crate with `Augmentation`, `Broker`,
      `McpConnection` trait, and typed MCP wire types.
- [x] BM25-backed tool catalog (`bm25` crate) with cache invalidation on
      `notifications/tools/list_changed`.
- [x] `search_tools` and `get_tool_details` meta-tools, plus a 1–5%
      context-budget threshold that auto-switches the `listTools()`
      response between pass-through and discovery mode.
- [x] Append-only tool ordering to preserve provider prompt caches.
- [x] `mcp-client-node` NAPI-RS 3 binding with
      `ThreadsafeFunction<String, Promise<String>>` — the whole FFI is
      two callbacks that take a JSON string and return `Promise<string>`.
- [x] `@modelcontextprotocol/client-augmentation` TypeScript shim
      exposing a single `augment(client, options)` function that returns
      an object with the same `listTools` / `callTool` shape as the
      SDK's `Client`.
- [x] Unit tests for BM25 ranking + cache invalidation; end-to-end demo
      exercising the Rust → JS → SDK → in-memory server round trip.

### Phase 2 — Code Mode ✅

- [x] `pctx_code_mode` wired through `mcp-client-core` behind a
      `code-mode` Cargo feature, matching goose's
      [`code_execution.rs`](https://github.com/block/goose/blob/main/crates/goose/src/agents/platform_extensions/code_execution.rs)
      shape.
- [x] `list_functions`, `get_function_details`, `execute_typescript`,
      and (optionally) `execute_bash` meta-tools.
- [x] Broker-backed sandbox dispatch: calls from model-authored
      TypeScript route through the same `Broker::call_tool` path that
      regular tool calls take, so auth / retries / streaming all come
      from the underlying SDK for free.
- [x] `!Send` Deno runtime handled via `spawn_blocking` with a
      per-execution current-thread runtime, avoiding any cross-thread
      V8 assumptions.
- [ ] Expose the `code-mode` feature through the NAPI binding so JS
      hosts get `execute_typescript` end-to-end. The Rust side is done;
      this is a one-feature-flag rebuild plus some constructor config.

### Phase 3 — Distribution

- CI matrix building `mcp-client-node` for the five tier-1 targets
  (`darwin-arm64`, `darwin-x64`, `linux-arm64`, `linux-x64`,
  `win32-x64`) using `@napi-rs/cli`'s standard cross-compilation flow.
- `optionalDependencies` layout so npm users download only their
  platform's prebuilt binary.
- Publish `@modelcontextprotocol/client-augmentation` (the shim) and
  `@modelcontextprotocol/client-augmentation-native` (the addon) to
  npm, both pinned to the same version as the core.
- Per-call authorization hook — an optional callback the host can
  register to review tool calls before they dispatch, mirroring goose's
  `ToolCallContext`. Especially relevant once `execute_typescript` is
  exposed to JS.

### Phase 4 — Second Language

- Python binding (`mcp-client-augmentation-py`) via PyO3 / maturin,
  proving the "bind once, use everywhere" thesis.
- Published on PyPI with prebuilt wheels on the same targets as npm.
- Identical public API (`augment(client, options)`) against the
  official Python SDK's `Client`.

### Phase 5 — Additional Retrieval Strategies & Dynamic Servers

- `DiscoveryStrategy` trait with a second impl backing embedding-based
  retrieval (keeping BM25 as the default for hosts without an embedder).
- Dynamic `enable_server` / `disable_server` meta-tools — definitions
  already exist behind a config flag, the remaining work is the SDK-side
  connection lifecycle hook.
- Provider-native tool search integration (OpenAI, Anthropic) as an
  additional strategy for hosts that'd rather let the provider handle
  retrieval than ship our index.

## 6. Why this shape

- **One source of truth.** BM25 scoring, cache invalidation, code-mode
  security, prompt-cache preservation — these are all easy to get subtly
  wrong. Doing them once in Rust and binding down means we don't drift.
- **Each SDK stays idiomatic.** The shim is pure glue. SDK maintainers
  don't have to become sandbox / search-index experts to ship the pattern.
- **Leverages existing production code.** We lift two pieces of goose that
  already ship to real users: the extension manager's catalog mechanics
  and the `pctx_code_mode`-backed executor. Neither needs a rewrite — they
  need extraction into a reusable crate.
- **Opt-in, additive, non-breaking.** Users who don't want this pay zero.

## 7. Open questions

- **Prebuilt binary distribution policy** for the MCP org. NAPI-RS +
  `@napi-rs/cli` is the smoothest path for Node; we'd need the equivalent
  decision for Python (cibuildwheel), Go (CGo + platform matrix), etc.
- **Sandbox packaging.** Deno can be bundled or discovered from `PATH`.
  We'll want a consistent story per language.
- **Upstreaming.** Is this a standalone MCP-org repo (analog to the
  per-language SDKs), or does each SDK vendor its own augmentation
  package? The former scales better; the latter is simpler to get started.
- **Extraction from goose.** `pctx_code_mode` is already an external
  crate (`~0.3.0`). The catalog / search / `list_changed` logic we want to
  lift from `extension_manager.rs` is more entangled with goose internals
  and needs clean extraction.

## 8. References

- Best-practices doc:
  https://modelcontextprotocol.io/docs/develop/clients/client-best-practices.md
- goose progressive discovery:
  `~/Development/goose/crates/goose/src/agents/extension_manager.rs`
- goose code mode:
  `~/Development/goose/crates/goose/src/agents/platform_extensions/code_execution.rs`
- `pctx_code_mode` crate: https://github.com/portofcontext/pctx
- MCP TypeScript SDK (vendored here for the example):
  `typescript-sdk/`
