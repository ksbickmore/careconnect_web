# CareConnect Web

CareConnect Web is the responsive browser port of the local CareConnect desktop
and Expo applications. The desktop app is the functional source of truth, the
Expo app guides narrow-screen behavior, and the local `.figma` exports guide
the visual system.

The app is a complete, installable Progressive Web App: all nine views are
functional, work offline, and are fully keyboard accessible. Data is stored
only on the device — there is no server.

Live site: <https://careconnect-web-tau.vercel.app/>

## Current Features

- Public landing page and accessible sign-in form.
- Prefilled demo credentials and guest access; no server or real account is
  required. Guarded routes are preserved through sign-in.
- Responsive desktop/tablet sidebar and mobile bottom navigation.
- Dashboard summaries derived live from the medication, schedule, message, and
  health-log stores.
- **Medications** — master–detail list with Today/Completed groups, All/Due/
  Taken filter tabs, arrow-key list navigation, two-step "Confirm taken",
  snooze, and an add-medication dialog.
- **Schedule** — Day/Week/Month calendar views (Month is a real `<table>`),
  appointment detail dialog with two-step "Set reminder", and a
  new-appointment dialog with native date/time inputs.
- **Messages** — split-pane care-team chat that collapses to a drill-in
  single pane on mobile, with focus management on pane changes.
- **Health Log** — large `[−] value [+]` step controls for pain and sleep
  (no sliders or typing required), mood chips, paginated history, and
  plain-text export.
- **Emergency** — oversized 911 and caregiver targets, each guarded by a
  two-step confirm plus a cancellable countdown (`role="alertdialog"`).
- **Profile** and **Settings** — account overview, care team, persisted text
  size (100/115/130%), reduce motion, and a demo-data reset.
- Semantic landmarks, route focus management, live announcements, focus-trapped
  dialogs, reduced motion support, and keyboard-visible focus styles. See
  [docs/accessibility.md](docs/accessibility.md) for the full documentation.
- Installable PWA: service worker with a precached app shell, offline support,
  an update prompt on new deployments, and an offline banner.
- **Voice commands** — persistent voice bar with a fully local Whisper
  speech-to-text engine (no audio leaves the device), per-page commands,
  dialog dictation, and read-aloud. See [docs/voice.md](docs/voice.md).

## Requirements

- Windows 10 or newer
- Node.js 22.12 or newer
- npm 10 or newer

Use PowerShell for all commands.

## Local Setup

```powershell
npm install
npm run dev
```

Open the local address printed by Vite, normally `http://localhost:5173`.

Demo credentials are prefilled on `/login`:

```text
Email: demo@careconnect.app
Password: demo1234
```

Any non-empty email and password work in this local-only demo. Passwords are
never saved. Select **Continue as guest** to open the dashboard without an
email address.

## Commands

```powershell
npm run clean        # Remove generated build, test, and tool outputs
npm run dev          # Start the local development server
npm run build        # Type-check and create a production build (includes the service worker)
npm run preview      # Preview the production build locally
npm run typecheck    # Run TypeScript checks
npm run lint         # Run code and accessibility lint rules
npm test             # Jest: unit, component, and axe checks
npm run test:coverage # Jest with coverage (75% global thresholds enforced)
npm run e2e          # Playwright end-to-end tests (builds and previews first)
npm run e2e:ui       # Playwright interactive UI mode
npm run icons        # Regenerate PNG app icons from the source SVG
npm run models       # Download the local Whisper models into public/models (also runs pre-dev/build)
```

## Testing

Three layers, per the project requirements:

| Layer | Tool | Where |
| --- | --- | --- |
| Unit | Jest | `src/data/*.test.ts`, `src/lib/*.test.ts(x)` |
| Component | Jest + React Testing Library | `src/components/*.test.tsx`, `src/pages/*.test.tsx`, `src/App.test.tsx` |
| End-to-end | Playwright (Desktop Chrome + Pixel 7 profiles) | `e2e/*.spec.ts` |

- Coverage thresholds (75% lines/branches/functions/statements) are enforced in
  `jest.config.mjs`; the suite currently sits well above them.
