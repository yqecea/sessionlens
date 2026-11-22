import { contextTokens, usageTotal } from "./parsers/types";
import type { SessionEvent } from "./parsers/types";
import { contextWindowFor } from "./pricing";

export type AnomalyType =
  | "retry-loop"
  | "cache-miss"
  | "token-spike"
  | "context-pressure";

export interface Anomaly {
  type: AnomalyType;
  eventIndex: number;
  severity: "warn" | "high";
  message: string;
}

export const RETRY_THRESHOLD = 3;
export const SPIKE_FACTOR = 4;
export const SPIKE_MIN_TOKENS = 20_000;
export const PRESSURE_WARN = 0.7;
export const PRESSURE_HIGH = 0.85;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Flag suspicious patterns in a parsed event stream. Pure function over the
 * event list so the same rules drive the UI badges and the unit tests.
 */
export function analyzeSession(events: SessionEvent[]): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // Retry loops: the same tool called repeatedly back to back, or a run of
  // consecutive errors. Both read as an agent stuck retrying.
  let streak = 1;
  for (let i = 1; i <= events.length; i++) {
    const prev = events[i - 1];
    const cur = events[i];
    const sameTool =
      prev.kind === "tool" &&
      cur?.kind === "tool" &&
      prev.toolName !== null &&
      prev.toolName === cur.toolName;
    const bothErrors = prev.kind === "error" && cur?.kind === "error";
    if (sameTool || bothErrors) {
      streak += 1;
      continue;
    }
    if (
      streak >= RETRY_THRESHOLD &&
      (prev.kind === "tool" || prev.kind === "error")
    ) {
      anomalies.push({
        type: "retry-loop",
        eventIndex: prev.index,
        severity: "warn",
        message:
          prev.kind === "tool"
            ? `${streak} consecutive calls to ${prev.toolName}`
            : `${streak} consecutive errors`,
      });
    }
    streak = 1;
  }

  // Token spikes: assistant turns far above the session median.
  const totals = events
    .filter((e) => e.kind === "assistant" && e.usage)
    .map((e) => usageTotal(e.usage));
  const med = median(totals);
  if (med > 0) {
    for (const event of events) {
      if (event.kind !== "assistant" || !event.usage) continue;
      const total = usageTotal(event.usage);
      if (total >= SPIKE_MIN_TOKENS && total > SPIKE_FACTOR * med) {
        anomalies.push({
          type: "token-spike",
          eventIndex: event.index,
          severity: "warn",
          message: `turn used ${total.toLocaleString("en-US")} tokens, ${Math.round(total / med)}x the session median`,
        });
      }
    }
  }

  // Cache misses: after the first cache write, an assistant turn that reads
  // nothing from cache and writes nothing either means the prompt cache was
  // cold or expired and the full context was re-billed at input price.
  const firstWrite = events.findIndex(
    (e) => e.usage !== null && e.usage.cacheWrite > 0,
  );
  if (firstWrite >= 0) {
    for (const event of events.slice(firstWrite + 1)) {
      if (event.kind !== "assistant" || !event.usage) continue;
      const { input, cacheRead, cacheWrite } = event.usage;
      if (cacheRead === 0 && cacheWrite === 0 && input >= 1_000) {
        anomalies.push({
          type: "cache-miss",
          eventIndex: event.index,
          severity: "warn",
          message: `${input.toLocaleString("en-US")} input tokens billed with no cache read after cache warm-up`,
        });
      }
    }
  }

  // Context window pressure: latest turns nearing the model window.
  for (const event of events) {
    if (event.kind !== "assistant" || !event.usage) continue;
    const window = contextWindowFor(event.model);
    const used = contextTokens(event.usage);
    const ratio = used / window;
    if (ratio >= PRESSURE_WARN) {
      anomalies.push({
        type: "context-pressure",
        eventIndex: event.index,
        severity: ratio >= PRESSURE_HIGH ? "high" : "warn",
        message: `context at ${Math.round(ratio * 100)}% of the ${Math.round(window / 1000)}k window`,
      });
    }
  }

  return anomalies.sort((a, b) => a.eventIndex - b.eventIndex);
}

export function anomaliesFor(
  anomalies: Anomaly[],
  eventIndex: number,
): Anomaly[] {
  return anomalies.filter((a) => a.eventIndex === eventIndex);
}
