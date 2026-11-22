"use client";

import type { SessionEvent } from "../lib/parsers";
import { usageTotal } from "../lib/parsers/types";
import { fmtCompact } from "../lib/format";

interface Props {
  events: SessionEvent[];
  selectedIndex: number | null;
  onSelect: (eventIndex: number) => void;
}

const W = 100;
const H = 28;

export default function TokenChart({ events, selectedIndex, onSelect }: Props) {
  const usageEvents = events.filter((e) => e.usage !== null);
  const totals = usageEvents.map((e) => usageTotal(e.usage));
  const max = Math.max(1, ...totals);
  const cumulative: number[] = [];
  let run = 0;
  for (const t of totals) {
    run += t;
    cumulative.push(run);
  }
  const cumMax = Math.max(1, run);
  const n = Math.max(1, usageEvents.length);
  const barW = W / n;

  const points = cumulative
    .map(
      (v, i) =>
        `${(((i + 1) / n) * W).toFixed(2)},${(H - (v / cumMax) * (H - 2)).toFixed(2)}`,
    )
    .join(" ");

  return (
    <section
      aria-label="Token usage"
      className="rounded-lg border border-line bg-panel p-4"
    >
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
          tokens per turn
        </h2>
        <span className="font-mono text-[10px] text-zinc-400">
          max {fmtCompact(max)}
        </span>
      </div>
      {usageEvents.length === 0 ? (
        <p className="font-mono text-xs text-zinc-400">
          no usage data in this transcript
        </p>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="h-20 w-full"
            role="img"
            aria-label="Bar chart of tokens per turn"
          >
            {usageEvents.map((e, i) => {
              const h = Math.max(1, (totals[i] / max) * (H - 2));
              const sel = e.index === selectedIndex;
              return (
                <rect
                  key={e.index}
                  x={(i * barW).toFixed(2)}
                  y={(H - h).toFixed(2)}
                  width={Math.max(0.5, barW - 0.4).toFixed(2)}
                  height={h.toFixed(2)}
                  className={sel ? "fill-accent" : "fill-zinc-600"}
                  onClick={() => onSelect(e.index)}
                  style={{ cursor: "pointer" }}
                >
                  <title>{`${e.label}: ${totals[i].toLocaleString("en-US")} tokens`}</title>
                </rect>
              );
            })}
          </svg>
          <div className="mt-3 mb-1 flex items-baseline justify-between">
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
              cumulative
            </h3>
            <span className="font-mono text-[10px] text-zinc-400">
              {fmtCompact(run)} total
            </span>
          </div>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="h-14 w-full"
            role="img"
            aria-label="Cumulative token usage line chart"
          >
            <polyline
              points={points}
              fill="none"
              className="stroke-accent"
              strokeWidth="1.2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </>
      )}
    </section>
  );
}
