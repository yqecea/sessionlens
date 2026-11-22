"use client";

import { useRef, useState } from "react";

interface Props {
  samples: { key: string; label: string; file: string }[];
  onSample: (file: string, label: string) => void;
  onParse: (text: string) => void;
  onFile: (file: File) => void;
}

export default function EmptyState({ samples, onSample, onParse, onFile }: Props) {
  const [draft, setDraft] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState<string | null>(null);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <div className="mb-8">
          <h1 className="font-mono text-3xl font-semibold tracking-tight text-zinc-100">
            session<span className="text-accent">lens</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
            Paste an agent transcript and get a navigable timeline with
            per turn token usage, cost estimates and anomaly flags for
            retry loops, cache misses, token spikes and context window
            pressure. Everything runs in your browser. Nothing is uploaded.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="rounded-lg border border-line bg-panel p-4">
            <label
              htmlFor="paste-input"
              className="mb-2 block font-mono text-xs text-zinc-400"
            >
              paste a .jsonl transcript
            </label>
            <textarea
              id="paste-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={9}
              spellCheck={false}
              placeholder='{"type":"user","message":{"role":"user","content":"..."}}'
              className="scroll-thin w-full resize-y rounded border border-line bg-raised p-2 font-mono text-xs leading-5 text-zinc-200 placeholder:text-zinc-400"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={draft.trim().length === 0}
                onClick={() => onParse(draft)}
                className="rounded bg-accent px-3 py-1.5 font-mono text-xs font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                inspect session
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded border border-line bg-raised px-3 py-1.5 font-mono text-xs text-zinc-300 hover:border-zinc-500"
              >
                open .jsonl file
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".jsonl,.log,.txt,.json"
                className="hidden"
                aria-label="Open transcript file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onFile(file);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-line bg-panel p-4">
              <p className="mb-3 font-mono text-xs text-zinc-400">
                or load a synthetic sample
              </p>
              <div className="flex flex-col gap-2">
                {samples.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    disabled={loading !== null}
                    onClick={() => {
                      setLoading(s.key);
                      void Promise.resolve(onSample(s.file, s.label)).finally(
                        () => setLoading(null),
                      );
                    }}
                    className="flex items-center justify-between rounded border border-line bg-raised px-3 py-2 text-left font-mono text-xs text-zinc-200 hover:border-accent"
                  >
                    <span>{s.label} session</span>
                    <span className="text-zinc-400">
                      {loading === s.key ? "loading" : "load"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-line bg-panel p-4">
              <p className="mb-2 font-mono text-xs text-zinc-400">
                supported formats
              </p>
              <ul className="space-y-1 font-mono text-[11px] leading-5 text-zinc-400">
                <li>Claude Code session .jsonl exports</li>
                <li>Codex CLI rollout .jsonl logs</li>
                <li>Hermes agent trace .jsonl</li>
              </ul>
            </div>
            <p className="px-1 font-mono text-[11px] text-zinc-400">
              keyboard: <kbd>j</kbd>/<kbd>k</kbd> move, <kbd>/</kbd> filter,{" "}
              <kbd>?</kbd> help
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
