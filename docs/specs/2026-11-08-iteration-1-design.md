# Fomodoro — Iteration 1 Design Spec

- **Status:** Draft for review
- **Date:** 2026-11-08
- **Owner:** Andrew (sole user, reviewer, and merger)

## 1. Goal and scope

A personal Pomodoro timer, installable as a PWA on iPhone and Mac, with no Apple developer fee. The timer works signed out using the standard defaults. Signing in unlocks custom durations, notifications, and handing the running timer between devices.

**In scope**

- Pomodoro cycle: focus blocks, short breaks, long breaks, all with configurable durations (signed in).
- Signed-out mode using defaults only.
- Sign in with an email 6-digit code or Google; optional TOTP 2FA with a backup authenticator.
- Settings tied to the account and synced.
- Push notifications at block end, delivered to the active device only.
- One active device at a time, with handoff ("Take over here?").
- Offline use with local control and reconciliation on reconnect.
- Install button (native prompt on Chromium, instruction sheet on Safari/iOS).
- Floating mini timer on Chromium desktop (Document Picture-in-Picture).

**Out of scope (later iterations)**

- Task lists and physical-activity tasks (iteration 2); camera accountability; AI task planning; Claude integration.
- Stats and history, streaks, custom sounds, themes.
- Capacitor native wrapper (would add native local notifications and Live Activities).
- Visual regression testing; full cross-browser e2e on every PR.

## 2. Success criteria

| Criterion         | Target                                                    | How it's measured                                                       |
| ----------------- | --------------------------------------------------------- | ----------------------------------------------------------------------- |
| Push timeliness   | p95 delivery within ±2 s of block end                     | Server `sent_at` and service-worker `received_at` vs `fire_at` (see §6) |
| Timer correctness | Display correct immediately after resume, wake, or reopen | Engine derives remaining time from timestamps; property tests           |
| Offline           | Full timer control with no network                        | Playwright offline e2e                                                  |
| Accessibility     | WCAG 2.2 AA                                               | axe in component and e2e tests; manual keyboard and VoiceOver check     |
| Performance       | LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 on iPhone            | Lighthouse on preview deploys                                           |

## 3. Functional requirements

### 3.1 Timer

- A **cycle** is N focus blocks, each followed by a short break, except the Nth, which is followed by a long break. Then the cycle repeats.
- **Defaults:** focus 25 min, short break 5 min, long break 15 min, long break every 4 focus blocks, auto-start breaks on, auto-start focus off.
- **Controls:** Start / Pause / Resume (primary), Reset (returns to the start of the current block, idle), Skip (ends the current block and moves to the next).
- When a block ends: a chime plays if the app is visible, a notification fires (see §3.5), and the next block starts automatically or waits, according to the auto-start settings.
- Settings changed mid-block apply from the next block. Remaining scheduled pushes are recomputed.
- Remaining time is always derived from stored timestamps (`endsAt`, or `remainingMs` when paused), never from counting ticks.
- Optional Screen Wake Lock while a block runs (setting, default off).

### 3.2 Signed-out mode

- Defaults only. No settings screen beyond sign-in and install.
- Timer state lives on the device only.
- Notifications: local `Notification` only, and only while the app is open (foreground or background tab). No server push.
- No sync, no handoff.

### 3.3 Accounts and authentication (Supabase Auth)

- **Email 6-digit code (OTP).** The code field accepts paste and uses `autocomplete="one-time-code"`. Resend is available after 60 s. No magic links (they open Safari, not the installed PWA).
- **Google sign-in.** Must be verified in the installed iOS PWA by a spike before it ships (see §10).
- **Optional TOTP 2FA**, enrolled in Settings. The user is prompted to enroll a second authenticator as a backup. If both are lost, recovery is manual through the Supabase dashboard.
- Sign-out removes this device's push subscription and device record.

### 3.4 Settings (signed in only)

