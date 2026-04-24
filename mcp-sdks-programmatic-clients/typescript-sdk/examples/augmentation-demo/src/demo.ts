// End-to-end demo of `augment(client)`.
//
// Everything runs in-process: an `McpServer` with a handful of tools is
// linked to a `Client` via `InMemoryTransport`, then the client is
// wrapped with `augment(...)` from our shim. We exercise three cases:
//
//   1. Below the context-threshold → `listTools()` passes through.
//   2. Above the threshold → `listTools()` returns meta-tools only.
//   3. Calling `search_tools` and `get_tool_details` flows through the
//      Rust core's BM25 index, and a plain tool call passes through to
//      the server.

import { Client } from '@modelcontextprotocol/client';
import { McpServer } from '@modelcontextprotocol/server';
// The in-memory transport lives in the internal barrel; using it keeps the
// demo self-contained (no subprocess, no network).
import { InMemoryTransport } from '@modelcontextprotocol/core';
import { z } from 'zod';

import { augment } from './augmentation.js';

async function buildServer(): Promise<McpServer> {
    const server = new McpServer({ name: 'demo-server', version: '0.0.1' });

    // A handful of realistic-looking tools so BM25 has something to rank.
    server.registerTool(
        'read_file',
        {
            description: 'Read the contents of a file on disk',
            inputSchema: z.object({ path: z.string() })
        },
        async ({ path }) => ({ content: [{ type: 'text', text: `contents of ${path}` }] })
    );
    server.registerTool(
        'write_file',
        {
            description: 'Write bytes to a file',
            inputSchema: z.object({ path: z.string(), data: z.string() })
        },
        async ({ path }) => ({ content: [{ type: 'text', text: `wrote ${path}` }] })
    );
    server.registerTool(
        'list_dir',
        {
            description: 'List entries in a directory',
            inputSchema: z.object({ path: z.string() })
        },
        async () => ({ content: [{ type: 'text', text: 'a.txt\nb.txt\n' }] })
    );
    server.registerTool(
        'echo',
        {
            description: 'Echo a message back to the caller',
            inputSchema: z.object({ message: z.string() })
        },
        async ({ message }) => ({ content: [{ type: 'text', text: message }] })
    );
    server.registerTool(
        'grep_logs',
        {
            description: 'Search server logs for a regex',
            inputSchema: z.object({ pattern: z.string() })
        },
        async ({ pattern }) => ({ content: [{ type: 'text', text: `matches for /${pattern}/: …` }] })
    );
    return server;
}

async function main() {
    const server = await buildServer();
    const client = new Client({ name: 'demo-client', version: '0.0.1' });

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    // --- Case 1: small catalog, below threshold. Passes through. -----------

    const pass = augment(client, {
        progressiveDiscovery: {
            contextPctThreshold: 0.5, // generous, so our 5 tools stay under
            contextBudgetBytes: 200 * 1024
        }
    });

    {
        const { tools } = await pass.listTools();
        console.log(`\n[pass-through] ${tools.length} tools:`);
        for (const t of tools) {
            console.log(`  • ${t.name} — ${t.description ?? ''}`);
        }
    }

    // --- Case 2: force discovery mode with a very aggressive threshold. ----

    const discover = augment(client, {
        progressiveDiscovery: {
            // Tiny budget → any real catalog crosses the line, forcing
            // meta-tools to be exposed instead of the raw list.
            contextBudgetBytes: 32,
            contextPctThreshold: 0.1,
            searchLimit: 3
        }
    });

    {
        const { tools } = await discover.listTools();
        console.log(`\n[discovery] ${tools.length} meta-tools exposed:`);
        for (const t of tools) {
            console.log(`  • ${t.name} — ${t.description ?? ''}`);
        }
    }

    // --- Case 3: meta-tool dispatch + pass-through tool call. --------------

    const search = await discover.callTool({
        name: 'search_tools',
        arguments: { query: 'file disk' }
    });
    console.log('\n[discovery] search_tools("file disk"):');
    console.log(JSON.stringify(search.structuredContent ?? search.content, null, 2));

    const details = await discover.callTool({
        name: 'get_tool_details',
        arguments: { name: 'primary/read_file' }
    });
    console.log('\n[discovery] get_tool_details("primary/read_file"):');
    console.log(JSON.stringify(details.structuredContent ?? details.content, null, 2));

    const echo = await discover.callTool({
        name: 'primary/echo',
        arguments: { message: 'hello augmented world' }
    });
    console.log('\n[discovery] real tool call — echo:');
    console.log(JSON.stringify(echo.content, null, 2));

    await pass.inner.close();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
