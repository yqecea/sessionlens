import { describe, expect, it } from "vitest";
import { analyzeSession } from "../lib/analyze";
import { parseSession } from "../lib/parsers";
import type { SessionEvent } from "../lib/parsers";

let seq = 0;
function event(partial: Partial<SessionEvent>): SessionEvent {
  return {
    index: seq++,
    kind: "assistant",
    line: seq,
    timestamp: null,
    model: "claude-sonnet-4-5",
    label: "e",
    detail: "",
    toolName: null,
    usage: null,
    ...partial,
  };
}

describe("analyzeSession", () => {
  it("flags three identical consecutive tool calls as a retry loop", () => {
    const events = [
      event({ kind: "tool", toolName: "Bash" }),
      event({ kind: "tool", toolName: "Bash" }),
      event({ kind: "tool", toolName: "Bash" }),
    ];
    const flags = analyzeSession(events);
    expect(flags.some((f) => f.type === "retry-loop")).toBe(true);
  });

  it("does not flag two identical tool calls", () => {
    const events = [
      event({ kind: "tool", toolName: "Bash" }),
      event({ kind: "tool", toolName: "Bash" }),
    ];
    expect(analyzeSession(events)).toHaveLength(0);
  });

  it("flags a turn far above the median as a token spike", () => {
    const small = { input: 100, output: 50, cacheRead: 0, cacheWrite: 0 };
    const events = [
      event({ usage: small }),
      event({ usage: small }),
      event({ usage: small }),
      event({ usage: { input: 100_000, output: 5_000, cacheRead: 0, cacheWrite: 0 } }),
    ];
    const flags = analyzeSession(events);
    expect(flags.filter((f) => f.type === "token-spike")).toHaveLength(1);
  });

  it("flags a cold-cache turn after cache warm-up", () => {
    const events = [
      event({ usage: { input: 10, output: 10, cacheRead: 0, cacheWrite: 5000 } }),
      event({ usage: { input: 10, output: 10, cacheRead: 4000, cacheWrite: 0 } }),
      event({ usage: { input: 9000, output: 10, cacheRead: 0, cacheWrite: 0 } }),
    ];
    const flags = analyzeSession(events);
    expect(flags.some((f) => f.type === "cache-miss")).toBe(true);
    expect(flags.find((f) => f.type === "cache-miss")?.eventIndex).toBe(
      events[2].index,
    );
  });

  it("flags context window pressure with severity by ratio", () => {
    const warn = event({
      usage: { input: 150_000, output: 0, cacheRead: 0, cacheWrite: 0 },
    });
    const flags = analyzeSession([warn]);
    const pressure = flags.find((f) => f.type === "context-pressure");
    expect(pressure).toBeDefined();
    expect(pressure?.severity).toBe("warn");
  });

  it("fires the documented anomalies on the claude sample", () => {
    const r = parseSession(
      require("node:fs").readFileSync(
        require("node:path").join(
          __dirname,
          "..",
          "public",
          "samples",
          "claude-code.sample.jsonl",
        ),
        "utf8",
      ),
    );
    const types = new Set(analyzeSession(r.events).map((a) => a.type));
    expect(types.has("retry-loop")).toBe(true);
    expect(types.has("token-spike")).toBe(true);
    expect(types.has("cache-miss")).toBe(true);
    expect(types.has("context-pressure")).toBe(true);
  });
});
