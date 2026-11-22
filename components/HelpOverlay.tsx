"use client";

import { useEffect, useRef } from "react";

const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: "j / down", action: "next event" },
  { keys: "k / up", action: "previous event" },
  { keys: "Home / End", action: "first / last event" },
  { keys: "/", action: "focus filter" },
  { keys: "?", action: "toggle this help" },
  { keys: "Esc", action: "close overlay or leave filter" },
];

export default function HelpOverlay({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/80 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        className="w-full max-w-sm rounded-lg border border-line bg-panel p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-sm font-semibold text-zinc-100">
            keyboard shortcuts
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close help"
            className="rounded border border-line bg-raised px-2 py-0.5 font-mono text-xs text-zinc-300 hover:border-zinc-500"
          >
            esc
          </button>
        </div>
        <table className="w-full font-mono text-xs">
          <tbody>
            {SHORTCUTS.map((s) => (
              <tr key={s.keys} className="border-t border-line/60">
                <td className="py-2 pr-3 text-zinc-200">
                  <kbd>{s.keys}</kbd>
                </td>
                <td className="py-2 text-zinc-400">{s.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 font-mono text-[10px] leading-4 text-zinc-400">
          all parsing runs locally in this tab. transcript text never leaves
          the browser.
        </p>
      </div>
    </div>
  );
}
