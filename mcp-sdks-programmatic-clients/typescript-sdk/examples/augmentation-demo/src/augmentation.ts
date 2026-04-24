// @modelcontextprotocol/client-augmentation — TypeScript shim
//
// Wraps the Rust-backed augmentation core (via the NAPI addon
// `@modelcontextprotocol/client-augmentation-native`) into an idiomatic
// TypeScript API that decorates the SDK's native `Client`.
//
// The shim's three jobs:
//
//   1. Adapt SDK-native `Client.listTools()` / `Client.callTool()` into
//      the two JSON-in-JSON-out callbacks the Rust core expects.
//   2. Translate SDK-native types (`Tool`, `CallToolResult`) to/from the
//      JSON payloads that cross the FFI boundary.
//   3. Preserve the `listTools` / `callTool` shape of the SDK so that
//      host code that consumed the stock SDK works unmodified against
//      the augmented client.
//
// Importantly: **this file doesn't care how the core works**. It only
// knows how to route JSON back and forth. BM25 search, threshold-driven
// discovery activation, list-changed invalidation, and (when enabled)
// code-mode execution all live on the Rust side.

import type { Client } from '@modelcontextprotocol/client';
import type {
    CallToolRequest,
    CallToolResult,
    ListToolsRequest,
    ListToolsResult,
    Tool
} from '@modelcontextprotocol/client';

// The native addon is a peer package in the workspace. We reach into its
// built artifacts directly here; the real published shim would just
// `import { JsAugmentation } from '@modelcontextprotocol/client-augmentation-native'`.
import { JsAugmentation } from '@modelcontextprotocol/client-augmentation-native';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface AugmentOptions {
    /**
     * Logical name for the underlying SDK client. Used as the "server"
     * prefix in qualified tool names (e.g. `primary/echo`). Defaults to
     * `"primary"`.
     */
    serverName?: string;

    progressiveDiscovery?: {
        /**
         * Fraction of the model's context window that tool definitions
         * are allowed to occupy before we switch to meta-tools. Default
         * 0.03, matching the MCP best-practices doc's 1–5% range.
         */
        contextPctThreshold?: number;
        contextBudgetBytes?: number;
        searchLimit?: number;
        /**
         * Expose `enable_server` / `disable_server` meta-tools. Requires
         * host-side handling (the core emits the tool definitions; your
         * app wires the actual connect/disconnect).
         */
        dynamicServers?: boolean;
    };

    codeMode?: {
        /**
         * Requires the native addon to have been built with the
         * `code-mode` Cargo feature.
         */
        enabled?: boolean;
        outputLimitBytes?: number;
        exposeBash?: boolean;
    };
}

/**
 * Wrap an existing SDK `Client` with automatic progressive discovery and
 * (optionally) programmatic tool calling. The returned object preserves
 * the SDK's `listTools` / `callTool` surface so a host can drop it in
 * anywhere the stock SDK was used.
 *
 * ```ts
 * const client = new Client({ name: 'demo', version: '0.0.1' });
 * await client.connect(transport);
 *
 * const agent = augment(client, {
 *   progressiveDiscovery: { contextPctThreshold: 0.03 },
 *   codeMode: { enabled: true },
 * });
 *
 * const { tools } = await agent.listTools();   // meta-tools above threshold
 * const hit = await agent.callTool({ name: 'search_tools', arguments: { query: 'logs' } });
 * ```
 *
 * Remove the `augment(...)` line and you're back to the stock SDK —
 * nothing else in host code needs to know the augmentation exists.
 */
export function augment(client: Client, options: AugmentOptions = {}): AugmentedClient {
    const serverName = options.serverName ?? 'primary';

    // Callback #1: Rust asks us to list tools. The payload carries the
    // server name so a single callback can multiplex across many
    // connections when/if we support that.
    const listToolsCb = async (_payload: string): Promise<string> => {
        const result = await collectAllToolPages(client);
        return JSON.stringify(result.tools);
    };

    // Callback #2: Rust asks us to dispatch a tool call.
    const callToolCb = async (payload: string): Promise<string> => {
        const parsed = JSON.parse(payload) as {
            server: string;
            name: string;
            arguments?: unknown;
        };
        const result = await client.callTool({
            name: parsed.name,
            arguments: parsed.arguments as CallToolRequest['params']['arguments']
        });
        return JSON.stringify(result);
    };

    const native = new JsAugmentation(
        [serverName],
        listToolsCb,
        callToolCb,
        {
            discovery: options.progressiveDiscovery,
            codeMode: options.codeMode
        }
    );

    // NOTE on `list_changed`: in SDK v2 the `Client` accepts
    // `listChanged.tools.onChanged` in its constructor options. Hosts
    // that care about live catalog updates should wire that themselves
    // and call `augmented.refresh()` from the handler:
    //
    // ```ts
    // const client = new Client(info, {
    //   listChanged: { tools: { onChanged: () => agent.refresh() } }
    // });
    // ```
    //
    // We don't install anything here because doing so would clobber the
    // host's own configuration on `client`.
    return new AugmentedClient(client, native);
}

/**
 * The user-facing wrapper. Exposes the subset of `Client` that models
 * interact with, plus escape hatches for host-only operations.
 */
export class AugmentedClient {
    constructor(
        /** Underlying SDK client. Use it for `connect`, `close`, etc. */
        public readonly inner: Client,
        private readonly native: JsAugmentation
    ) {}

    /**
     * Drop-in replacement for {@link Client.listTools}. Returns the
     * pass-through tool list (below the configured context threshold) or
     * the meta-tools (`search_tools`, `get_tool_details`, …) once the
     * threshold is crossed.
     *
     * Pagination is flattened by the shim; the Rust core always operates
     * on the full materialized list.
     */
    async listTools(_params?: ListToolsRequest['params']): Promise<ListToolsResult> {
        const raw = await this.native.listTools();
        const tools = JSON.parse(raw) as Tool[];
        return { tools };
    }

    /**
     * Drop-in replacement for {@link Client.callTool}. Intercepts
     * meta-tool names and forwards everything else to the SDK client.
     */
    async callTool(params: CallToolRequest['params']): Promise<CallToolResult> {
        const argsJson = params.arguments ? JSON.stringify(params.arguments) : null;
        const raw = await this.native.callTool(params.name, argsJson);
        return JSON.parse(raw) as CallToolResult;
    }

    /** Force a refresh of the tool catalog. */
    async refresh(): Promise<void> {
        await this.native.onListChanged();
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function collectAllToolPages(client: Client): Promise<ListToolsResult> {
    const all: Tool[] = [];
    let cursor: string | undefined;
    do {
        const { tools, nextCursor } = await client.listTools({ cursor });
        all.push(...tools);
        cursor = nextCursor;
    } while (cursor);
    return { tools: all };
}
