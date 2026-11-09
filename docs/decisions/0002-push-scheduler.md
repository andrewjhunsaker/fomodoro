# 2. Push scheduler: pg_cron every second, behind an interface

**Status:** Accepted · 2026-11-08

**Context:** iOS suspends PWA JavaScript in the background, so block-end alerts must come from server-sent Web Push at the right time (target: p95 within ±2 s). We're on Supabase's free tier.

**Decision:** A `pg_cron` job runs every second, finds due rows in `scheduled_pushes`, and calls the push-sender Edge Function only when some are due. The app only knows `schedulePush` / `cancelPush`.

**Consequences:** Cheap and simple, but less standard than a delayed-delivery queue. Latency is measured from day one; if p95 misses ±2 s, replace the scheduler with Cloudflare Durable Object alarms behind the same interface.
