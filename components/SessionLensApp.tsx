"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseSession } from "../lib/parsers";
import type { ParseResult, SessionEvent } from "../lib/parsers";
import { usageTotal } from "../lib/parsers/types";
import { analyzeSession, type Anomaly } from "../lib/analyze";
import {
  effectiveRate,
  usageCost,
  type RateOverrides,
} from "../lib/pricing";
import { fmtInt, fmtUSD } from "../lib/format";
import { buildReport } from "../lib/report";
import EmptyState from "./EmptyState";
import Timeline from "./Timeline";
import DetailPane from "./DetailPane";
import TokenChart from "./TokenChart";
import CostPanel from "./CostPanel";
import AnomalyPanel from "./AnomalyPanel";
import HelpOverlay from "./HelpOverlay";

const SAMPLES: { key: string; label: string; file: string }[] = [
  { key: "claude", label: "Claude Code", file: "/samples/claude-code.sample.jsonl" },
  { key: "codex", label: "Codex", file: "/samples/codex.sample.jsonl" },
  { key: "hermes", label: "Hermes", file: "/samples/hermes.sample.jsonl" },
];

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export default function SessionLensApp() {
  const [session, setSession] = useState<ParseResult | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [overrides, setOverrides] = useState<RateOverrides>({});
  const [copied, setCopied] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const events: SessionEvent[] = useMemo(
    () => session?.events ?? [],
    [session],
  );

  const anomalies: Anomaly[] = useMemo(
    () => analyzeSession(events),
    [events],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) =>
      `${e.kind} ${e.label} ${e.toolName ?? ""} ${e.model ?? ""} ${e.detail}`
        .toLowerCase()
        .includes(q),
    );
  }, [events, query]);

  const selectedEvent = filtered[selected] ?? null;

  const anomalyByIndex = useMemo(() => {
    const map = new Map<number, Anomaly[]>();
    for (const a of anomalies) {
      const list = map.get(a.eventIndex) ?? [];
      list.push(a);
      map.set(a.eventIndex, list);
    }
    return map;
  }, [anomalies]);

  const models = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) if (e.model) set.add(e.model);
    return [...set].sort();
  }, [events]);

  const totalTokens = useMemo(
    () => events.reduce((sum, e) => sum + usageTotal(e.usage), 0),
    [events],
  );

  const totalCost = useMemo(
    () =>
      events.reduce(
        (sum, e) => sum + usageCost(e.usage, effectiveRate(e.model, overrides)),
        0,
      ),
    [events, overrides],
  );

  const loadText = useCallback((text: string, name: string) => {
    setSession(parseSession(text));
    setSourceName(name);
    setQuery("");
    setSelected(0);
    setOverrides({});
  }, []);

  const loadSample = useCallback(
    async (file: string, label: string) => {
      const res = await fetch(file);
      const text = await res.text();
      loadText(text, `${label} sample`);
    },
    [loadText],
  );

  const loadFile = useCallback(
    (file: File) => {
      void file.text().then((text) => loadText(text, file.name));
    },
    [loadText],
  );

  const reset = useCallback(() => {
    setSession(null);
    setSourceName("");
    setQuery("");
    setSelected(0);
  }, []);

  const jumpToEvent = useCallback((eventIndex: number) => {
    setQuery("");
    setSelected(eventIndex);
  }, []);

  const copyReport = useCallback(() => {
    if (!session) return;
    const text = buildReport({
      sourceName,
      format: session.format,
      parseFailures: session.parseFailures,
      events,
      anomalies,
      totalTokens,
      totalCost,
    });
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [session, sourceName, events, anomalies, totalTokens, totalCost]);

  // Keep the selected row visible.
  useEffect(() => {
    if (selectedEvent == null) return;
    document
      .querySelector(`[data-event-index="${selectedEvent.index}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedEvent]);

  // Clamp selection when the filtered list shrinks.
  useEffect(() => {
    if (selected >= filtered.length) {
      setSelected(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, selected]);

  // Global keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (helpOpen) {
          setHelpOpen(false);
        } else if (document.activeElement === searchRef.current) {
          searchRef.current?.blur();
        }
        return;
      }
      if (isEditable(e.target)) return;
      if (e.key === "/" ) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen((open) => !open);
        return;
      }
      if (!session || filtered.length === 0) return;
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, filtered.length - 1));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === "Home") {
        e.preventDefault();
        setSelected(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setSelected(filtered.length - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [helpOpen, session, filtered.length]);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#timeline"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-accent focus:px-3 focus:py-1 focus:text-sm focus:text-ink"
      >
        Skip to timeline
      </a>
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-base font-semibold tracking-tight text-zinc-100">
            session<span className="text-accent">lens</span>
          </span>
          <span className="font-mono text-[11px] text-zinc-400">
            agent trace debugger
          </span>
        </div>
        {session && (
          <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-zinc-400">
            <div className="flex gap-1">
              <dt className="text-zinc-400">format</dt>
              <dd className="text-accent">{session.format}</dd>
            </div>
            <div className="flex gap-1">
              <dt className="text-zinc-400">events</dt>
              <dd>{fmtInt(events.length)}</dd>
            </div>
            <div className="flex gap-1">
              <dt className="text-zinc-400">tokens</dt>
              <dd>{fmtInt(totalTokens)}</dd>
            </div>
            <div className="flex gap-1">
              <dt className="text-zinc-400">est.cost</dt>
              <dd>{fmtUSD(totalCost)}</dd>
            </div>
            {session.parseFailures > 0 && (
              <div className="flex gap-1">
                <dt className="text-zinc-400">parse-failures</dt>
                <dd className="text-danger">{session.parseFailures}</dd>
              </div>
            )}
            {anomalies.length > 0 && (
              <div className="flex gap-1">
                <dt className="text-zinc-400">flags</dt>
                <dd className="text-danger">{anomalies.length}</dd>
              </div>
            )}
            <div className="flex gap-1 truncate">
              <dt className="sr-only">source</dt>
              <dd className="truncate text-zinc-400">{sourceName}</dd>
            </div>
          </dl>
        )}
        <div className="ml-auto flex items-center gap-2">
          {session && (
            <>
              <label className="sr-only" htmlFor="timeline-search">
                Filter timeline
              </label>
              <input
                id="timeline-search"
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelected(0);
                }}
                placeholder="filter ( / )"
                className="w-44 rounded border border-line bg-raised px-2 py-1 font-mono text-xs text-zinc-200 placeholder:text-zinc-400"
              />
              <button
                type="button"
                onClick={copyReport}
                className="rounded border border-line bg-raised px-2 py-1 font-mono text-xs text-zinc-300 hover:border-zinc-500"
              >
                {copied ? "copied" : "copy report"}
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded border border-line bg-raised px-2 py-1 font-mono text-xs text-zinc-300 hover:border-zinc-500"
              >
                new session
              </button>
            </>
          )}
          <button
            type="button"
            aria-label="Keyboard shortcuts"
            aria-expanded={helpOpen}
            onClick={() => setHelpOpen(true)}
            className="rounded border border-line bg-raised px-2 py-1 font-mono text-xs text-zinc-300 hover:border-zinc-500"
          >
            ?
          </button>
        </div>
      </header>

      {!session ? (
        <EmptyState
          samples={SAMPLES}
          onSample={loadSample}
          onParse={(text) => loadText(text, "pasted transcript")}
          onFile={loadFile}
        />
      ) : (
        <main className="grid flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[minmax(0,7fr)_minmax(320px,5fr)]">
          <section
            aria-label="Session timeline"
            className="min-h-[60vh] rounded-lg border border-line bg-panel"
          >
            <Timeline
              events={filtered}
              selectedPos={selected}
              anomalyByIndex={anomalyByIndex}
              onSelect={setSelected}
            />
          </section>
          <aside className="flex min-h-0 flex-col gap-3" aria-label="Session details">
            <DetailPane
              event={selectedEvent}
              anomalies={selectedEvent ? anomalyByIndex.get(selectedEvent.index) ?? [] : []}
              rate={selectedEvent ? effectiveRate(selectedEvent.model, overrides) : null}
            />
            <TokenChart
              events={events}
              selectedIndex={selectedEvent?.index ?? null}
              onSelect={jumpToEvent}
            />
            <CostPanel
              events={events}
              models={models}
              overrides={overrides}
              onChange={setOverrides}
            />
            <AnomalyPanel anomalies={anomalies} onJump={jumpToEvent} />
          </aside>
        </main>
      )}

      {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
