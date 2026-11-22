import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseSession } from "../lib/parsers";
import { usageTotal } from "../lib/parsers/types";

function sample(name: string): string {
  return readFileSync(join(__dirname, "..", "public", "samples", name), "utf8");
}

describe("claude-code parser", () => {
  const result = parseSession(sample("claude-code.sample.jsonl"));

  it("detects the claude-code format", () => {
    expect(result.format).toBe("claude-code");
  });

  it("skips malformed lines and counts them", () => {
    expect(result.parseFailures).toBe(1);
    expect(result.skippedLines).toBe(1);
  });

  it("emits an event per recognizable line", () => {
    expect(result.events.length).toBe(21);
  });

  it("sums token usage across assistant turns", () => {
    const usage = result.events
      .map((e) => e.usage)
      .filter((u): u is NonNullable<typeof u> => u !== null);
    const sum = usage.reduce(
      (acc, u) => ({
        input: acc.input + u.input,
        output: acc.output + u.output,
        cacheRead: acc.cacheRead + u.cacheRead,
        cacheWrite: acc.cacheWrite + u.cacheWrite,
      }),
      { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    );
    expect(sum).toEqual({
      input: 48522,
      output: 3920,
      cacheRead: 293900,
      cacheWrite: 6000,
    });
    expect(result.events.reduce((s, e) => s + usageTotal(e.usage), 0)).toBe(
      352342,
    );
  });

  it("keeps model names and tool names on events", () => {
    expect(result.events.some((e) => e.model === "claude-opus-4-5")).toBe(true);
    expect(
      result.events.filter((e) => e.kind === "tool" && e.toolName === "Bash")
        .length,
    ).toBeGreaterThanOrEqual(3);
  });

  it("marks tool errors as error events", () => {
    expect(result.events.some((e) => e.kind === "error")).toBe(true);
  });
});

describe("tolerant parsing", () => {
  it("recovers events around bad JSON lines", () => {
    const text = [
      '{"type":"user","message":{"role":"user","content":"hi"}}',
      "garbage {",
      '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"ok"}],"usage":{"input_tokens":10,"output_tokens":5}}}',
      "also not json",
    ].join("\n");
    const r = parseSession(text);
    expect(r.parseFailures).toBe(2);
    expect(r.events.length).toBe(2);
    expect(r.events[1].usage?.output).toBe(5);
  });

  it("never throws on empty or binary-ish input", () => {
    expect(() => parseSession("")).not.toThrow();
    expect(parseSession("").events).toHaveLength(0);
    expect(() => parseSession("\u0000\u0001\u0002")).not.toThrow();
  });
});

describe("codex parser", () => {
  const result = parseSession(sample("codex.sample.jsonl"));

  it("detects the codex format", () => {
    expect(result.format).toBe("codex");
  });

  it("parses messages, tool calls, token counts and errors", () => {
    expect(result.parseFailures).toBe(1);
    expect(result.events.filter((e) => e.kind === "user")).toHaveLength(1);
    expect(
      result.events.filter((e) => e.kind === "tool" && e.toolName === "shell"),
    ).toHaveLength(3);
    expect(result.events.filter((e) => e.kind === "error")).toHaveLength(1);
    const usageEvents = result.events.filter((e) => e.usage !== null);
    expect(usageEvents.length).toBeGreaterThanOrEqual(2);
    const cached = usageEvents.reduce((s, e) => s + (e.usage?.cacheRead ?? 0), 0);
    expect(cached).toBe(23000);
  });
});

describe("hermes parser", () => {
  const result = parseSession(sample("hermes.sample.jsonl"));

  it("detects the hermes format", () => {
    expect(result.format).toBe("hermes");
  });

  it("maps llm_call usage via prompt_tokens aliases", () => {
    const calls = result.events.filter((e) => e.usage !== null);
    expect(calls).toHaveLength(2);
    expect(calls[0].usage?.input).toBe(4200);
    expect(calls[0].usage?.output).toBe(260);
  });

  it("flags tool errors and top level errors", () => {
    expect(result.events.filter((e) => e.kind === "error")).toHaveLength(2);
  });
});
