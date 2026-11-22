import type { TokenUsage } from "./parsers/types";

/** USD per 1M tokens, plus the context window used for pressure checks. */
export interface ModelRate {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  context: number;
}

interface RateRule {
  match: string;
  rate: ModelRate;
}

/**
 * Approximate public list prices, editable in the UI. Values are estimates
 * for cost orientation, not billing data.
 */
const RATE_RULES: RateRule[] = [
  {
    match: "opus",
    rate: { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25, context: 200_000 },
  },
  {
    match: "sonnet",
    rate: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75, context: 200_000 },
  },
  {
    match: "haiku",
    rate: { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25, context: 200_000 },
  },
  {
    match: "gpt-5",
    rate: { input: 1.25, output: 10, cacheRead: 0.125, cacheWrite: 1.25, context: 272_000 },
  },
  {
    match: "codex-mini",
    rate: { input: 1.5, output: 6, cacheRead: 0.375, cacheWrite: 1.5, context: 200_000 },
  },
];

export const FALLBACK_RATE: ModelRate = {
  input: 2,
  output: 8,
  cacheRead: 0.2,
  cacheWrite: 2.5,
  context: 200_000,
};

export function rateFor(model: string | null): ModelRate {
  if (!model) return FALLBACK_RATE;
  const name = model.toLowerCase();
  for (const rule of RATE_RULES) {
    if (name.includes(rule.match)) return rule.rate;
  }
  return FALLBACK_RATE;
}

export function contextWindowFor(model: string | null): number {
  return rateFor(model).context;
}

export function usageCost(usage: TokenUsage | null, rate: ModelRate): number {
  if (!usage) return 0;
  return (
    (usage.input * rate.input +
      usage.output * rate.output +
      usage.cacheRead * rate.cacheRead +
      usage.cacheWrite * rate.cacheWrite) /
    1_000_000
  );
}

export type RateOverrides = Record<string, ModelRate>;

export function effectiveRate(
  model: string | null,
  overrides: RateOverrides,
): ModelRate {
  if (model && overrides[model]) return overrides[model];
  return rateFor(model);
}