| Setting                      | Range                        | Default |
| ---------------------------- | ---------------------------- | ------- |
| Focus length                 | 1–90 min                     | 25      |
| Short break                  | 1–30 min                     | 5       |
| Long break                   | 5–60 min                     | 15      |
| Long break every             | 2–8 focus blocks             | 4       |
| Auto-start breaks            | on/off                       | on      |
| Auto-start focus             | on/off                       | off     |
| Sound                        | on/off                       | on      |
| Keep screen on while running | on/off                       | off     |
| Notifications on this device | on/off (requests permission) | off     |

- Durations are changed with steppers, not free-typed numbers.
- Stored server-side, one row per user, last write wins by `updated_at`.

### 3.5 Notifications (signed in)

- When the user starts a cycle, the client sends the block-end times to the server through `schedulePush`. Pause, skip, reset, settings changes, and handoff call `cancelPush` and reschedule.
- Pushes go to the **active device only**.
- Pushes are sent with high urgency and a 60 s TTL. Any push more than 60 s past `fire_at` is marked expired and not sent.
- Every push shows a visible notification; this is required to keep push permission on Safari.
- Local and push notifications share a `tag` so a block end never shows twice.
- On iPhone, push requires the PWA to be installed. Turning notifications on in iOS Safari leads into the install sheet first.
- If permission is denied, the app falls back to in-app alerts and explains how to enable notifications in Settings, without nagging.

### 3.6 Devices and handoff (signed in)

- Exactly one **active device** holds control of the running cycle and receives pushes.
- Other signed-in devices show a **read-only countdown** with a banner: "Timer running on {device}. Take over here?"
- **Take over** makes the current device active, moves scheduled pushes to it, and turns the previous device into a read-only viewer.
- Changes reach open devices through Supabase Realtime.
- Each device has a label (defaulting to the platform, e.g. "iPhone", "Mac · Chrome"), editable in Settings.

### 3.7 Offline

- The device in hand keeps full control while offline. Actions apply locally at once.
- A quiet "Not synced" indicator appears in the header and in Settings.
- On reconnect, the local state is uploaded and pushes are rescheduled. **Exception:** if another device took over after this device went offline, the server state wins and the user sees "Control moved to {device} while you were offline."
- Known v1 gap: a push scheduled before an offline pause can still arrive within its TTL after reconnecting.

### 3.8 Install

- If the app is already running standalone (`display-mode: standalone` or `navigator.standalone`), no install button is shown.
- Chromium: the button triggers the deferred `beforeinstallprompt`.
- iOS Safari: the button opens a sheet with "Share → Add to Home Screen" steps.
- macOS Safari: the button opens a sheet with "File → Add to Dock" steps.

### 3.9 Mini timer (Chromium desktop)

- A button opens a Document Picture-in-Picture window showing the ring, time, block name, and Pause/Skip.
- The button is hidden when the API isn't available (Safari, iOS).
- Brave support is verified by a spike (see §10).

## 4. UX and visual design

Principles are in `docs/learning/ux-primer.pdf`. The binding rules are:

- **One screen, one primary action.** Start/Pause/Resume is the only prominent control. Reset and Skip are secondary; settings sit behind one gear icon.
- **Status at a glance.** Progress ring, large tabular digits, the block name as text, cycle dots (e.g. ●●○○), and "Next: short break, 5 min". Remaining time also appears in the document title.
- **Ambient color by mode.** Warm tint during focus, cool tint during breaks, with separate light and dark palettes. Color is never the only signal; the block name is always shown.
- **Calm tone.** Gentle chime, short notification copy, no streaks or guilt.
- **Accessibility.** WCAG 2.2 AA contrast; touch targets ≥ 44 pt (Apple's default control size, adopted here as our minimum; HIG's own minimum is 28 pt); full keyboard support (Space = start/pause); block changes announced through an ARIA live region; honors `prefers-reduced-motion` and `prefers-color-scheme`.
- Built with Tailwind and shadcn/ui; colors and spacing defined as design tokens.

