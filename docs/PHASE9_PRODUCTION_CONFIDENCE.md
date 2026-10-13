# Phase 9 production confidence

This phase hardens existing push and household Realtime paths without changing product behavior.

## Automated coverage

- Local reminder-delivery integration tests cover personal ownership, multi-device subscriptions, timezone and calendar offsets, duplicate claims, completion/skip/pause/disabled suppression, and household isolation.
- Service-worker tests cover safe notification routes, existing-window focus, new-window opening, and malformed/external URL fallback.
- Realtime provider tests cover household invalidation, local-mutation protection, category tables, cleanup, and one bounded refresh after reconnect.

## Manual production checks

### Scheduled push

1. On an installed device, create or choose a chore due today and enable one due-date reminder about ten minutes ahead.
2. Background or close Tandem and wait for the normal five-minute cron scan.
3. Confirm each enabled device for that user receives one notification. A user with two enabled devices should receive one on each device.
4. Repeat with a second household member completing the occurrence before the reminder time. Confirm neither device receives a notification.

### Notification tap

1. Leave a Tandem tab or installed PWA window open.
2. Tap a scheduled reminder and confirm Tandem focuses and opens the target chore.
3. Repeat after closing Tandem and confirm it opens Tandem at that chore.

### Two-user Realtime

1. Sign into the same household on two devices or browser profiles.
2. Complete, undo, and reschedule an occurrence on the first device; confirm the second updates without manual reload.
3. Change a chore schedule and check a Category subtask on the first device; confirm the second reflects both changes.
4. Background the second device briefly, return it to the foreground, then make one more change on the first device. Confirm it refreshes to current household state.
