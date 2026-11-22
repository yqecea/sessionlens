"use client";

import type { SessionEvent } from "../lib/parsers";
import { usageTotal } from "../lib/parsers/types";
import type { Anomaly } from "../lib/analyze";
import { fmtCompact, fmtTime } from "../lib/format";

const KIND_BADGE: Record<SessionEvent["kind"], { mark: string; cls: string }> = {
  user: { mark: "usr", cls: "border-zinc-600 text-zinc-300" },
  assistant: { mark: "ast", cls: "border-accent/60 text-accent" },
  tool: { mark: "tl", cls: "border-zinc-700 text-zinc-400" },
  error: { mark: "err", cls: "border-danger/60 text-danger" },
  summary: { mark: "sum", cls: "border-zinc-700 text-zinc-400" },
  system: { mark: "sys", cls: "border-zinc-800 text-zinc-400" },
};

const FLAG_SHORT: Record<Anomaly["type"], string> = {
  "retry-loop": "retry",
  "cache-miss": "cache",
  "token-spike": "spike",
  "context-pressure": "ctx",
};

interface Props {
  events: SessionEvent[];
  selectedPos: number;
  anomalyByIndex: Map<number, Anomaly[]>;
  onSelect: (pos: number) => void;
}

export default function Timeline({
  events,
  selectedPos,
  anomalyByIndex,
  onSelect,
}: Props) {
  if (events.length === 0) {
    return (
      <p className="p-4 font-mono text-xs text-zinc-400">
        no events match the filter
      </p>
    );
  }
  return (
    <ul
      id="timeline"
      role="listbox"
      aria-label="Session events"
      aria-activedescendant={
        events[selectedPos] ? `event-${events[selectedPos].index}` : undefined
      }
      tabIndex={0}
      className="scroll-thin max-h-[calc(100vh-7rem)] overflow-y-auto p-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
    >
      {events.map((event, pos) => {
        const badge = KIND_BADGE[event.kind];
        const flags = anomalyByIndex.get(event.index) ?? [];
        const isSelected = pos === selectedPos;
        const tokens = usageTotal(event.usage);
        return (
          <li
            key={event.index}
            id={`event-${event.index}`}
            data-event-index={event.index}
            role="option"
            aria-selected={isSelected}
            aria-current={isSelected ? "true" : undefined}
            onClick={() => onSelect(pos)}
            className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 font-mono text-xs ${
              isSelected
                ? "bg-raised ring-1 ring-accent"
                : "hover:bg-raised/60"
            }`}
          >
            <span className="w-8 shrink-0 text-right text-[10px] text-zinc-400">
              {event.line}
            </span>
            <span
              className={`w-9 shrink-0 rounded border px-1 text-center text-[9px] uppercase tracking-wide ${badge.cls}`}
            >
              {badge.mark}
            </span>
            <span className="min-w-0 flex-1 truncate text-zinc-300">
              {event.label}
            </span>
            {flags.map((f) => (
              <span
                key={f.type}
                title={f.message}
                className={`shrink-0 rounded border px-1 text-[9px] ${
                  f.severity === "high"
                    ? "border-danger/60 text-danger"
                    : "border-zinc-600 text-zinc-400"
                }`}
              >
                {FLAG_SHORT[f.type]}
              </span>
            ))}
            {event.model && (
              <span className="hidden shrink-0 text-[10px] text-zinc-400 xl:inline">
                {event.model.replace(/^claude-/, "")}
              </span>
            )}
            {tokens > 0 && (
              <span className="w-12 shrink-0 text-right text-[10px] text-zinc-400">
                {fmtCompact(tokens)}
              </span>
            )}
            <span className="w-16 shrink-0 text-right text-[10px] text-zinc-400">
              {fmtTime(event.timestamp)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
