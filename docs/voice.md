# Voice Commands

CareConnect Web ports the desktop app's fully local voice system. Speech
never leaves the device: audio is captured with `getUserMedia`, transcribed by
an OpenAI Whisper model running in a Web Worker (via
`@huggingface/transformers` + ONNX Runtime WASM), and dispatched through a
per-page command registry. Read-aloud uses the browser's built-in
`speechSynthesis`.

## Why local Whisper (and not the Web Speech API)

- Chrome's Web Speech implementation streams microphone audio to Google's
  cloud speech service — unacceptable for a health app handling dictated
  messages and symptoms.
- Firefox does not implement Web Speech recognition at all.
- Cloud recognition stops working offline, which would break the
  offline-first PWA promise.

Whisper runs entirely on-device, works in every modern browser, and keeps
working offline once the model is cached.

## Using it

- The **voice bar** sits at the bottom of every authenticated page.
- Tap the mic (or press **Ctrl+Space** from anywhere) to start listening; tap
  again (or say **"stop listening"**) to stop.
- Say **"what can I say"** at any time to open a panel showing the commands
  available right now (dialog, page, and global). Say **"close help"** or tap
  its × to dismiss it.
- Speaking while a text field is focused (in a dialog, or in the page — e.g.
  the messages composer) dictates into that field.
- The first voice use on a device downloads the speech model (see below).
  While it downloads, the bar shows **"Downloading voice model… N%"**, then
  **"Preparing voice recognition…"** while the model compiles; afterwards the
  model loads from cache and both messages are skipped.
- Errors (mic denied, model failed to load, …) appear highlighted in the bar
  and are announced assertively to screen readers.

## Command reference

Global (available everywhere):

