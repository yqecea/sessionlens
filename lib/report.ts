import type { Anomaly } from "./analyze";
import { fmtInt, fmtUSD } from "./format";
import { usageTotal } from "./parsers/types";
import type { SessionEvent } from "./parsers/types";

export interface ReportInput {
  sourceName: string;
  format: string;
  parseFailures: number;
  events: SessionEvent[];
  anomalies: Anomaly[];
  totalTokens: number;
  totalCost: number;
  /** How many of the largest assistant turns to list. */
  topTurns?: number;
}

/**
 * A plain-text summary of a parsed session for pasting into an issue or a
 * chat. Deterministic and dependency-free so unit tests can pin it.
 */
export function buildReport(input: ReportInput): string {
  const top = input.topTurns ?? 5;
  const lines: string[] = [
    "sessionlens report",
    `source: ${input.sourceName || "unknown"}`,
    `format: ${input.format} | events: ${fmtInt(input.events.length)} | tokens: ${fmtInt(input.totalTokens)} | est. cost: ${fmtUSD(input.totalCost)} | parse failures: ${fmtInt(input.parseFailures)}`,
    "",
  ];

  if (input.anomalies.length === 0) {
    lines.push("anomalies: none");
  } else {
    lines.push(`anomalies (${input.anomalies.length}):`);
    for (const a of input.anomalies) {
      lines.push(`- [${a.severity}] ${a.type} @ event ${a.eventIndex}: ${a.message}`);
    }
  }

  const biggest = input.events
    .filter((e) => e.kind === "assistant" && e.usage)
    .map((e) => ({ index: e.index, label: e.label, total: usageTotal(e.usage) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, Math.max(0, top));
  if (biggest.length > 0) {
    lines.push("", `largest turns (top ${biggest.length}):`);
    for (const turn of biggest) {
      lines.push(`- event ${turn.index}: ${fmtInt(turn.total)} tokens - ${turn.label}`);
    }
  }

  return `${lines.join("\n")}\n`;
}