## 5. Architecture

**Client (React + Vite + TypeScript + vite-plugin-pwa)**

| Unit      | Responsibility                                                                                                  | Depends on              |
| --------- | --------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `engine/` | Pure TS state machine: state, actions, derived remaining time, block plan. No React, no I/O. Time is passed in. | nothing                 |
| `store/`  | Thin Zustand store wrapping the engine; persists timer state locally                                            | engine                  |
| `sync/`   | Device registration, handoff, offline queue, reconciliation (pure merge function + Realtime adapter)            | engine, Supabase client |
| `push/`   | `schedulePush` / `cancelPush` interface; Supabase implementation                                                | Supabase client         |
| `ui/`     | Screens and components                                                                                          | store                   |
| `sw/`     | Service worker: offline caching, push display, receipt telemetry                                                | —                       |

**Engine interface (sketch)**

```ts
type Mode = 'focus' | 'shortBreak' | 'longBreak';
type Status = 'idle' | 'running' | 'paused';

interface TimerState {
  status: Status;
  mode: Mode;
  focusIndex: number;        // 0-based position within the cycle
  endsAt: number | null;     // epoch ms, set while running
  remainingMs: number;       // authoritative while paused or idle
  version: number;           // increments on every action, used for sync conflicts
}

start(state, settings, now): TimerState
pause(state, now): TimerState
resume(state, now): TimerState
skip(state, settings, now): TimerState
reset(state, settings): TimerState
advance(state, settings, now): TimerState    // applies any block ends that passed while away
remaining(state, now): number
plan(state, settings, now): { mode: Mode; endsAt: number }[]   // upcoming block ends for scheduling
```

**Server (Supabase)**

- Auth, Postgres with row-level security, Realtime.
- `schedule_cycle(device_id, version, block_ends)` — a database function that, in one transaction, cancels the user's pending pushes and inserts the new ones.
- Scheduler: a `pg_cron` job every second that finds due pushes and, only when there are any, calls the push-sender Edge Function.
- Push sender (Edge Function): sends Web Push with VAPID; on `404`/`410` deletes the stale subscription; records `sent_at`.
- **Fallback:** if measured p95 latency exceeds ±2 s, swap the scheduler for Cloudflare Durable Object alarms behind the same `schedulePush`/`cancelPush` interface.

**Hosting:** Cloudflare Pages, with a preview deploy for each PR.

## 6. Data model

All tables have RLS enabled with policies limiting every row to `user_id = auth.uid()`.

| Table              | Columns                                                                                                                                                          | Notes                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `settings`         | `user_id` PK, `focus_min`, `short_break_min`, `long_break_min`, `long_break_every`, `auto_start_breaks`, `auto_start_focus`, `sound`, `keep_awake`, `updated_at` | Created on first sign-in with defaults                                  |
| `devices`          | `id` PK, `user_id`, `label`, `platform`, `push_endpoint`, `push_p256dh`, `push_auth`, `last_seen_at`, `created_at`                                               | Push fields are null if notifications are off on that device            |
| `active_cycle`     | `user_id` PK, `active_device_id`, `status`, `mode`, `focus_index`, `ends_at`, `remaining_ms`, `version`, `updated_at`                                            | One row per user; Realtime-enabled                                      |
| `scheduled_pushes` | `id` PK, `user_id`, `device_id`, `cycle_version`, `fire_at`, `kind`, `title`, `body`, `status` (pending/sent/cancelled/expired/failed), `sent_at`, `received_at` | `received_at` is reported by the service worker for latency measurement |

- Writes to `active_cycle` include the expected `version`; a mismatch means another device changed it first, and the client reloads state.
- All timestamps come from the server clock. Each client measures its offset from server time on sync and corrects for it.

## 7. Edge cases

