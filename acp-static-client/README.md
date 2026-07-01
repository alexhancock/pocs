# ACP Static Client

A **single static HTML file** that speaks the
[Agent Client Protocol](https://github.com/agentclientprotocol/typescript-sdk)
directly to a **remote `goose serve`** over a WebSocket.

No node server. No stdio bridge. No build step. No backend of any kind — the
ACP SDK is pulled from a CDN as native ESM via an [import map], and the browser
opens the WebSocket to your remote goose itself.

It's the minimal sibling of [`../acp-web-client`](../acp-web-client): same Swiss
design language, but stripped down to the one transport that needs no local
process — `http/ws` straight to `goose serve`.

[import map]: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap

## Architecture

```
browser (index.html)  ──ws──►  ws://your-host:3284/acp   (remote `goose serve`)
        │
        └── ACP SDK loaded from https://esm.sh (import map, no bundler)
```

One file: `index.html`. It contains the markup, the Swiss styles, and a small
vanilla-JS module that drives the ACP session flow:

```
initialize → session/new → prompt → stream updates → typewriter render
```

## Run the remote goose

On the host you want the agent to run on:

```bash
goose serve --host 0.0.0.0 --port 3284
```

Notes:

- `--host 0.0.0.0` (not `127.0.0.1`) so the endpoint is reachable from your
  machine. The ACP endpoint is `ws://<host>:3284/acp`.
- If `goose serve` is started with `GOOSE_SERVER__SECRET_KEY` set, it requires
  auth and the browser handshake will be rejected. For an open demo, start it
  without that variable.
- The agent's working directory (cwd) is a directory on the **remote** host.
  ACP's `session/new` requires an **absolute** path — goose rejects a relative
  one (`.`) or `~` with `cwd must be an absolute path`. The app defaults to `/`
  and lets you override it (see below).

## Serve the page

Because it's a plain static file, any static server works. From this directory:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

or

```bash
npx serve .
```

You can even open `index.html` directly with `file://`, though serving over
`http://` is recommended so the import map and CDN fetches behave consistently.

> Loading the SDK from esm.sh requires internet access on the machine running
> the browser.

## Point it at your remote goose

In the page, type the remote ACP WebSocket URL into the **remote** field and hit
**connect** (e.g. `ws://10.0.0.5:3284/acp`). The value is remembered in
`localStorage`.

You can also preset it via a query param:

```
http://localhost:8000/?url=ws%3A%2F%2F10.0.0.5%3A3284%2Facp
```

Default: `ws://127.0.0.1:3284/acp`.

### Working directory (cwd)

The agent runs on the remote host, so its working directory is a path on **that**
machine and must be **absolute**. It defaults to `/`; override it with a `?cwd=`
query param (remembered in `localStorage`):

```
http://localhost:8000/?cwd=%2FUsers%2Fyou%2Fproject
```

## Notes on the browser transport

Two things are needed to drive `goose serve` from a buildless browser page with
the ACP SDK:

- **`WebSocket` option.** The SDK's `createWebSocketStream` targets both Node's
  `ws` and the browser, and internally constructs the socket as
  `new WebSocket(url, protocols, { headers })`. That third `headers` argument is
  a `ws`-library extension; the native browser `WebSocket` only takes
  `(url, protocols)` and *fails the connection* when handed a third argument —
  which surfaces as a bare `error` event and a misleading "WebSocket could not
  open", even when the endpoint is perfectly reachable. The page passes a tiny
  `BrowserWebSocket` wrapper (via the SDK's `WebSocket` option) that drops the
  extra argument.
- **`cookies: "omit"`.** The SDK defaults to `cookies: "include"`, which tries to
  set a `Cookie` request header — something browsers forbid on WebSockets (and
  manage themselves). Omitting it avoids the header path entirely.

## Design

Swiss / international typographic style, shared with the original client:
white field, ink `#111111`, a single red accent `#E5322D`, serif display type
(Newsreader), mono labels (IBM Plex Mono), and the thin-stroke "remote emitting
a signal" line mark whose arcs go red when a session is live.

## What was dropped for minimalism

Compared to `acp-web-client`:

- the **stdio** transport and its node bridge (needs a local process)
- the **transport toggle** (only one transport here)
- the verbose **log panel** (errors surface inline instead)
- React and the whole build toolchain — it's one buildless file
