# AGENTS.md — Working on Voicebox as an AI coding agent

This repo is set up to be pleasant for AI coding agents (Claude Code, Cursor, Cline, Windsurf, Aider, VS Code MCP). This file is the entry point you should read first. Human contributors should read `CONTRIBUTING.md` instead.

## Project layout

```
voicebox/
├── app/           # Shared React/TypeScript frontend (Zustand + React Query)
├── tauri/         # Desktop app shell (Tauri + Rust) — hotkeys, paste, focus
├── web/           # Web deployment of the same frontend
├── backend/       # FastAPI Python server (pyproject.toml, routes/, services/)
│   ├── routes/           # HTTP endpoints (one file per domain)
│   ├── services/         # tts, transcribe, llm, task_queue
│   ├── backends/         # TTS engine implementations
│   ├── mcp_server/       # /mcp mount — FastMCP tools and bindings
│   ├── mcp_shim/         # Stdio shim for clients without HTTP MCP
│   ├── database/         # SQLAlchemy models + session (SQLite)
│   ├── utils/            # host_validation, effects, audio, progress, …
│   └── tests/            # pytest test suite
├── landing/       # Next.js marketing site (voicebox.sh)
├── docs/          # MDX documentation + PROJECT_STATUS.md (living status doc)
└── scripts/       # Build + release scripts
```

## Commands you will use

All orchestration goes through `just` (install with `brew install just` or `cargo install just`). Run `just --list` for the full menu. The ones you'll actually use:

| Task | Command |
|---|---|
| First-time setup | `just setup` |
| Dev server (backend + desktop) | `just dev` |
| Backend only | `just dev-backend` |
| Frontend only | `just dev-frontend` |
| Web dev (no Tauri) | `just dev-web` |
| Kill all dev processes | `just kill` |
| Lint + format Python | `just lint-python && just format-python` |
| Fix Python (ruff) | `just fix-python` |
| JS checks (biome) | `just check-js` |
| All checks | `just check` |
| Python tests | `just test` |
| Regenerate OpenAPI client | `just generate-api` |
| Build server binary | `just build-server` |
| Build desktop app | `just build-tauri` |

## Running the tests you touched

Python tests live under `backend/tests/`. The suite uses `pytest`. From the repo root with the venv active:

```
just test                                     # full suite
python -m pytest backend/tests/test_cors.py   # one module
python -m pytest backend/tests/test_host_validation.py -v
```

A handful of tests require real models (`test_all_models_e2e.py`, `test_mlx_smoke.py`). The rest run on a stock machine with no GPU. Prefer lightweight tests when adding coverage.

## Style

- Python: ruff (`backend/pyproject.toml`) — line length 120, rules select = `F E W I N UP B A …`. Target Python 3.12.
- TypeScript / React: Biome (`biome.json`) — run `just check-js`.
- Rust (Tauri): standard rustfmt + clippy. See `tauri/`.
- Full style guide: `backend/STYLE_GUIDE.md`.

## MCP wiring (for your own use)

A pre-wired `.mcp.json` sits at the repo root. When you open this repo in Claude Code and the dev backend is running (`just dev`), the Voicebox MCP tools (`voicebox.speak`, `voicebox.transcribe`, `voicebox.list_captures`, `voicebox.list_profiles`) attach automatically. You can call `voicebox.speak` to make the app read a progress update aloud while you work.

## Adding a new TTS engine

There is an end-to-end guide at `docs/content/docs/developer/tts-engines.mdx` written specifically for AI coding agents. A dedicated skill lives at `.agents/skills/add-tts-engine/SKILL.md`. Give it an engine name and reference and it will handle the integration.

## Security-relevant touch points

If your task touches any of these, re-read the relevant file first:

- **Host header validation:** `backend/utils/host_validation.py` + `backend/app.py:_configure_host_validation`. Guards against DNS rebinding.
- **CORS:** `backend/app.py:_configure_cors`. Env-extensible via `VOICEBOX_CORS_ORIGINS`.
- **MCP absolute-path reads:** `backend/mcp_server/tools.py` gates filesystem reads to loopback callers.
- **Client identity:** `backend/mcp_server/context.py` — `X-Voicebox-Client-Id` → ContextVar.
- **Path handling:** `backend/config.py:resolve_storage_path` + `to_storage_path`. All on-disk paths flow through these; do not bypass.

## What not to do

- Do not add dependencies without clear need; Voicebox is deliberately slim and the Python wheel chain is already painful on multi-GPU platforms.
- Do not introduce cloud API calls in default code paths. Every new feature must work offline by default.
- Do not weaken host or path validation. If you need to, discuss first on a security issue.
- Do not bump model versions or swap model repositories without updating `docs/PROJECT_STATUS.md`.
- Do not create `.md` planning documents unless the user asks. Work from conversation context.

## Where to look for backlog / priorities

`docs/PROJECT_STATUS.md` is the living engineering status: what shipped, what's in flight, candidate engines being evaluated, and a tiered priority queue. Treat it as the source of truth.

## Release notes you should read as you start

The project is around v0.5.x. Recent relevant changes:

- DNS-rebinding protection via `HostHeaderMiddleware` (`backend/utils/host_validation.py`).
- `/generate` text cap raised from 50 000 to 500 000 characters (auto-chunking handles the rest).
- Serial GPU queue + SSE progress streaming across generations and downloads.

See `CHANGELOG.md` for the full history.
