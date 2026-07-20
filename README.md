# CareConnect Web

CareConnect Web is the responsive browser port of the local CareConnect desktop
and Expo applications. The desktop app is the functional source of truth, the
Expo app guides narrow-screen behavior, and the local `.figma` exports guide
the visual system.

This first milestone includes a public landing page, demo sign-in, a responsive
authenticated shell, a functional dashboard, local demo data, and route
foundations for the remaining care features.

## Current Features

- Public landing page and accessible sign-in form.
- Prefilled demo credentials and guest access; no server or real account is
  required.
- Responsive desktop/tablet sidebar and mobile bottom navigation.
- Dashboard summaries for medications, pain, sleep, schedule, and messages.
- Two-step medication confirmation that persists in localStorage.
- Protected route placeholders for Medications, Schedule, Messages, Health Log,
  Emergency Help, Profile, and Settings.
- Semantic landmarks, route focus management, live announcements, reduced
  motion support, and keyboard-visible focus styles.
- PWA manifest and app icons. Offline caching and service-worker registration
  are intentionally deferred to a later milestone.

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

Any non-empty email and password work in this local-only milestone. Passwords
are never saved. Select **Continue as guest** to open the dashboard without an
email address.

## Commands

```powershell
npm run clean        # Remove generated build, test, and tool outputs
npm run dev          # Start the local development server
npm run build        # Type-check and create a production build
npm run preview      # Preview the production build locally
npm run typecheck    # Run TypeScript checks
npm run lint         # Run code and accessibility lint rules
npm test             # Run component, data, route, and axe checks
npm run test:coverage
npm run icons        # Regenerate PNG app icons from the source SVG
```

## Routes

| Route | Status |
| --- | --- |
| `/` | Public landing page |
| `/login` | Demo sign-in and guest access |
| `/dashboard` | Functional responsive dashboard |
| `/medications` | Routed placeholder |
| `/schedule` | Routed placeholder |
| `/messages` | Routed placeholder |
| `/health-log` | Routed placeholder |
| `/emergency` | Routed placeholder |
| `/profile` | Routed placeholder |
| `/settings` | Routed placeholder |

Authenticated routes redirect signed-out visitors to `/login`. The app uses
`BrowserRouter`, so a future public web server must rewrite unknown application
paths to `index.html`.

## Demo Data

Dashboard data is seeded locally and medication confirmations are stored under
the `careconnect:web:v1:dashboard` localStorage key. To restore the original
demo data, run this in the browser console and reload:

```javascript
localStorage.removeItem('careconnect:web:v1:dashboard');
location.reload();
```

No data is sent over the network.

## Accessibility

CareConnect targets WCAG 2.1 AA. Current checks cover landmarks, headings,
labels, navigation state, route focus, live regions, two-step confirmations,
keyboard operation, reduced motion, and automated axe rules. 

## PWA Status

`manifest.webmanifest`, theme metadata, Apple mobile metadata, and 192px,
512px, and maskable icons are present. A service worker, offline data cache,
background sync, install prompt, and push notifications are not implemented
yet.
