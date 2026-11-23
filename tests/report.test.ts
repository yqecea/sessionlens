import { describe, expect, it } from "vitest";
import { buildReport } from "../lib/report";
import type { SessionEvent } from "../lib/parsers/types";
import type { Anomaly } from "../lib/analyze";

function ev(over: Partial<SessionEvent>): SessionEvent {
  return {
    index: 0,
    kind: "assistant",
    line: 1,
    timestamp: null,
    model: "m",
    label: "turn",
    detail: "",
    toolName: null,
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    ...over,
  };
}

const events = [
  ev({ index: 3, label: "small", usage: { input: 100, output: 10, cacheRead: 0, cacheWrite: 0 } }),
  ev({ index: 7, label: "big", usage: { input: 50_000, output: 2_000, cacheRead: 0, cacheWrite: 0 } }),
];

const anomalies: Anomaly[] = [
  { type: "token-spike", eventIndex: 7, severity: "warn", message: "turn used 52,000 tokens, 5x the session median" },
];

describe("buildReport", () => {
  it("lists totals, anomalies, and largest turns deterministically", () => {
    const text = buildReport({
      sourceName: "claude-code.sample.jsonl",
      format: "claude-code",
      parseFailures: 0,
      events,
      anomalies,
      totalTokens: 52_110,
      totalCost: 0.42,
    });
    expect(text).toBe(
      [
        "sessionlens report",
        "source: claude-code.sample.jsonl",
        "format: claude-code | events: 2 | tokens: 52,110 | est. cost: $0.42 | parse failures: 0",
        "",
        "anomalies (1):",
        "- [warn] token-spike @ event 7: turn used 52,000 tokens, 5x the session median",
        "",
        "largest turns (top 2):",
        "- event 7: 52,000 tokens - big",
        "- event 3: 110 tokens - small",
        "",
      ].join("\n"),
    );
  });

  it("says none when there are no anomalies", () => {
    const text = buildReport({
      sourceName: "",
      format: "unknown",
      parseFailures: 2,
      events: [],
      anomalies: [],
      totalTokens: 0,
      totalCost: 0,
    });
    expect(text).toContain("source: unknown");
    expect(text).toContain("anomalies: none");
    expect(text).not.toContain("largest turns");
  });
});
