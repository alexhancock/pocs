/**
 * A small, pragmatic Agent Client Protocol (ACP) dialect used between the two
 * goose subprocesses and the enclave mediator.
 *
 * Why we roll our own rather than pull in a heavyweight lib:
 *   - The whiteboard session explicitly called out that "neither the missing
 *     MCP tools nor the agent-to-agent communication protocol has industry
 *     consensus". So we pick the minimum viable envelope.
 *   - Every wire message is a JSON object with a single 'kind' discriminator.
 *   - The enclave is the *only* thing that can publish to UI observers — agents
 *     talk to each other only *through* the enclave, which is what makes the
 *     Trusted Execution Environment metaphor meaningful.
 *
 * Envelope spec (text-framed JSON lines, \n-delimited):
 *
 *   { "kind": "hello",   "agent": "me.lucky", "version": "acp/0.1" }
 *   { "kind": "say",     "to": "vendor.huckberry", "content": "..." }
 *   { "kind": "card",    "card": { DisclosureCard } }
 *   { "kind": "reveal",  "to": "...", "payload": {...}, "under_card": "..." }
 *   { "kind": "thought", "content": "..." }            // private to the agent
 *   { "kind": "propose.outcome", "summary": "...", "artifacts": {...} }
 *   { "kind": "ack",     "ref": "card-id-or-message-id" }
 *   { "kind": "bye" }
 *
 * The enclave re-broadcasts these (after filtering) to the other agent and
 * to the observer channel that the UI renders.
 */

import type { DisclosureCard } from "./types.js";

export type AcpMessage =
  | { kind: "hello"; agent: string; version: string }
  | { kind: "say"; to: string; content: string }
  | { kind: "card"; card: DisclosureCard }
  | { kind: "reveal"; to: string; payload: Record<string, unknown>; under_card: string }
  | { kind: "thought"; content: string }
  | { kind: "propose.outcome"; summary: string; artifacts: Record<string, unknown> }
  | { kind: "ack"; ref: string }
  | { kind: "bye" };

export function encode(msg: AcpMessage): string {
  return JSON.stringify(msg) + "\n";
}

/** Parse a \n-delimited stream chunk into messages, returning any unparsed tail. */
export function decode(
  buffer: string,
): { messages: AcpMessage[]; rest: string } {
  const messages: AcpMessage[] = [];
  const parts = buffer.split("\n");
  const rest = parts.pop() ?? "";
  for (const line of parts) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      messages.push(JSON.parse(trimmed));
    } catch {
      // tolerate non-JSON lines (e.g. goose banner noise) — ignored.
    }
  }
  return { messages, rest };
}