| Situation                           | Behavior                                                                      |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| Two devices act at once             | Optimistic concurrency on `version`; the first write wins, the second reloads |
| Device clocks differ                | Server time is authoritative; clients correct by measured offset              |
| Offline actions                     | Local control; sync on reconnect; takeover-while-offline wins (§3.7)          |
| Supabase down or paused             | Timer keeps working locally; "Not synced" indicator                           |
| Scheduler late                      | Pushes > 60 s past `fire_at` are expired, not sent                            |
| Duplicate local + push notification | Shared `tag` dedupes                                                          |
| Stale push subscription             | `404`/`410` from push service deletes it                                      |
| Notifications denied                | In-app alerts only; Settings explains how to enable                           |
| Settings changed mid-block          | Applies next block; pushes rescheduled                                        |
| Mac sleeps or tab hidden            | On `visibilitychange`, `advance()` recomputes from timestamps                 |
| Wrong or expired code               | "That code didn't work. Send a new one." 60 s resend cooldown                 |
| Lost 2FA device                     | Backup authenticator; otherwise manual reset in Supabase dashboard            |
| Sign out                            | Device's push subscription and device row removed                             |

## 8. Testing strategy

| Layer                 | Scope                                                                              | Tools                                                                                |
| --------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Static                | Types, lint (incl. no `.skip`/`.only`)                                             | TypeScript, ESLint + Vitest plugin                                                   |
| Engine                | All transitions, wraparound, mid-block settings changes, `advance` after long gaps | Vitest, TDD with injected time, fast-check property tests, **Stryker mutation gate** |
| Sync                  | Takeover, offline/reconnect, takeover-while-offline, version conflicts             | Vitest on the pure merge function                                                    |
| Database              | RLS isolation between users; `schedule_cycle` atomicity; expiry rule               | Local Supabase in Docker, run in CI                                                  |
| Components            | Visible behavior; accessibility                                                    | Testing Library, axe                                                                 |
| End-to-end (Chromium) | Signed-out cycle; email-code sign-in; two-context handoff; offline                 | Playwright with fake clock; local Supabase mail capture                              |
| Push                  | Sender, expiry, always-show rule in the service worker                             | Vitest with a mocked push service                                                    |
| Real device (manual)  | Installed iPhone PWA; Mac mini timer; push latency                                 | Checklist on preview deploys; p50/p95 latency query                                  |

Tests follow the no-test-weakening policy: changes to existing tests require the `test-change-approved` label (§9).

## 9. Process and quality gates

The working process lives in `docs/process/PDLC.md` (80-line cap). Gates for every PR:

- Blocking: typecheck, lint, unit + component tests, build, Playwright e2e (Chromium), Stryker score not below `main`, test-integrity check, dependency and secret scanning (gitleaks).
- Advisory: AI review (Claude Code GitHub Action); PR size warning above ~400 changed lines.
- Each PR opens with test-only commits that fail in CI before implementation commits.
- Branch protection on `main`; only Andrew merges.
- Agent guardrails: `AGENTS.md` (imported by `CLAUDE.md`), `.claude/settings.json` permissions and hooks (block dangerous git, guard edits to existing tests, lint on edit, tests on stop), project plugin allowlist (superpowers + engineering).

## 10. Risks and spikes (before or during the first issues)

| Risk                                                                        | Spike                                | If it fails                                  |
| --------------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------- |
| Google sign-in redirect may land in Safari instead of the installed iOS PWA | Throwaway test on Andrew's iPhone    | Ship email code only; revisit Google later   |
| Document PiP may be disabled in Brave                                       | Open a PiP window in Brave           | Mini timer is Chrome-only; note it in the UI |
| Per-second `pg_cron` on the free tier may be unreliable or costly           | Run the scheduler for a day, measure | Switch to Cloudflare Durable Object alarms   |
| Push latency may miss ±2 s                                                  | Latency telemetry from day one       | Same fallback as above                       |
| Free Supabase project pauses after 7 days idle                              | —                                    | Daily use prevents it; accept                |
