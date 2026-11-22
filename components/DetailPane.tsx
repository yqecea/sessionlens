"use client";

import type { SessionEvent } from "../lib/parsers";
import { contextTokens } from "../lib/parsers/types";
import type { Anomaly } from "../lib/analyze";
import { usageCost, type ModelRate } from "../lib/pricing";
import { fmtInt, fmtUSD } from "../lib/format";

interface Props {
  event: SessionEvent | null;
  anomalies: Anomaly[];
  rate: ModelRate | null;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-zinc-400">{label}</dt>
      <dd className="truncate text-zinc-200">{value}</dd>
    </div>
  );
}

export default function DetailPane({ event, anomalies, rate }: Props) {
  return (
    <section
      aria-label="Selected event"
      className="rounded-lg border border-line bg-panel p-4"
    >
      <h2 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
        selected turn
      </h2>
      {!event ? (
        <p className="font-mono text-xs text-zinc-400">
          select a row in the timeline
        </p>
      ) : (
        <>
          <dl className="space-y-1 font-mono text-[11px]">
            <Row label="kind" value={event.kind} />
            <Row label="line" value={String(event.line)} />
            {event.timestamp && <Row label="time" value={event.timestamp} />}
            {event.model && <Row label="model" value={event.model} />}
            {event.toolName && <Row label="tool" value={event.toolName} />}
            {event.usage && (
              <>
                <Row label="input" value={fmtInt(event.usage.input)} />
                <Row label="output" value={fmtInt(event.usage.output)} />
                <Row label="cache read" value={fmtInt(event.usage.cacheRead)} />
                <Row
                  label="cache write"
                  value={fmtInt(event.usage.cacheWrite)}
                />
                <Row
                  label="context"
                  value={fmtInt(contextTokens(event.usage))}
                />
                {rate && (
                  <Row label="est. cost" value={fmtUSD(usageCost(event.usage, rate))} />
                )}
              </>
            )}
          </dl>
          {anomalies.length > 0 && (
            <ul className="mt-3 space-y-1" aria-label="Flags on this event">
              {anomalies.map((a) => (
                <li
                  key={`${a.type}-${a.eventIndex}`}
                  className={`rounded border px-2 py-1 font-mono text-[11px] ${
                    a.severity === "high"
                      ? "border-danger/60 text-danger"
                      : "border-line text-zinc-400"
                  }`}
                >
                  {a.type}: {a.message}
                </li>
              ))}
            </ul>
          )}
          {event.detail && (
            <pre className="scroll-thin mt-3 max-h-52 overflow-auto rounded border border-line bg-raised p-2 font-mono text-[11px] leading-5 text-zinc-300 whitespace-pre-wrap">
              {event.detail}
            </pre>
          )}
        </>
      )}
    </section>
  );
}