| Say | Does |
| --- | --- |
| `stop listening` / `stop voice` | Ends the voice session |
| `what can I say` / `help` / `show help` | Opens an on-screen panel above the bar listing available commands, grouped most relevant first: the open dialog's, then the page's, then global |
| `close help` / `hide help` | Closes the help panel (the panel's × button works too) |
| `clear <field name>` | Empties the named text field (open dialog or page) and focuses it for re-dictation, e.g. "clear title" |
| `clear` | Empties the focused text field |
| `go to <page>` (also "open", "show") | Navigates: dashboard, medications, schedule, messages, health log, emergency, settings, profile |
| *any visible button's name* | Clicks that button (dialog first, then main content) |

Per page (`useVoiceCommands('screen', …)`):

| Page | Commands |
| --- | --- |
| Medications | `next/previous medication`, `take medication`, `snooze`, `filter <all/due/taken>`, `add medication` |
| Schedule | `day view` / `week view` / `month view`, `add appointment` |
| Health Log | `pain up/down`, `set pain to <0-10>`, `sleep up/down`, `mood <good/ok/low>`, `save entry` |
| Messages | `open <contact name>` (also `open conversation with <name>`; "doctor" matches "Dr."), `next/previous conversation`, `reply <message>` (drafts in one go), `reply` alone (focuses the composer for free dictation), `send`, `read aloud`, `back` |
| Emergency | `call 911`, `call caregiver`, `confirm` / `yes`, `cancel`, `end call` |
| Settings | `text size <standard/large/extra large>`, `reduced motion on/off` |
| Profile | `sign out` / `log out` |

Dialog scopes (registered only while the dialog is open, and matched before
screen commands):

| Dialog | Commands |
| --- | --- |
| Add medication | `name <text>`, `dose <text>`, `schedule <free text, e.g. twice daily>`, `time <label>` (also `time label <label>`), `instructions <text>`, `save`, `cancel` |
| New appointment | `title <text>`, `clinician <name>` (also `doctor <name>`), `location <place>`, `date <spoken date>`, `time <spoken time>`, `save`, `cancel` |

Spoken dates accept "today", "tomorrow", "next friday", "july 5", "the fifth
of july 2027". Spoken times accept "9 30 am", "noon", "half past" styles like
"nine thirty pm", "1 in the afternoon", and military "thirteen hundred"
(`src/lib/voice/spoken-datetime.ts`).

Emergency calls stay guarded: `call 911` performs only the **first** tap of
the two-step confirm; a separate `confirm` (or `yes`) is required within five
seconds, exactly like the touch flow, and the countdown can still be
cancelled by voice.

## Dispatch order

Every final transcript flows through `VoiceInputBar.handleFinal`
(`src/components/VoiceInputBar.tsx`):

1. **Registered commands** via the registry (`src/lib/voice/voice-registry.ts`),
   scope priority `dialog > screen > global`, longest matching phrase wins. A
   trailing `*` in a phrase captures the remainder as the command's value.
2. If a dialog is open: **dictation** into its focused text field, then dialog
   **buttons by accessible name**.
3. Otherwise: **dictation** into a focused main-content text field (e.g. the
   messages composer — focus it by hand or by saying "reply"), then
   **navigation keywords** (`src/lib/voice/navigation-keywords.ts`), then
   main-content **buttons by accessible name**. Dictation runs first so
   free-form speech is not hijacked by a navigation keyword it happens to
   contain; while a text field is focused, navigate by blurring it first or
   by tapping the nav.
4. No match: the bar shows `Heard: "…"` and suggests "what can I say".

Wildcard (`*`) captures keep the original spelling and punctuation of the
tail ("I'll be there") but drop trailing sentence punctuation added by
Whisper, so "Title Dental cleaning." fills the field with "Dental cleaning".
4. No match: the bar shows `Heard: "…"` and suggests "what can I say".

Feedback strings returned by command handlers are shown in the bar and
announced through the live region. The bar shows the live partial
transcript while an utterance is in flight and the last command's feedback
between utterances (the recognition hook clears its transcript after each
final result so feedback is never masked mid-session).

## Speech engine pipeline

```
mic (getUserMedia, 16 kHz mono)
  → AudioWorklet (pcm-worklet.js, raw PCM frames)
  → energy VAD (vad.ts — utterance starts >RMS 0.01, ends after 800 ms silence)
  → Web Worker (whisper-worker.ts, transformers.js ASR pipeline, q8 ONNX)
  → partial/final transcripts → useSpeechRecognition → VoiceInputBar
```

- `src/lib/speech/speech-recognition.ts` is the only module consumers touch;
  the engine behind it can change without touching any page.
- The worker and model are created lazily on first voice use and kept for the
  app's lifetime.
- While the model files download, the worker aggregates transformers.js
  per-file progress events into one 0–100 percent
  (`src/lib/speech/whisper/model-progress.ts`) and posts `progress` messages;
  they flow through the transcriber and engine to `useSpeechRecognition`'s
  `modelProgress`, which the voice bar renders as download/preparing status.
- COOP/COEP headers (set in `vite.config.ts` for dev/preview and
  `vercel.json` for production) make the origin cross-origin isolated,
  enabling SharedArrayBuffer so ONNX Runtime runs multi-threaded. If the
  headers are stripped, ORT silently falls back to a single thread — slower,
  but functional.

## Models: download, device selection, offline caching

`scripts/fetch-models.mjs` (run by `npm run models`, automatically before
`dev` and `build`) downloads **both** quantized models from the
`onnx-community` Hugging Face mirrors into `public/models/` (git-ignored),
plus the ONNX Runtime WASM files into `public/models/ort/`:

| Model | Size | Used by |
| --- | --- | --- |
| `whisper-tiny.en` | ~40 MB | Phones |
| `whisper-base.en` | ~85 MB | Laptops, desktops, unknown devices |

At runtime, `src/lib/speech/whisper/model-select.ts` picks the model from
`navigator.userAgentData.mobile` (with a UA-regex fallback and an iPadOS
touch-point check) — each browser downloads **only** its own model, on first
voice use. Remote model loading is disabled (`env.allowRemoteModels = false`),
so the app never calls huggingface.co at runtime.

Caching design (`vite.config.ts` workbox options):

- Models are **never precached** (`globIgnores: ['models/**']`) — visitors who
  never use voice download nothing.
- A `CacheFirst` runtime route caches `/models/**` in the `whisper-models`
  cache after the first voice use; voice then works fully offline.
- `vercel.json` serves `/models/**` as immutable with a 1-year max-age.

Dev-server note: Vite refuses to serve `public/` files as ES modules, but
onnxruntime-web *dynamically imports* its runtime (`.mjs`) from
`/models/ort/`. The `careconnect-serve-models` plugin in `vite.config.ts`
serves `/models/**` itself in dev (same approach as the desktop app).
Production builds are plain static hosting and unaffected.

## Testing

- **Unit/component (Jest)**: the voice libraries (`src/lib/voice/*`,
  `src/lib/speech/*`) are covered directly; `VoiceInputBar.test.tsx` covers
  every dispatch branch with a mocked recognition hook; each page test
  dispatches transcripts through `dispatchVoiceCommand` and asserts store/DOM
  effects. `whisper-worker.ts` is the only coverage exclusion — it runs only
  inside a worker with the WASM runtime and is exercised by e2e/manual runs.
- **E2E (Playwright, `e2e/voice.spec.ts`)**: CI has no microphone and cannot
  afford the model download, so tests inject transcripts through the
  documented seam — a `careconnect:voice-transcript` CustomEvent on
  `document` that VoiceInputBar routes through the full dispatch pipeline.
  The spec also checks Ctrl+Space wiring (asserting a graceful mic error) and
  that the mobile voice bar never overlaps the bottom navigation.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| "Microphone access was denied." | Grant mic permission in the browser's site settings; the app asks only when the mic button is first tapped. |
| "No microphone was found." | No input device (common in VMs/headless). Plug one in or check OS input settings. |
| "Speech model failed to load…" | `public/models/` missing (run `npm run models`) or the download was interrupted — the engine retries on the next utterance. |
| First transcription is slow | Expected: the model (~40–85 MB) downloads and compiles on first voice use — the bar shows "Downloading voice model… N%" then "Preparing voice recognition…" — then loads from cache. |
| Slow transcription on every use | Check `crossOriginIsolated === true` in the console; if false, COOP/COEP headers are being stripped and ORT is single-threaded. |
| Voice unavailable offline before first use | The model is cached only after the first voice use online; use voice once while connected. |
| Short silences transcribed as "you"/"thank you" | Known Whisper hallucination on near-silent audio; harmless — no command matches. |
