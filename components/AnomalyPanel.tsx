"use client";

import type { Anomaly } from "../lib/analyze";

interface Props {
  anomalies: Anomaly[];
  onJump: (eventIndex: number) => void;
}

export default function AnomalyPanel({ anomalies, onJump }: Props) {
  return (
    <section
      aria-label="Anomaly flags"
      className="rounded-lg border border-line bg-panel p-4"
    >
      <h2 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
        anomaly flags
      </h2>
      {anomalies.length === 0 ? (
        <p className="font-mono text-xs text-zinc-400">
          no anomalies detected
        </p>
      ) : (
        <ul className="scroll-thin max-h-48 space-y-1 overflow-y-auto">
          {anomalies.map((a, i) => (
            <li key={`${a.type}-${a.eventIndex}-${i}`}>
              <button
                type="button"
                onClick={() => onJump(a.eventIndex)}
                className={`flex w-full items-start gap-2 rounded border px-2 py-1 text-left font-mono text-[11px] leading-4 ${
                  a.severity === "high"
                    ? "border-danger/60 text-danger"
                    : "border-line text-zinc-300 hover:border-zinc-500"
                }`}
              >
                <span className="shrink-0 uppercase">{a.type}</span>
                <span className="min-w-0 flex-1 text-zinc-400">{a.message}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
