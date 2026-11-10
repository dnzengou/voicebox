# INTEGRATE.md — Build With Voicebox

These are **working recipes** for integrating Voicebox's REST + MCP surface into real-world workflows. Each one uses endpoints that already exist in the repository — nothing is aspirational. Default local URL: `http://127.0.0.1:17493`.

Before any recipe below works, Voicebox needs to be running (desktop app, or `just dev-backend` in a dev checkout). You can confirm with:

```bash
curl -s http://127.0.0.1:17493/health | jq
```

---

## Table of contents

1. [Shell: speak a CI build result](#1-shell-speak-a-ci-build-result)
2. [Shell: transcribe a meeting recording](#2-shell-transcribe-a-meeting-recording)
3. [Agent: wire Claude Code / Cursor / Cline into a cloned voice](#3-agent-wire-claude-code--cursor--cline-into-a-cloned-voice)
4. [GitHub Actions: voice-announce a deploy](#4-github-actions-voice-announce-a-deploy)
5. [Discord bot: text-channel → voice-channel in a cloned voice](#5-discord-bot-text-channel--voice-channel)
6. [Slack: /speak slash command](#6-slack-speak-slash-command)
7. [Home Assistant: speak notifications](#7-home-assistant-speak-notifications)
8. [n8n / Zapier: webhook sink](#8-n8n--zapier-webhook-sink)
9. [Audiobook pipeline: chapter → MP3](#9-audiobook-pipeline-chapter--mp3)
10. [Podcast production: dialog → mixed track](#10-podcast-production-dialog--mixed-track)
11. [Accessibility: dictate into any app](#11-accessibility-dictate-into-any-app)
12. [OBS Studio: alert sound in your own voice](#12-obs-studio-alert-sound-in-your-own-voice)

---

## 1. Shell: speak a CI build result

The lowest-effort integration — any shell script can speak.

```bash
curl -sS -X POST http://127.0.0.1:17493/speak \
  -H "Content-Type: application/json" \
  -H "X-Voicebox-Client-Id: ci-notifier" \
  -d '{"text": "Deploy complete.", "profile": "Morgan"}'
```

Omit `profile` to use the per-client binding configured in **Settings → MCP** (see `backend/routes/mcp_bindings.py` for the resolution precedence).

Exit-code-aware wrapper:

```bash
run_with_voice() {
  "$@"
  local status=$?
  if [ "$status" -eq 0 ]; then
    msg="$1 finished cleanly."
  else
    msg="$1 failed with status $status."
  fi
  curl -sS -X POST http://127.0.0.1:17493/speak \
    -H "Content-Type: application/json" \
    -H "X-Voicebox-Client-Id: shell-wrapper" \
    -d "$(jq -nc --arg t "$msg" '{text:$t}')" >/dev/null
  return $status
}

run_with_voice pytest
run_with_voice just build
```

---

## 2. Shell: transcribe a meeting recording

```bash
curl -sS -X POST http://127.0.0.1:17493/transcribe \
  -F "audio=@meeting.wav" \
  -F "model=whisper-turbo" \
  | jq -r .text > meeting.txt
```

Model sizes available: `whisper-base`, `whisper-small`, `whisper-medium`, `whisper-large`, `whisper-turbo` (see `backend/services/transcribe.py`).

---

## 3. Agent: wire Claude Code / Cursor / Cline into a cloned voice

**Claude Code** (one-liner):

```bash
claude mcp add voicebox \
  --transport http \
  --url http://127.0.0.1:17493/mcp \
  --header "X-Voicebox-Client-Id: claude-code"
```

**Any HTTP MCP client** (`.vscode/settings.json`, `.cursor/mcp.json`, `windsurf-settings.json`):

```json
{
  "mcpServers": {
    "voicebox": {
      "url": "http://127.0.0.1:17493/mcp",
      "headers": { "X-Voicebox-Client-Id": "cursor" }
    }
  }
}
```

**Stdio-only client** (older Claude Desktop builds, etc.):

```json
{
  "mcpServers": {
    "voicebox": {
      "command": "/Applications/Voicebox.app/Contents/MacOS/voicebox-mcp",
      "env": { "VOICEBOX_CLIENT_ID": "claude-desktop" }
    }
  }
}
```

In **Settings → MCP** inside Voicebox, bind each client-id to a voice profile. The agent then speaks in that voice whenever it calls `voicebox.speak`.

---

## 4. GitHub Actions: voice-announce a deploy

Runs only if the repo's self-hosted runner (or a laptop with a webhook relay) can reach the local Voicebox port.

```yaml
name: deploy
on: [push]
jobs:
  deploy:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        run: ./deploy.sh
      - name: Announce
        if: always()
        run: |
          STATUS="${{ job.status }}"
          curl -sS -X POST http://127.0.0.1:17493/speak \
            -H "Content-Type: application/json" \
            -H "X-Voicebox-Client-Id: github-actions" \
            -d "$(jq -nc --arg t "Deploy of ${GITHUB_REPOSITORY} finished with status ${STATUS}." '{text:$t, profile:"Morgan"}')"
```

---

## 5. Discord bot: text-channel → voice-channel

The bot calls Voicebox to render speech, then plays the audio into the Discord voice channel. Pseudocode (Python + `discord.py` + `httpx`):

```python
import httpx
import discord
from discord import FFmpegPCMAudio

VOICEBOX = "http://127.0.0.1:17493"

async def speak_in_channel(voice_channel: discord.VoiceChannel, text: str, profile: str):
    # Ask Voicebox to generate; wait for completion.
    async with httpx.AsyncClient() as c:
        r = await c.post(
            f"{VOICEBOX}/generate",
            json={"text": text, "profile_id": profile, "language": "en"},
            headers={"X-Voicebox-Client-Id": "discord-bot"},
            timeout=120.0,
        )
        r.raise_for_status()
        generation_id = r.json()["id"]

        # Download the resulting audio.
        audio = await c.get(f"{VOICEBOX}/history/{generation_id}/export-audio")
        with open("/tmp/vb.wav", "wb") as f:
            f.write(audio.content)

    vc = await voice_channel.connect()
    vc.play(FFmpegPCMAudio("/tmp/vb.wav"))
```

`/generate` returns immediately with a generation id; poll `/history/{id}` or subscribe to `/events` (SSE) for completion. See `backend/routes/events.py` for the SSE stream.

---

## 6. Slack: /speak slash command

Wire a Slack slash command to a small relay that posts to `POST /speak`. Relay:

```python
from flask import Flask, request
import httpx

app = Flask(__name__)

@app.post("/slack/speak")
def speak():
    text = request.form.get("text", "")
    httpx.post(
        "http://127.0.0.1:17493/speak",
        json={"text": text, "profile": "Morgan"},
        headers={"X-Voicebox-Client-Id": "slack-bot"},
        timeout=30.0,
    )
    return {"response_type": "ephemeral", "text": f"Speaking: {text}"}
```

Route `/slack/speak` as the Request URL in your Slack app's Slash Command configuration.

---

## 7. Home Assistant: speak notifications

Add a REST notify service in `configuration.yaml`:

```yaml
rest_command:
  voicebox_speak:
    url: "http://127.0.0.1:17493/speak"
    method: POST
    headers:
      Content-Type: application/json
      X-Voicebox-Client-Id: home-assistant
    payload: '{"text":"{{ message }}","profile":"Morgan"}'

automation:
  - alias: Doorbell voice announce
    trigger:
      - platform: state
        entity_id: binary_sensor.doorbell
        to: "on"
    action:
      - service: rest_command.voicebox_speak
        data:
          message: "Someone is at the front door."
```

---

## 8. n8n / Zapier: webhook sink

Add an **HTTP Request** node:

- URL: `http://127.0.0.1:17493/speak` (or `/generate` if you want the audio file back)
- Method: POST
- Headers: `Content-Type: application/json`, `X-Voicebox-Client-Id: n8n`
- Body: `{ "text": "{{ $json.message }}", "profile": "Morgan" }`

For Zapier, the port must be reachable from Zapier's cloud workers — put Voicebox behind a reverse proxy, set `VOICEBOX_ALLOWED_HOSTS` to the proxy's hostname, and front it with your own auth.

---

## 9. Audiobook pipeline: chapter → MP3

```bash
#!/usr/bin/env bash
set -euo pipefail

PROFILE="your-narrator-profile-id"
OUT="audiobook"
mkdir -p "$OUT"

for chapter in chapters/*.txt; do
  name=$(basename "$chapter" .txt)
  echo "Generating $name"
  gen_id=$(curl -sS -X POST http://127.0.0.1:17493/generate \
    -H "Content-Type: application/json" \
    -d "$(jq -nc \
          --arg p "$PROFILE" \
          --rawfile t "$chapter" \
          '{profile_id:$p, text:$t, language:"en", max_chunk_chars:1500, crossfade_ms:80, normalize:true}')" \
    | jq -r .id)

  # Poll until done.
  while true; do
    status=$(curl -sS "http://127.0.0.1:17493/history/$gen_id" | jq -r .status)
    [[ "$status" == "succeeded" || "$status" == "failed" ]] && break
    sleep 2
  done

  curl -sS "http://127.0.0.1:17493/history/$gen_id/export-audio" -o "$OUT/$name.wav"
  ffmpeg -y -i "$OUT/$name.wav" -b:a 192k "$OUT/$name.mp3" && rm "$OUT/$name.wav"
done
```

Chapter text up to 500 000 characters is accepted; auto-chunking at sentence boundaries handles the rest (`backend/utils/chunked_tts.py`).

---

## 10. Podcast production: dialog → mixed track

Voicebox ships a **Stories** editor (multi-track timeline). Create a story, add clips per speaker with different profile_ids, then export:

```bash
curl -sS "http://127.0.0.1:17493/stories/<story-id>/export" -o podcast.wav
```

Story CRUD endpoints: `backend/routes/stories.py`. The editor UI handles trimming, splitting, and crossfades; for scripted pipelines, create items directly via `POST /stories/{id}/items`.

---

## 11. Accessibility: dictate into any app

The desktop app binds global chords for dictation (hold-to-speak and tap-to-toggle). On macOS, transcribed text is pasted into the focused text field via the Accessibility API after user consent. No integration code needed — once Voicebox is running, dictation works system-wide.

Configure the chord bindings in **Settings → Dictation**. Source: `backend/utils/capture_chords.py`.

---

## 12. OBS Studio: alert sound in your own voice

Use OBS's **Advanced Scene Switcher** or a custom WebSocket integration to POST to `/speak` on events (new follower, donation, chat trigger), then play the resulting file through a browser source or media source.

```bash
# On trigger:
gen=$(curl -sS -X POST http://127.0.0.1:17493/generate \
  -H "Content-Type: application/json" \
  -d '{"text":"Thanks for the follow!","profile_id":"streamer-voice","language":"en"}' \
  | jq -r .id)

# Wait a beat then pull the file:
sleep 3
curl -sS "http://127.0.0.1:17493/history/$gen/export-audio" -o /tmp/alert.wav
```

Point OBS's media source at `/tmp/alert.wav` and reload on trigger.

---

## Security notes for integrations

- The server binds to **loopback only** by default. Everything in this file assumes same-host access.
- To accept requests from your LAN or a reverse proxy, set `VOICEBOX_ALLOWED_HOSTS=your.hostname[:port]` (DNS-rebinding defense in `backend/utils/host_validation.py`) and `VOICEBOX_CORS_ORIGINS=https://your.site` for browser clients.
- There is no built-in auth. If you expose the API beyond loopback, front it with a reverse proxy that adds authentication, and consider setting `VOICEBOX_DISABLE_HOST_CHECK=1` so your proxy owns Host validation.
- Set `X-Voicebox-Client-Id` on every call — it drives per-client voice bindings and the "last heard from" stamp in Settings → MCP. Choose a stable identifier per integration.

## Troubleshooting integrations

- **`curl: (7) Failed to connect`** — Voicebox is not running, or is bound to a different port. Check `/health`.
- **`421 Misdirected Request` with `invalid_host`** — your `Host:` header isn't in the allowlist. Either call via `127.0.0.1` / `localhost`, or extend `VOICEBOX_ALLOWED_HOSTS`.
- **Generation takes a long time on first call** — the model is loading. Subsequent calls reuse the loaded model. Pre-warm with `POST /models/load`.
- **`profile` not found** — call `GET /profiles` to list valid ids, and pass `profile` (name or id) or `profile_id` consistently.

More: `docs/content/docs/overview/troubleshooting.mdx`.
