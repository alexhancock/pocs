"""Demo 2: the same compaction, in Python, against the generated goose-sdk bindings.

Run: OPENAI_API_KEY=sk-... python3 demo.py
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import goose

CONVERSATION = [
    (goose.MessageRole.USER, "I'm debugging a memory leak in our Rust web service."),
    (goose.MessageRole.ASSISTANT, "Let's start by checking where allocations grow. Do you have heap profiles?"),
    (goose.MessageRole.USER, "Yes, jemalloc profiles show growth in the request handler."),
    (goose.MessageRole.ASSISTANT, "That often means a cache without eviction. Check any HashMap that only inserts."),
    (goose.MessageRole.USER, "Found it - a session HashMap in AppState that never removes entries."),
    (goose.MessageRole.ASSISTANT, "Replace it with an LRU cache with a bounded capacity, or add a TTL sweep task."),
    (goose.MessageRole.USER, "I used an LruCache with capacity 10_000 and the leak stopped."),
    (goose.MessageRole.ASSISTANT, "Great. Add a metric for cache size so regressions are visible."),
]


async def main() -> int:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("set OPENAI_API_KEY to run this demo")
        return 1

    provider = goose.openai_provider(api_key)

    messages = [goose.CompactionMessage(role=role, text=text) for role, text in CONVERSATION]
    print(f"compacting {len(messages)} messages...\n")

    summary = await provider.compact("gpt-4o-mini", messages, None)

    print(f"--- summary ---\n{summary.text}\n")
    print(f"tokens: input={summary.input_tokens} output={summary.output_tokens}")

    defaults = goose.default_compaction_templates()
    print(f"\ndefault compaction prompt is {len(defaults.compaction)} chars")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
