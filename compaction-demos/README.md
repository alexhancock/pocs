# goose-compaction demos

Three standalone demos validating `goose-compaction` as an external dependency.
Each demo is one file. All need an API key:

```bash
export OPENAI_API_KEY=sk-...
```

## 1. Core API (Rust)

Uses `summarize()` directly: conversation in, one summary message out.

```bash
cargo run --bin basic
```

`rust/basic.rs`

## 2. Python, via the generated goose-sdk bindings

Calls `provider.compact(...)` on the uniffi-generated Python module.

```bash
cd python && python3 demo.py
```

`python/demo.py`. The checked-out `goose.py` + `libgoose_sdk.dylib` here are
build artifacts, regenerate them with:

```bash
cd /Users/alexhancock/Development/goose
cargo build -p goose-sdk --features uniffi
./target/debug/goose-uniffi-bindgen generate \
  --library ./target/debug/libgoose_sdk.dylib \
  --config ./crates/goose-sdk/uniffi.toml \
  --language python --no-format \
  --out-dir ~/Desktop/compaction-demos/python
cp ./target/debug/libgoose_sdk.dylib ~/Desktop/compaction-demos/python/
```

## 3. Trait-based, custom data structure (Rust only)

`Transcript` implements `CompactionInput`, `SupportTicket` implements
`CompactionOutput`, so compaction reads from and writes back to the caller's own
types without either one knowing about goose's `Message`.

```bash
cargo run --bin traits
```

`rust/traits.rs`

## Note on toolchain

`rust-toolchain.toml` pins 1.96.1 to match the goose workspace. Without it,
rustup falls back to a default toolchain and the goose crates fail their
`rust-version` check.
