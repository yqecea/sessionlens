# X post draft: sessionlens

## Primary post

Built a browser-only debugger for agent traces. Drop a Claude Code / Codex / Hermes .jsonl transcript and get per-turn token costs, anomaly flags for retry loops and cache misses, and a keyboard-driven timeline. Nothing leaves your machine.

Live: https://yqecea.github.io/sessionlens/
Source: https://github.com/yqecea/sessionlens

## Shorter variant

Agent CLIs hide where your tokens went. sessionlens parses the raw transcript in your browser and shows per-turn cost, retry loops, cache misses and context pressure. No upload, no backend.

https://yqecea.github.io/sessionlens/

## Media to attach

- docs/screenshots/overview.png (timeline with tokens + flags)
- docs/screenshots/empty-state.png (landing view)
Both files are committed in the repo and render correctly in the README.
