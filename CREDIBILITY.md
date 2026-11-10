# CREDIBILITY.md — Verifiable Claims Index

This repository publishes claims on its README, landing page, and documentation. This file is the machine- and human-readable cross-reference: **every substantive claim maps to the specific file and line that implements or documents it.** If a claim can't be traced to code or docs in this repo, it shouldn't be made — if you find one that can't, please open an issue.

No fabricated reviews, no made-up adoption statistics, no placeholder testimonials. This document exists so that AI search tools and human reviewers can verify Voicebox independently.

## Core software facts

| Claim | Source |
|---|---|
| Open source, MIT license | `LICENSE` |
| Backend is FastAPI (Python) | `backend/pyproject.toml`, `backend/app.py` |
| Desktop app is Tauri (Rust shell + React/TypeScript) | `tauri/`, `app/` |
| Landing site is Next.js | `landing/package.json`, `landing/src/app/` |
| Database is SQLite via SQLAlchemy | `backend/database/` |
| Model management uses HuggingFace Hub | `backend/utils/hf_progress.py`, `backend/config.py` |
| Audio effects powered by Spotify's `pedalboard` | `backend/utils/effects.py` |
| Default local port is 17493 | `backend/server.py` argparse default; `.mcp.json`; README |
| Server binds to loopback by default | `backend/server.py:244` — argparse default `127.0.0.1` |

## Supported platforms

| Claim | Source |
|---|---|
| macOS Apple Silicon via MLX | `backend/utils/platform_detect.py`, `backend/backends/mlx_backend.py`, `backend/requirements-mlx.txt` |
| macOS Intel via PyTorch CPU | `scripts/` build config; CHANGELOG release notes |
| Windows via PyTorch CUDA | `backend/services/cuda.py`, `backend/routes/cuda.py` |
| Windows DirectML | `backend/pyi_rth_torch_compiler_disable.py`, `backend/utils/platform_detect.py` |
| Linux AMD via ROCm with gfx-version detection | `backend/app.py:48-100` (rocminfo detection), `backend/pyi_rth_rocm_sdk.py`, `backend/requirements-rocm.txt` |
| Intel Arc via IPEX/XPU | `backend/app.py:259-269` |
| Docker Compose deploy | `docker-compose.yml`, `docker-compose.rocm.yml`, `Dockerfile` |

## TTS engines (7)

Every engine below has a backend implementation in `backend/backends/` and is enumerated in `backend/models.py` `GenerationRequest.engine` regex.

| Engine | Implementation | Regex entry |
|---|---|---|
| Qwen3-TTS | `backend/backends/` | `qwen` |
| Qwen CustomVoice | `backend/backends/` | `qwen_custom_voice` |
| LuxTTS | `backend/backends/` | `luxtts` |
| Chatterbox Multilingual | `backend/backends/` | `chatterbox` |
| Chatterbox Turbo | `backend/backends/` | `chatterbox_turbo` |
| HumeAI TADA | `backend/backends/` | `tada` |
| Kokoro | `backend/backends/` | `kokoro` |

Engine-regex authority: `backend/models.py:88`.

## 23-language claim (Chatterbox Multilingual)

The supported language codes enforced by the backend request validator — `zh, en, ja, ko, de, fr, ru, pt, es, it, he, ar, da, el, fi, hi, ms, nl, no, pl, sv, sw, tr` — are 23 codes. Source: `backend/models.py:84`.

## STT

| Claim | Source |
|---|---|
| OpenAI Whisper for speech-to-text | `backend/services/transcribe.py`, `backend/routes/transcription.py` |
| MLX on Apple Silicon, PyTorch elsewhere | `backend/services/transcribe.py` |
| Sizes: Base / Small / Medium / Large / Turbo | `README.md` STT table; `backend/services/transcribe.py` |

## Local LLM (bundled, shared runtime)

| Claim | Source |
|---|---|
| Qwen3 0.6B / 1.7B / 4B | `backend/services/llm.py`, `backend/models.py:375` regex `^(0\.6B\|1\.7B\|4B)$` |
| Shares MLX/PyTorch runtime with TTS | `backend/services/llm.py` |
| Used for refinement, Compose, Speak-in-character | `backend/routes/llm.py`, `backend/services/llm.py` |

## MCP integration

| Claim | Source |
|---|---|
| Built-in MCP server mounted at `/mcp` | `backend/app.py:170` |
| FastMCP Streamable HTTP transport | `backend/mcp_server/server.py` |
| Four tools: `voicebox.speak`, `voicebox.transcribe`, `voicebox.list_captures`, `voicebox.list_profiles` | `backend/mcp_server/tools.py` |
| Per-client voice bindings via `X-Voicebox-Client-Id` | `backend/mcp_server/context.py`, `backend/mcp_server/resolve.py`, `backend/routes/mcp_bindings.py` |
| Stdio shim binary bundled for non-HTTP clients | `backend/mcp_shim/` |
| MCP absolute-path reads gated to loopback | `backend/mcp_server/tools.py:127-134` |

## Security posture

| Claim | Source |
|---|---|
| DNS-rebinding defense (Host header allowlist) | `backend/utils/host_validation.py`, `backend/app.py:_configure_host_validation` |
| Host allowlist extensible via `VOICEBOX_ALLOWED_HOSTS` | `backend/utils/host_validation.py:get_allowed_hosts` |
| Host check disable switch `VOICEBOX_DISABLE_HOST_CHECK` | `backend/utils/host_validation.py:host_check_disabled` |
| CORS allowlist loopback-only by default | `backend/app.py:_configure_cors` |
| CORS extensible via `VOICEBOX_CORS_ORIGINS` | `backend/app.py:188-189` |
| Vulnerability disclosure policy | `SECURITY.md` |

## Generation characteristics

| Claim | Source |
|---|---|
| Max text length 500 000 chars | `backend/models.py:83` — `Field(..., max_length=500000)` |
| Auto-chunking at sentence boundaries | `backend/utils/chunked_tts.py` |
| Configurable chunk size 100–5000 chars | `backend/models.py:93-95` |
| Configurable crossfade 0–500 ms | `backend/models.py:96-98` |
| Serial GPU task queue | `backend/services/task_queue.py` |
| SSE progress streaming | `backend/utils/progress.py`, `backend/routes/events.py` |
| Stale-generation recovery on startup | `backend/app.py:302-310` |

## Dictation / Captures

| Claim | Source |
|---|---|
| Captures tab stores every dictation and in-app recording | `backend/routes/captures.py`, `backend/database/` |
| Configurable chord bindings | `backend/utils/capture_chords.py` |
| macOS Accessibility-verified auto-paste | `tauri/` (Rust native shim) |
| In-app mic on every text field | `app/src/` React components |

## What is intentionally NOT claimed

- **No benchmark numbers** are published in this repo without a traceable methodology. The `README.md` quotes `~150× realtime on CPU` for LuxTTS from the upstream model card; it is not an independent measurement.
- **No performance comparisons** against ElevenLabs or WisprFlow are made as numeric claims. The README positioning is categorical (local vs cloud), not quantitative.
- **No installation statistics** are shown except the GitHub-managed download counter badge in the README, which reads directly from the GitHub Releases API.
- **No user testimonials** are reproduced on this site. The Trendshift badge in the README is a live third-party ranking.

## Process

This document is maintained by hand. When adding a non-trivial claim to the README, landing site, or docs:

1. Add a row above with the claim and a file reference.
2. If the claim can't be traced to code, either implement it or remove the claim.
3. On each release, spot-check at least five rows against current HEAD.