- Every page has an automated axe accessibility check.
- The Playwright suite runs against the production build (`vite preview`) so
  the offline/service-worker spec exercises the real PWA, and includes pure
  keyboard-only journeys.

## Routes

| Route | Status |
| --- | --- |
| `/` | Public landing page |
| `/login` | Demo sign-in and guest access |
| `/dashboard` | Daily overview derived from all stores |
| `/medications` | Medication list, filters, dose logging, add dialog |
| `/schedule` | Day/Week/Month calendar and appointment dialogs |
| `/messages` | Split-pane care-team chat |
| `/health-log` | Step-control entry form, history, export |
| `/emergency` | Two-step guarded emergency calling (simulated) |
| `/profile` | Account, care team, preferences link, sign out |
| `/settings` | Text size, reduce motion, demo-data reset |

Authenticated routes redirect signed-out visitors to `/login` and return them
to the requested page after sign-in. The app uses `BrowserRouter`; on Vercel,
`vercel.json` rewrites unknown paths to `index.html`.

## Demo Data

All feature data is seeded locally and persisted under `careconnect:web:v1:*`
localStorage keys (medications, appointments, health-log, messages, settings).
Use **Settings → Reset demo data** to restore the original examples, or clear
the keys manually:

```javascript
Object.keys(localStorage)
  .filter((key) => key.startsWith('careconnect:web:v1:'))
  .forEach((key) => localStorage.removeItem(key));
location.reload();
```

No data is sent over the network.

## Accessibility

CareConnect targets WCAG 2.1 AA. Automated checks cover landmarks, headings,
labels, navigation state, route focus, live regions, two-step confirmations,
keyboard operation, reduced motion, and axe rules on every page.

Full documentation — semantic HTML inventory, keyboard map, ARIA inventory,
and focus-management behavior — lives in
[docs/accessibility.md](docs/accessibility.md).

## PWA

- `manifest.webmanifest`, theme metadata, Apple mobile metadata, and 192px,
  512px, and maskable icons.
- Service worker generated by `vite-plugin-pwa` (Workbox `generateSW`): the
  app shell and all static assets are precached, and SPA navigations fall back
  to the cached `index.html`, so every view works offline.
- Updates use `registerType: 'prompt'`: when a new deployment is available, a
  banner offers **Reload now** (see `src/components/ReloadPrompt.tsx`).
- An offline banner (`src/components/OfflineBanner.tsx`) announces connectivity
  changes; all data is on-device, so nothing is ever stale.
- `vercel.json` serves `sw.js` with `max-age=0, must-revalidate` so deployments
  are picked up promptly, and rewrites deep links to `index.html`.
- When a real backend is added, the service worker strategy should move to
  Workbox `injectManifest` with the network-first API caching described in
  `web_app_plans_patterns.md`.

## Voice Commands

The desktop app's fully local voice system is ported to the web app: a
persistent voice bar (visible on every authenticated page), speech-to-text via
a local Whisper model, a per-page voice command registry, dialog dictation,
and read-aloud via the browser's speech synthesis.

- **Engine** — OpenAI Whisper running entirely in the browser
  (`@huggingface/transformers` + ONNX Runtime WASM in a Web Worker). No audio
  ever leaves the device; the Web Speech API was deliberately not used because
  Chrome's implementation streams audio to Google's servers.
- **Models** — `npm run models` (runs automatically before `dev` and `build`)
  downloads two quantized models into `public/models/`: `whisper-tiny.en`
  (~40 MB, phones) and `whisper-base.en` (~85 MB, laptops/desktops). Each
  browser detects its device class at runtime and downloads **only** its model,
  on first voice use — never on page load.
- **Usage** — tap the mic in the bottom bar or press **Ctrl+Space**, then speak
  a command ("go to medications", "add appointment", "set pain to seven") or
  say **"what can I say"** for the commands available on the current page.
- **Offline** — the model is cached by the service worker after the first
  voice use, so voice keeps working offline afterwards.

The full command reference, architecture, and troubleshooting guide live in
[docs/voice.md](docs/voice.md).
