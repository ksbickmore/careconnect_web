# CareConnect Web — Accessibility Documentation

CareConnect serves patients with severe Carpal Tunnel Syndrome: cognition is
intact, but typing and precise pointing are painful. Every design decision
below follows from that — large targets, no sliders, no typing where a button
works, two-step confirms for consequential actions, and full keyboard
operation.

Target: **WCAG 2.1 AA**. Every page has an automated axe check
(`src/pages/*.test.tsx`, `src/App.test.tsx`), and the Playwright suite
includes pure keyboard-only journeys (`e2e/keyboard.spec.ts`).

Contents:

1. [Semantic HTML](#1-semantic-html)
2. [Keyboard navigation](#2-keyboard-navigation)
3. [ARIA roles and labels](#3-aria-roles-and-labels)
4. [Focus management](#4-focus-management)

---

## 1. Semantic HTML

### Landmark structure

Public pages (`/`, `/login`):

| Landmark | Element | Notes |
| --- | --- | --- |
| `banner` | `<header>` | Brand + sign-in link |
| `navigation` | `<nav aria-label="Public">` | Landing page only |
| `main` | `<main>` | One per page |
| `contentinfo` | `<footer>` | Landing page only |

Authenticated shell (`src/layout/AppShell.tsx`), identical on every app page:

| Landmark | Element | Notes |
| --- | --- | --- |
| `banner` | `<header>` | Brand link, profile link, sign out |
| `complementary` | `<aside aria-label="CareConnect navigation panel">` | Desktop sidebar |
| `navigation` | `<nav aria-label="Primary">` | Sidebar links with badge counts |
| `navigation` | `<nav aria-label="Account and safety">` | Settings + Emergency |
| `main` | `<main id="main-content" tabindex="-1">` | Skip-link target |
| `navigation` | `<nav aria-label="Primary mobile">` | Bottom nav, ≤767px |

### Heading outline

Every route renders exactly one `<h1>` (with `tabindex="-1"` for route focus,
see §4). Sections use `<h2>` and are bound to their region with
`aria-labelledby`, so screen-reader users can navigate by both headings and
regions. Examples:

- `/medications` — h1 "Medications"; h2 "Today", "Completed" (list groups)
- `/health-log` — h1 "Health Log"; h2 "New entry", "Recent entries"
- `/settings` — h1 "Settings"; h2 "Display", "Demo data"

### Element choices

| Content | Element | Where |
| --- | --- | --- |
| Stat summaries | `<dl>/<dt>/<dd>` | Dashboard stats, medication details, appointment details, profile account |
| Item collections | `<ul>/<li>` | Medication list, appointment list, conversation list, message bubbles, contacts |
| Month calendar | `<table>` with `<caption>` and `<th scope="col">` | `/schedule` Month view |
| Forms | `<form>` + `<label htmlFor>` per control | Login, add medication, new appointment, health entry, composer |
| Grouped inputs | `<fieldset>/<legend>` | Text size radios, mood chips |
| Native pickers | `<input type="date">`, `<input type="time">` | New appointment (keyboard-accessible by default) |
| Actions | `<button type="button">` — never clickable divs | Everywhere |
| Threads | `<article>` | Message thread pane |

---

## 2. Keyboard navigation

### Global

| Key | Action |
| --- | --- |
| `Tab` / `Shift+Tab` | Move through interactive elements. The **skip link** is the first focusable element on every authenticated page. |
| `Enter` | Activate links and buttons; submit forms from a text field |
| `Space` | Activate buttons, toggle checkboxes/radios |
| `Escape` | Close any open dialog, or cancel the emergency countdown |

### Per-widget keyboard maps

**Dialog** (`src/components/Dialog.tsx` — add medication, appointment detail,
new appointment):

| Key | Action |
| --- | --- |
| `Tab` | Cycles inside the dialog; wraps last → first |
| `Shift+Tab` | Wraps first → last |
| `Escape` | Closes; focus returns to the opening control |

**Filter tabs** (`src/components/FilterTabs.tsx` — All/Due/Taken,
Day/Week/Month). Roving tabindex: only the active tab is in the Tab order.

| Key | Action |
| --- | --- |
| `ArrowRight` / `ArrowLeft` | Move focus **and** selection; wraps at the ends |
| `Home` / `End` | First / last tab |

**Step control** (`src/components/StepControl.tsx` — pain, sleep):

| Key | Action |
| --- | --- |
| `ArrowUp` / `ArrowRight` | Increment (clamped at max) |
| `ArrowDown` / `ArrowLeft` | Decrement (clamped at min) |

The large `[−]`/`[+]` buttons offer the same actions for pointer users.

**Lists** (`src/lib/use-arrow-list.ts` — medication list, conversation list).
Roving tabindex: one item in the Tab order, so `Tab` exits the list in one
press.

| Key | Action |
| --- | --- |
| `ArrowDown` / `ArrowUp` | Next / previous item (clamped) |
| `Home` / `End` | First / last item |

**Two-step confirm** (`src/components/TwoStepConfirm.tsx` — confirm taken,
set reminder, emergency call): activate once to arm ("Tap again to confirm"),
activate again within 5 seconds to confirm; the armed state times out back to
safe. Works identically with `Enter`, `Space`, tap, or click.

**Emergency countdown** (`src/components/EmergencyCountdown.tsx`): focus is
held on the **Cancel call** button; `Escape` or `Enter`/`Space` on Cancel
aborts the call.

**Paginated history** (`src/components/PaginatedList.tsx`): Previous/Next are
plain buttons — no infinite scroll anywhere in the app.

---

## 3. ARIA roles and labels

### Roles in use

| Role | Where | Why |
| --- | --- | --- |
| `dialog` + `aria-modal="true"` | `Dialog.tsx` | Modal add/detail forms |
| `alertdialog` + `aria-modal="true"` | `EmergencyCountdown.tsx` | Interrupting, time-critical countdown |
| `tablist` / `tab` / `tabpanel` | `FilterTabs.tsx` + page panels | Filter switchers with `aria-selected` and `aria-controls` |
| `spinbutton` | `StepControl.tsx` | Numeric reading with `aria-valuenow/min/max` |
| `status` (polite live region) | `LiveRegions.tsx`, offline banner, update banner, call status | Non-interrupting announcements |
| `alert` (assertive live region) | `LiveRegions.tsx`, form errors | Errors and emergency announcements |
| `group` | Page header blocks, fieldsets | Labelled grouping |

### Labels and states

- **Accessible names everywhere**: icon-only buttons carry `aria-label`
  ("Close dialog", "Increase Pain level", "Previous page"); decorative icons
  are `aria-hidden="true"`.
- `aria-current="page"` on the active nav link (set automatically by
  `NavLink`).
- `aria-pressed` on two-step confirm buttons (armed state) and on list items
  that open a detail panel (selected state).
- `aria-labelledby`/`aria-describedby` bind dialogs to their title and
  description; sections to their headings.
- Badge counts have full text alternatives:
  `aria-label="3 medications remaining"`, not just "3".
- Form fields use `htmlFor`/`id` pairs, `autoComplete` on login, and
  `aria-invalid` + `aria-describedby` for the login error; inline form errors
  use `role="alert"`.
- The two live regions (`role="status"` polite, `role="alert"` assertive) are
  rendered persistently by `LiveRegions.tsx` and fed by
  `src/stores/announcer-store.ts`. Polite: medication logged, entry saved,
  message sent, settings changed, offline/online. Assertive: emergency
  countdown started, call cancelled/connecting.

---

## 4. Focus management

**Route changes** — `AppShell` moves focus to the new page's `<h1
tabindex="-1">` on every navigation, so screen readers announce the new page
and keyboard users start at the top of the content
(`src/layout/AppShell.tsx`).

**Skip link** — first focusable element; jumps to `<main id="main-content"
tabindex="-1">`.

**Dialogs** (`Dialog.tsx`):

1. On open: focus moves to the first focusable control inside the panel.
2. While open: `Tab`/`Shift+Tab` are trapped and wrap within the dialog.
3. On close (Escape, close button, backdrop, or successful submit): focus
   returns to the element that opened the dialog.

**Emergency countdown** (`EmergencyCountdown.tsx`): opens with focus on
**Cancel call** — the safe action — and keeps it there (`Tab` is suppressed;
the alertdialog has a single control). The remaining time is announced
assertively **once** on open, not every second, so the countdown never drowns
out a screen reader. On close, focus returns to the arming button.

**Messages pane switch** (`MessagesPage.tsx`): opening a conversation moves
focus to the thread heading; the mobile **All conversations** back button
returns focus to the conversation-list heading. Both headings have
`tabindex="-1"`.

**Forms**: validation errors render as `role="alert"` adjacent to the form;
focus stays in the form so the user can correct and resubmit.

**Focus visibility**: a global 3px `:focus-visible` outline
(`src/styles/global.css`) on every interactive element; the skip link becomes
visible when focused.

**Reduced motion**: both the `prefers-reduced-motion` media query and the
Settings toggle (applied as a root class by `src/lib/use-apply-settings.ts`)
disable animations and transitions.

---

## Verification

- `npm test` — includes an axe run for every page and interaction tests for
  every widget's keyboard map.
- `npm run e2e` — keyboard-only journeys (skip link, dialog trap/restore,
  roving tabindex lists, tab arrows), mobile drill-in focus, and offline
  behavior against the production build.
- Manual checks: NVDA/Narrator walkthrough of the medication two-step confirm
  and emergency countdown; 320px-wide layout; 200% browser zoom.
