"use client";

import type { SessionEvent } from "../lib/parsers";
import { usageTotal } from "../lib/parsers/types";
import {
  effectiveRate,
  rateFor,
  usageCost,
  type ModelRate,
  type RateOverrides,
} from "../lib/pricing";
import { fmtInt, fmtUSD } from "../lib/format";

interface Props {
  events: SessionEvent[];
  models: string[];
  overrides: RateOverrides;
  onChange: (overrides: RateOverrides) => void;
}

const RATE_FIELDS: { key: keyof Omit<ModelRate, "context">; label: string }[] = [
  { key: "input", label: "in" },
  { key: "output", label: "out" },
  { key: "cacheRead", label: "rd" },
  { key: "cacheWrite", label: "wr" },
];

export default function CostPanel({ events, models, overrides, onChange }: Props) {
  const rows = models.map((model) => {
    const rate = effectiveRate(model, overrides);
    const modelEvents = events.filter((e) => e.model === model);
    const tokens = modelEvents.reduce((s, e) => s + usageTotal(e.usage), 0);
    const cost = modelEvents.reduce(
      (s, e) => s + usageCost(e.usage, rate),
      0,
    );
    return { model, rate, tokens, cost, count: modelEvents.length };
  });
  const unknownEvents = events.filter((e) => e.usage && !e.model);
  if (unknownEvents.length > 0) {
    const rate = effectiveRate(null, overrides);
    rows.push({
      model: "(unspecified)",
      rate,
      tokens: unknownEvents.reduce((s, e) => s + usageTotal(e.usage), 0),
      cost: unknownEvents.reduce((s, e) => s + usageCost(e.usage, rate), 0),
      count: unknownEvents.length,
    });
  }
  const total = rows.reduce((s, r) => s + r.cost, 0);

  const update = (model: string, key: keyof Omit<ModelRate, "context">, raw: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return;
    const base = overrides[model] ?? rateFor(model === "(unspecified)" ? null : model);
    onChange({ ...overrides, [model]: { ...base, [key]: n } });
  };

  return (
    <section
      aria-label="Cost estimate"
      className="rounded-lg border border-line bg-panel p-4"
    >
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
          cost estimate
        </h2>
        <span className="font-mono text-xs text-accent">{fmtUSD(total)}</span>
      </div>
      {rows.length === 0 ? (
        <p className="font-mono text-xs text-zinc-400">
          no usage data in this transcript
        </p>
      ) : (
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full border-collapse font-mono text-[11px]">
            <thead>
              <tr className="text-left text-zinc-400">
                <th className="pb-1 pr-2 font-normal">model</th>
                <th className="pb-1 pr-2 text-right font-normal">tokens</th>
                {RATE_FIELDS.map((f) => (
                  <th key={f.key} className="pb-1 pr-1 text-right font-normal">
                    $/1M {f.label}
                  </th>
                ))}
                <th className="pb-1 text-right font-normal">cost</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.model} className="border-t border-line/60">
                  <td className="py-1 pr-2 text-zinc-300">{row.model}</td>
                  <td className="py-1 pr-2 text-right text-zinc-400">
                    {fmtInt(row.tokens)}
                  </td>
                  {RATE_FIELDS.map((f) => (
                    <td key={f.key} className="py-1 pr-1 text-right">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        aria-label={`${row.model} ${f.label} price per million tokens`}
                        value={row.rate[f.key]}
                        onChange={(e) => update(row.model, f.key, e.target.value)}
                        className="w-14 rounded border border-line bg-raised px-1 py-0.5 text-right text-[10px] text-zinc-200"
                      />
                    </td>
                  ))}
                  <td className="py-1 text-right text-zinc-200">
                    {fmtUSD(row.cost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 font-mono text-[10px] leading-4 text-zinc-400">
        prices are editable estimates in USD per 1M tokens, not billing data
      </p>
    </section>
  );
}
