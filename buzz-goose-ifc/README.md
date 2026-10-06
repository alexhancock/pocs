# buzz-goose-ifc

Runs the Buzz desktop app and its local relay against a goose build that supports the IFC (information flow control) hide directive, with Buzz's client-side IFC turned on.

| Repo | Branch | What it adds |
|------|--------|--------------|
| `aaif-goose/goose` | `buzz-goose-ifc` | goose honors `_meta.ifc = { hide, ref }` on permission responses and advertises `agentCapabilities._meta.goose.ifc.hideDirective` |
| `alexhancock/buzz` | `buzz-goose-ifc` | `buzz-acp` client-side IFC (allow / hide / block), plus `ifc-core` confidentiality and integrity labels. Off unless `BUZZ_ACP_IFC=1` |

## Run

```bash
./run.sh                    # build goose, then run `just dev` in buzz with IFC on
./run.sh --no-build-goose   # reuse the existing goose build
./run.sh -- <args>          # pass extra args through to `just dev`
```

You need what `just dev` in buzz needs: Docker for Postgres, Redis, and MinIO, plus a `.env` file. The script copies `.env` from `.env.example` if it's missing.

## How it works

1. Makes sure `GOOSE_DIR` (default `~/Development/goose-ifc-demo`) and `BUZZ_DIR` (default `~/Development/buzz`) are on the `buzz-goose-ifc` branch. It clones a repo if it's missing and only switches branches when the working tree is clean.
2. Builds `goose` with `cargo build -p goose-cli --bin goose`. Set `GOOSE_PROFILE=release` for a release build.
3. Puts `$GOOSE_DIR/target/<profile>` at the front of `PATH`. Buzz desktop looks up the bare `goose` command on `PATH` before it tries the login shell or `~/.local/bin`, so this build is used instead of any installed goose.
4. Exports `BUZZ_ACP_IFC=1`. `buzz-acp` inherits it when the desktop spawns it.
5. Runs `just dev` in buzz, which starts the relay and the Tauri app.

To check that it's working, create or start a local agent in the app that uses the **goose** runtime. Then confirm that confidential reads come back as placeholders and that public writes carrying confidential data get blocked.

## Demo setup

1. Register the demo MCP server with goose by adding this to `~/.config/goose/config.yaml` under `extensions:`:
   ```yaml
   ifcdemo:
     enabled: true
     type: stdio
     name: ifcdemo
     description: Fake data for the IFC demo
     cmd: python3
     args: [/Users/alexhancock/Development/pocs/buzz-goose-ifc/ifcdemo_mcp.py]
     envs: {}
     env_keys: []
     timeout: 300
     bundled: false
   ```
2. In Buzz, create a goose agent and set the env var `GOOSE_MODE=approve`. Buzz defaults goose to `auto`, which never sends permission requests, so IFC never sees the calls. Don't use `smart_approve` either, because it skips read-only tools like `read_secret`.
3. Watch these two places:
   - `tail -f ifcdemo-actions.log` shows what actually happened.
   - The agent log shows the decisions: `grep -rh "ifc " ~/Library/Application\ Support/xyz.block.buzz*/ 2>/dev/null`. You can also open the agent's log from the app.

Taint and refs are per session, so use a fresh channel or thread for each scenario.
