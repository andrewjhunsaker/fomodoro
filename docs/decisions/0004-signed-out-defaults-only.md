# 4. Signed-out mode uses defaults only

**Status:** Accepted · 2026-11-08

**Context:** Supporting custom settings while signed out means storing them locally and merging them into the account on first sign-in.

**Decision:** Signed out, the timer uses fixed defaults (25/5/15, long break every 4) with local notifications only. All settings belong to the account.

**Consequences:** No local-to-account merge logic or conflicts. Signed-out users can't customize; acceptable for a personal app.
