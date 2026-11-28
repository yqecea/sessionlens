# Show HN draft: sessionlens

## Title

Show HN: sessionlens, a browser-only debugger for agent traces and token costs

## Body

I run a lot of coding agents (Claude Code, Codex CLI, Hermes) and kept hitting the same problem: after a session goes wrong, the transcript is thousands of JSONL lines and the two questions I actually have, "where did the tokens go" and "where did the run go sideways", take forever to answer by scrolling.

sessionlens is a single-page app that parses the transcript entirely in your browser. Nothing is uploaded. You paste or drop a `.jsonl` file and get:

- a per-turn token chart with a cumulative line, so spikes are visible at a glance
- an editable per-model cost table (input / output / cache read / cache write rates) with the session total
- anomaly flags pinned to the exact turn: retry loops, cold-cache turns, token spikes above the session median, context window pressure
- a detail pane for every event, fully keyboard driven

Live demo: https://yqecea.github.io/sessionlens/
Source: https://github.com/yqecea/sessionlens
Sample transcripts are bundled in the repo under docs/samples if you want to try it without your own logs.

Implementation notes:

- Plain TypeScript + Next.js static export, no backend, no telemetry
- Parser is format tolerant: Claude Code session exports, Codex CLI rollout logs, Hermes traces, and anything line-delimited it can coerce. Lines it cannot parse are counted in the header instead of being silently dropped
- Tests: vitest unit tests for the parser and cost math, Playwright + axe for the UI (0 serious accessibility violations)

I built this because I wanted the cost view that agent CLIs do not give you. Curious what other people use to debug long agent runs, and whether per-turn cost is even the right unit or if cache hit rate matters more in practice.
