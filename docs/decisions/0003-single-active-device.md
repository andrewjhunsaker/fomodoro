# 3. One active device with handoff

**Status:** Accepted · 2026-11-08

**Context:** Notifying every signed-in device at once is noisy; controlling the timer from several devices invites conflicts.

**Decision:** Exactly one active device controls the running cycle and receives pushes. Other devices show a read-only countdown and "Take over here?". Offline, the device in hand keeps control; on reconnect, a takeover that happened meanwhile wins.

**Consequences:** Needs `active_cycle.active_device_id`, versioned writes, and Realtime. Simpler mental model; fewer duplicate alerts.
