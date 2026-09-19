# TANDEM — Product & Engineering Blueprint
### Shared Chore Calendar PWA for Mallory + Nik
**Status:** Source of truth for Codex  
**Working title:** Tandem  
**Primary devices:** iPhone / Android phones, installed from the web as a PWA  
**Primary users:** Mallory and Nik  
**Architecture principle:** Shared cloud data first. No authoritative chore data stored only on-device.

---

# 0. HOW CODEX MUST USE THIS FILE

This file is the product specification, design system, architecture contract, and implementation plan for the project.

Codex must:

1. Read this file before making architectural decisions.
2. Treat the requirements in **NON-NEGOTIABLE RULES** as hard constraints.
3. Build the app in phases instead of generating the entire app in one uncontrolled pass.
4. Prefer shared components, shared tokens, and shared utility functions over repeated page-specific code.
5. Do not create one-off page headers, typography rules, spacing systems, colors, database access patterns, or recurrence logic.
6. Do not move authoritative app data into localStorage, IndexedDB, or another device-only store.
7. Keep Supabase Postgres as the source of truth for shared household data.
8. Keep security rules/RLS in place even though the first household only has two users.
9. Use TypeScript strictly. Avoid `any` unless there is a documented, unavoidable reason.
10. Keep the UI mobile-first.
11. Keep the visual system colorful, cozy, modern, playful, and gender-neutral enough to feel shared.
12. If a requirement is ambiguous, choose the simplest implementation that preserves the intent described in this file.
13. Do not silently replace an architectural requirement with an easier local-only shortcut.
14. When changing the design system later, change shared tokens/components rather than editing every page.

**IMPORTANT:** Page consistency is a first-class requirement, not polish to be added later.

---

# 1. PRODUCT SUMMARY

Tandem is a small shared household chore app for two people.

Mallory and Nik should each be able to install the app on their phone without publishing it to the Apple App Store or Google Play Store.

The app should let them:

- See what needs to be done today.
- See chores across the week.
- Create recurring chores.
- Choose the frequency of a chore.
- Choose the weekday(s) or recurrence rules for a chore.
- Manage chores as shared household responsibilities that either member may complete.
- Receive optional personal reminders.
- Mark chores complete.
- Instantly see when the other person completes something.
- Know who completed a chore and when.
- See chore completion history.
- Skip or reschedule a particular occurrence without destroying the recurring chore.
- Install the site to the phone Home Screen so it behaves like an app.

The app should feel like a pleasant shared home dashboard rather than a corporate productivity tool.

---

# 2. NON-NEGOTIABLE RULES

## 2.1 Shared cloud data is authoritative

The database must live in Supabase Postgres.

Chores, schedules, occurrences, completion state, household membership, reminders, and history must be available to both users.

When Mallory completes a chore, Nik's active app should update without requiring a manual page refresh, and vice versa.

### Allowed local data

Local/device storage may be used only for things that are naturally device-specific or ephemeral, such as:

- authentication/session persistence handled by Supabase
- temporary UI state
- an in-memory query cache
- notification subscription/device metadata where appropriate
- unsaved form state while the user is actively editing
- optional non-authoritative UI preferences

### Not allowed

Do NOT make any of the following local-only:

- chore definitions
- due dates
- completion state
- who completed something
- household membership
- reminder configuration
- activity history
- recurrence state

Do not make localStorage the application's database.

---

## 2.2 Every page uses the same page shell

No page is allowed to hand-code its own top header.

Every application page must be rendered inside the same shared page shell component.

Recommended API:

```tsx
<PageShell
  title="History"
  variant="root"
  actions={<HistoryFilterButton />}
>
  <HistoryContent />
</PageShell>
```

or:

```tsx
<PageShell
  title="Chore Details"
  variant="detail"
  backHref="/chores"
  actions={<MoreMenu />}
>
  <ChoreDetails />
</PageShell>
```

`PageShell` must own:

- safe-area spacing
- page background
- maximum content width
- horizontal page padding
- header height
- title typography
- title alignment
- leading/back-button slot
- action slot
- scrolling behavior
- bottom navigation spacing
- optional sticky content region
- standard vertical gap below the header

Pages provide content. Pages do not redefine page chrome.

---

## 2.3 Headers are locked globally

There may be two intentional header modes, both controlled by `PageShell`:

### Root page header
Used for:
- Home
- Calendar
- Chores
- History
- Household / Settings

Rules:
- identical title font
- identical title size
- identical title weight
- identical title line-height
- identical title left alignment
- identical header height
- identical top padding
- identical horizontal page padding

### Detail page header
Used for:
- Add Chore
- Edit Chore
- Chore Details
- Notification Settings
- Household Details
- future nested pages

Rules:
- back button is rendered by `PageShell`
- page title uses the exact same typography token everywhere
- action area is rendered by `PageShell`
- identical vertical alignment everywhere
- no detail page can override title font, title size, or header spacing

**There should be no page-specific `<h1>` CSS.**

---

## 2.4 Global design tokens only

Define global CSS variables/design tokens once.

Examples:

```css
:root {
  --font-sans: "Nunito Sans", system-ui, sans-serif;

  --page-bg: #f7f3ec;
  --surface: #fffdfa;
  --surface-muted: #f1eee8;
  --text-primary: #17231f;
  --text-secondary: #66706c;

  --brand: #16735f;
  --brand-strong: #0e5f4e;

  --accent-pink: #f4b6ba;
  --accent-blue: #a9d5ef;
  --accent-yellow: #f6d56f;
  --accent-purple: #c9b8ea;
  --accent-green: #acd6b5;
  --accent-orange: #efba86;

  --danger: #c95a55;
  --success: #2d8a68;

  --page-padding-x: 18px;
  --header-height: 64px;
  --radius-card: 20px;
  --radius-control: 14px;
  --radius-pill: 999px;

  --title-size: 1.75rem;
  --title-weight: 800;
  --body-size: 1rem;

  --shadow-card: 0 8px 28px rgb(31 42 37 / 0.07);
}
```

Exact values may be refined during visual implementation, but the architecture must stay tokenized.

### Forbidden pattern

Do not scatter arbitrary values such as:

```tsx
<h1 className="text-[27px] font-[750] ml-[17px]">
```

across multiple pages.

If a value represents a design decision, it belongs in a shared token or shared component.

---


# 2A. ZERO-COST REQUIREMENT

**This project must be capable of running at $0/month for Mallory and Nik.**

This is a hard product constraint.

Codex must not introduce a paid service, metered API that requires billing, paid notification provider, paid database tier, paid hosting tier, paid domain requirement, or paid SaaS dependency unless Mallory explicitly changes this requirement later.

## Approved free stack

- Next.js — free/open source
- React — free/open source
- TypeScript — free/open source
- Tailwind CSS — free/open source
- Lucide React — free/open source
- TanStack Query — free/open source
- Playwright — free/open source
- Supabase **Free** plan
- Vercel **Hobby** plan for this personal/non-commercial app
- Standards-based Web Push with self-generated VAPID keys
- Supabase Cron / `pg_cron`
- Supabase Edge Functions within the Free-plan quota
- Vercel-provided `*.vercel.app` address and HTTPS

## Do not require

- Vercel Pro
- Supabase Pro
- a purchased custom domain
- OneSignal or another paid push service
- Firebase paid features
- paid email/SMS services
- a paid transactional email provider
- paid database backups
- App Store developer membership
- Google Play developer registration
- a paid analytics product
- a paid icon/font/UI package
- OpenAI API calls or any other paid AI API inside the finished app

If a future implementation choice would require payment, Codex must stop and use a free alternative instead.

## Free-tier capacity expectations

This is a two-user household app. It should be engineered to stay dramatically below normal free-tier quotas.

The app should prefer efficient realtime subscriptions and a lightweight reminder schedule rather than excessive polling.

## Free-tier availability caveat

Supabase Free projects may be paused after an extended period of low/inactive use.

The app must not attempt to bypass provider inactivity policies.

If the project is paused, it may need to be restored manually in the Supabase dashboard. This is acceptable for a $0 personal app.

The app should not be designed around any guarantee of paid-tier uptime.

## Domain

A custom domain is optional.

Use the free Vercel deployment URL for v1.

Never tell Mallory that a custom domain is required for installation, HTTPS, PWA functionality, or push notifications.

## Authentication and email

The v1 core app must **not require transactional email**, and chore reminders must never depend on email.

For the private two-person deployment, use Supabase email/password authentication with email confirmation disabled during initial account setup, or another fully free auth path that does not require a paid mail service.

Recommended private-app setup:

1. Allow account creation while Mallory and Nik create their accounts.
2. Email confirmation is not required for these initial accounts.
3. Both users join the intended household.
4. Once both accounts exist, disable new public sign-ups in Supabase.
5. Normal sign-in continues to work.
6. Provide an authenticated **Change Password** screen.
7. Do not make email-based "Forgot Password" a v1 requirement.

If password-reset email is added later, it must use a genuinely free solution chosen explicitly at that time. Do not silently add a paid SMTP dependency.

## Push notifications

Use browser-native Web Push.

Do not use a paid push-notification service.

Generate VAPID keys ourselves and send notifications from the project's server-side reminder function.

## Scheduled reminders

Use Supabase Cron / `pg_cron` to invoke a Supabase Edge Function.

Do not require Vercel paid cron functionality.

A 5-minute reminder scan is more than adequate for this app and should remain tiny relative to the Free-plan Edge Function allowance.

## No surprise billing

Prefer service configurations that cannot silently generate overage charges on the free plan.

Do not attach billing merely for convenience.

If the free quota is ever reached, degraded/paused service is preferable to an unexpected bill unless Mallory explicitly decides otherwise.

---

# 3. RECOMMENDED STACK

Use the latest stable releases available at implementation time.

## Frontend

- Next.js
- React
- TypeScript
- App Router
- PWA manifest + service worker
- Tailwind CSS for utility composition
- CSS custom properties for core visual tokens
- Lucide React for base iconography
- TanStack Query for server-state fetching, caching, mutation lifecycle, and invalidation

## Backend

- Supabase
  - Postgres
  - Auth
  - Row Level Security
  - Realtime
  - Edge Functions if needed for reminder delivery
  - database migrations committed to the repository

## Hosting

Required v1 hosting approach:
- Vercel **Hobby / $0** for the Next.js app
- Supabase **Free / $0** hosted project for database/auth/realtime/cron/functions
- Vercel's included deployment URL; no purchased domain

The app should not require either user to run a server locally after deployment.
Do not upgrade either service or enable paid add-ons without Mallory explicitly changing the $0 requirement.

---

# 4. WHY THIS ARCHITECTURE

## PWA

The app is intentionally not an App Store / Play Store project for v1.

It should be installable from the browser and launch from the user's Home Screen in standalone app mode.

Required PWA pieces:

- `manifest.ts` or equivalent
- app icons
- `display: "standalone"`
- appropriate theme/background colors
- service worker
- install instructions
- offline shell/fallback behavior
- responsive mobile layout
- notification permission UX

The PWA should look intentional when launched from a phone home screen.

---

## Supabase as the shared source of truth

Supabase is responsible for:

- authentication
- household membership
- chore data
- schedule data
- completion data
- history
- reminders
- realtime sync
- secure row-level access

For this app's tiny household scale, simple Supabase Realtime subscriptions to relevant Postgres changes are acceptable and preferable to unnecessary complexity.

If the app ever grows substantially, the Realtime implementation can be revisited.

---

# 5. HIGH-LEVEL USER FLOW

## First user

1. Open deployed web app.
2. Create account.
3. Create household.
4. Household receives a simple invite code/link.
5. Create first chore.
6. Add app to phone Home Screen.
7. Enable reminders if desired.

## Second user

1. Open invite.
2. Create/sign into account.
3. Join household.
4. Install PWA.
5. Household data immediately appears.
6. Enable their own reminders independently.

---

# 6. AUTHENTICATION

Keep authentication simple.

Recommended v1:
- email + password
- persistent session
- authenticated change-password flow
- sign out
- no transactional-email dependency

For the private two-person launch, email confirmation should not be required during initial account creation. After Mallory and Nik have created their accounts and joined the household, disable new public sign-ups.

Optional later:
- email-based password recovery using a deliberately chosen free SMTP path
- magic link
- Google sign-in
- Apple sign-in

Do not block v1 on social auth or email delivery.

A user has a profile row linked to `auth.users`.

---

# 7. HOUSEHOLD MODEL

A household is the security and synchronization boundary.

A user should only be able to read/write data for households they belong to.

Initial supported membership:
- owner/admin
- member

For Mallory + Nik, both may effectively have full household permissions.

A household includes:
- name
- members
- created date
- optional icon/theme later

Working default name:
**Mallory & Nik**

---

# 8. CORE DOMAIN MODEL

The most important architectural choice:

## Chore Definition != Chore Occurrence

A **chore definition** describes the recurring rule.

Example:

> Scoop litter boxes  
> Weekly  
> Sundays  
> Shared household chore

A **chore occurrence** is one scheduled instance.

Example:

> Scoop litter boxes  
> Due Sunday, September 20, 2026  
> Completed Sunday at 9:12 AM by Mallory

Do not overwrite the recurring chore just because one week's task was completed, skipped, or rescheduled.

This separation prevents recurrence bugs and gives us reliable history.

---

# 9. DATABASE DESIGN

Names may be adjusted slightly during implementation, but keep the conceptual model.

## 9.1 `profiles`

```text
id uuid PK -> auth.users.id
display_name text
avatar_key text nullable
created_at timestamptz
updated_at timestamptz
```

---

## 9.2 `households`

```text
id uuid PK
name text
created_by uuid -> profiles.id
invite_code text unique
created_at timestamptz
updated_at timestamptz
```

---

## 9.3 `household_members`

```text
id uuid PK
household_id uuid -> households.id
user_id uuid -> profiles.id
role text enum-ish: owner | member
joined_at timestamptz

unique(household_id, user_id)
```

---

## 9.4 `chores`

Represents the recurring chore definition.

```text
id uuid PK
household_id uuid
name text
description text nullable
icon_key text
accent_key text

recurrence_type text
  daily | interval_days | weekly | interval_weeks | monthly

interval_count integer default 1

anchor_date date
  reference point for recurrence

weekdays smallint[] nullable
  recommended: 0=Sunday ... 6=Saturday

day_of_month smallint nullable

preferred_time time nullable
  optional chore display time; separate from reminder time

is_active boolean default true

created_by uuid
created_at timestamptz
updated_at timestamptz
```

### Shared ownership semantics

- Every chore belongs to the household, not an individual member.
- Every household member can see, edit, pause, resume, and complete it.
- The actual completer is recorded on the completion event, but is never the expected owner.
- Personal reminder subscriptions do not create responsibility or ownership.

---

## 9.5 `chore_occurrences`

Represents a scheduled instance.

```text
id uuid PK
household_id uuid
chore_id uuid

scheduled_date date
original_scheduled_date date

status text
  scheduled | completed | skipped

is_rescheduled boolean default false

created_at timestamptz
updated_at timestamptz

unique(chore_id, scheduled_date)
```

One valid household-member completion completes the shared occurrence.

---

## 9.6 `occurrence_completions`

Stores actual completion events.

```text
id uuid PK
occurrence_id uuid
household_id uuid
user_id uuid
completed_at timestamptz
created_at timestamptz

unique(occurrence_id, user_id)
```

Normally there will be one active completion row per occurrence. It records who completed the shared chore and when.

---

## 9.7 `chore_reminders`

Reminder preferences are personal.

```text
id uuid PK
household_id uuid
chore_id uuid
user_id uuid

enabled boolean
reminder_type text
  due_time | if_incomplete_by

local_time time
timezone text

created_at timestamptz
updated_at timestamptz

unique(chore_id, user_id, reminder_type)
```

A reminder belongs to a user, not globally to a chore.

Mallory and Nik may choose different reminder times for the same chore.

---

## 9.8 `push_subscriptions`

A user may have multiple devices.

```text
id uuid PK
user_id uuid
device_label text nullable
endpoint text
p256dh text
auth text
user_agent text nullable
created_at timestamptz
last_seen_at timestamptz
```

Do not assume one notification subscription per user.

---

## 9.9 `activity_events` — recommended

Useful for a clean shared history/activity feed.

```text
id uuid PK
household_id uuid
actor_user_id uuid nullable

event_type text
  chore_completed
  chore_uncompleted
  chore_skipped
  chore_rescheduled
  chore_created
  chore_updated

chore_id uuid nullable
occurrence_id uuid nullable

metadata jsonb
created_at timestamptz
```

History should not depend on parsing client logs.

---

# 10. ROW LEVEL SECURITY

RLS must be enabled for household data.

Basic rule:

> A signed-in user may read/write a row only if its `household_id` belongs to a household in which that user is a current member.

Do not expose all chores to every authenticated user.

Client code uses the public/anon key.

**Never expose the Supabase service-role key to the browser.**

Server-only reminder jobs/Edge Functions may use elevated access where appropriate.

---

# 11. REALTIME SYNC

Realtime behavior is core functionality.

Subscribe to relevant shared tables for the current household:

- chores
- chore_occurrences
- occurrence_completions
- household_members
- activity_events

When a relevant change arrives:

1. update/invalidate the appropriate TanStack Query cache
2. allow the visible UI to reflect the server state immediately
3. do not require a page reload

Example:

Nik has Today open.

Mallory taps **Mark as Done** on "Take trash out."

Nik should see:
- the row become complete
- Mallory shown as the completer if the UI exposes it
- task counts update

This should happen quickly while both apps are online.

---

# 12. SERVER STATE RULES

Use TanStack Query or a comparable shared server-state layer.

Do not fetch Supabase directly from random UI components.

Create a data layer such as:

```text
src/
  data/
    chores/
      queries.ts
      mutations.ts
      keys.ts
    household/
    reminders/
    history/
```

or equivalent.

Shared query keys should exist.

Example conceptual keys:

```ts
['household', householdId]
['chores', householdId]
['occurrences', householdId, range]
['history', householdId, filters]
```

Mutations should:
- handle loading state
- handle error state
- optionally use optimistic UI where safe
- revert optimistic state on failure
- reconcile with the server
- invalidate relevant queries

---

# 13. RECURRENCE ENGINE

Recurrence logic must live in one shared module.

Example:

```text
src/domain/recurrence/
  generateOccurrences.ts
  getNextOccurrence.ts
  recurrenceTypes.ts
  recurrence.test.ts
```

Do not independently calculate recurrence inside Home, Calendar, Details, and History pages.

---

## Supported v1 recurrence

### Daily
- every day
- every N days

### Weekly
- every week
- every N weeks
- one or more selected weekdays

Examples:
- every Sunday
- Monday + Thursday
- every 2 weeks on Saturday

### Monthly
- same numbered day of month

Example:
- 1st of every month

For dates such as the 29th, 30th, or 31st:
- if the month is shorter, use the last valid day of that month
- document this behavior

---

## Occurrence horizon

Generate future occurrences far enough ahead for useful calendar browsing.

Recommended:
- keep at least 8 weeks of future occurrences available
- regenerate when a chore is created/edited
- run a lightweight scheduled server process daily to extend the horizon

Do not require the user to open the app for reminder-critical future occurrences to exist.

---

# 14. EDITING A RECURRING CHORE

Editing a recurrence rule is a classic source of bugs.

v1 behavior:

When editing a chore definition:
- preserve historical completed/skipped occurrences
- preserve past dates
- delete/regenerate only future untouched scheduled occurrences
- generate new future occurrences from the updated rule

Do not rewrite history.

---

# 15. COMPLETE / UNCOMPLETE BEHAVIOR

## Complete

When a user taps completion:

- create the appropriate `occurrence_completions` row
- record exact completion timestamp
- record actual user
- update occurrence status if completion requirement is satisfied
- create an activity event
- propagate via realtime

## Undo

Allow a short-term or explicit **Undo / Mark incomplete** action.

Undo should:
- remove or reverse the current user's completion
- recompute overall occurrence status
- create an activity event

---

# 16. SKIP

Skipping affects one occurrence only.

It does not disable or edit the recurring chore.

A skipped occurrence:
- has `status = skipped`
- remains visible in history
- does not create a late/overdue state
- does not send reminders

---

# 17. RESCHEDULE

Rescheduling affects one occurrence only.

Example:
- original Sunday chore moved to Monday

Store:
- original scheduled date
- new scheduled date
- `is_rescheduled = true`

The next normal recurrence remains based on the chore's recurring rule.

Do NOT accidentally shift the entire recurrence chain.

---

# 18. EARLY COMPLETION

A scheduled chore should be completable before its scheduled day.

Example:
- Change sheets is scheduled for Saturday.
- Nik does it Friday night.

The app should allow the Friday completion to satisfy Saturday's existing occurrence.

It should NOT create a second Saturday instance.

UI approach:
- from upcoming chore detail, allow **Mark as Done**
- keep `scheduled_date = Saturday`
- record `completed_at = Friday evening`

History can show:
> Completed Friday • scheduled for Saturday

---

# 19. OVERDUE BEHAVIOR

A due occurrence remains visible until:
- completed
- skipped
- rescheduled

It does not disappear at midnight.

Overdue state should be visually noticeable but not alarmist.

Recommended:
- small warm red/orange "Overdue" pill
- keep card styling otherwise consistent

---

# 20. REMINDERS

Reminders are opt-in, per-user, and delivered as push notifications only.

## V1 reminder options

For an individual chore:

- no reminder
- remind me at a chosen time on the due date
- optionally: remind me if still incomplete by a chosen time

Examples:
- Mallory: Scoop litter boxes — Sunday 10:00 AM
- Nik: same chore — no reminder

---

## Reminder suppression

Do not send a reminder if:
- occurrence is already complete for that user/requirement
- occurrence is skipped
- chore is inactive
- reminder is disabled

Because completion belongs to the shared occurrence, completion by any household member suppresses later reminders for that occurrence. Reminder subscriptions themselves remain personal.

---


# 20A. REMINDER CHANNEL POLICY

**V1 supports push notifications only.**

Do not build:
- email reminders
- SMS reminders
- reminder emails
- daily digest emails
- third-party email notification delivery

Authentication email is a separate concern from chore reminders and should not be conflated with the reminder system.

The reminder UI should talk about:
- push notifications
- phone notifications
- notification permission
- reminder time

It should not offer a notification-channel picker in v1.

The reminder model may remain extensible enough to support additional channels in the future, but no unused multi-channel abstraction is required now.

---

# 21. PUSH NOTIFICATION ARCHITECTURE

Notifications need to work while the PWA is not actively open.

Use standards-based Web Push.

Client responsibilities:
- request notification permission only after direct user interaction
- create/store push subscription
- register service worker
- show an understandable enabled/disabled state

Server responsibilities:
- safely store subscriptions
- identify due reminder deliveries
- send Web Push payload
- remove dead subscriptions when push service reports expiration/invalidity

Recommended reminder job:
- Supabase Cron (`pg_cron`) invokes a Supabase Edge Function every 5 minutes
- do not use a paid external scheduler or a paid Vercel cron feature
- finds reminder windows that are due
- confirms occurrence is still incomplete
- sends once
- records delivery to prevent duplicates

Add a reminder-delivery table if needed for idempotency.

---

# 22. NOTIFICATION UX

Do not ask for notification permission on first page load.

Preferred flow:

1. User creates or opens a chore.
2. User explicitly turns on **Remind me**.
3. App explains that phone notifications must be enabled.
4. User taps **Enable notifications**.
5. Browser/system permission request appears.
6. Subscription is registered.
7. Reminder UI confirms success.

For iPhone:
- if the app needs to be installed to the Home Screen before notification setup can work properly, show a friendly install instruction card.

---

# 23. NAVIGATION

Primary bottom navigation:

1. Home
2. Calendar
3. central Add button
4. Chores
5. History

Settings/Household access:
- gear/action icon in the root header
- or profile/household button

Bottom navigation must be a shared component.

It must:
- respect safe-area inset
- stay visually consistent
- expose active state
- keep the central add action obvious

---

# 24. UNIVERSAL PAGE SHELL

Create something structurally equivalent to:

```text
src/components/layout/
  AppFrame.tsx
  PageShell.tsx
  PageHeader.tsx
  BottomNav.tsx
  ScrollContent.tsx
```

## `AppFrame`

Owns:
- global viewport
- app background
- font
- maximum phone/web width if appropriate
- global providers
- bottom navigation region

## `PageShell`

Owns:
- root/detail variant
- standardized header
- scrollable content
- standard page padding
- optional full-bleed regions
- bottom-nav clearance

## `PageHeader`

This is the only component allowed to render the standard application page title.

It receives:
- `title`
- optional `subtitle`
- optional back behavior
- optional right-side action
- optional accessory region

No screen may redefine the header font.

---

# 25. HEADER ACCEPTANCE TEST

This should be testable.

At minimum, every root page title should share the same:
- rendered font-family
- rendered font-size
- rendered font-weight
- line-height
- x-offset
- header top coordinate
- header height

Every detail page title should share the same values for its detail-header variant.

Add stable test IDs if useful:

```tsx
data-testid="page-header"
data-testid="page-header-title"
```

A Playwright test may compare computed styles across major routes.

This sounds strict because prior projects developed subtle page-to-page drift. Prevent that drift automatically.

---

# 26. TYPOGRAPHY

Use one primary sans-serif family globally.

Recommended visual direction:
- **Nunito Sans** or similarly rounded but readable sans-serif

Use semantic typography tokens:

```text
display
pageTitle
sectionTitle
cardTitle
body
bodySmall
caption
button
label
```

Do not invent font sizes per component.

Example implementation options:
- CSS classes generated from tokens
- Tailwind theme values backed by CSS variables
- shared Typography component

The exact mechanism is flexible. The centralized result is not.

---

# 27. VISUAL DIRECTION

Keywords:

- colorful
- cheerful
- cozy
- soft
- clean
- modern
- homey
- icon-driven
- playful
- not childish
- not aggressively feminine
- not corporate
- not sterile

The visual reference is the earlier mockup:
- cream/off-white background
- deep green/teal primary
- soft icon tiles
- pink, blue, yellow, lavender, green, orange accents
- rounded cards
- large friendly icons
- subtle shadow
- lots of breathing room

Shared-app balance:
- keep pink in the system
- do not make pink the dominant brand color
- green/teal acts as the primary anchor
- color communicates category/personality without overwhelming the screen

---


# 27A. BRANDING MUST BE CONFIGURABLE

The current app name is:

**Tandem**

This is a working product name, not something that should be hardcoded throughout the codebase.

Create one central brand/config module, for example:

```ts
export const APP_BRAND = {
  name: "Tandem",
  shortName: "Tandem",
  tagline: "Better together at home",
  householdDefaultName: "Mallory & Nik",
}
```

or an equivalent centralized configuration.

The app name should be referenced from this config in places such as:

- page metadata
- PWA manifest
- install prompt
- auth screens
- app header/brand area
- document title
- empty states where the product name appears
- notification title where appropriate

Do not scatter the literal string `"Tandem"` across many files.

If Mallory later renames the app, the expected change should be a small centralized update rather than a repo-wide search-and-replace.

Brand assets should also be easy to replace:
- logo/icon component
- app icon files
- theme color tokens
- display name
- tagline

Avoid filenames or component names that permanently couple the codebase to `Tandem` unless they are genuinely product-specific.

---

# 28. CHORE ICON SYSTEM

Use a curated icon picker.

Initial icon categories:

- paw / pet
- trash
- sparkle / cleaning
- bed
- hanger / laundry
- utensils
- leaf / plants
- bathtub
- toilet
- vacuum
- broom
- dishes
- groceries
- car
- package
- home
- calendar
- generic checklist

Each chore stores `icon_key`, not a React component name directly.

Create a central registry:

```ts
export const CHORE_ICONS = {
  paw: PawPrint,
  trash: Trash2,
  sparkle: Sparkles,
  bed: BedDouble,
  // ...
}
```

That prevents stored database values from depending on library internals.

---

# 29. ACCENT COLOR SYSTEM

Chores may optionally use an accent.

Store an `accent_key`, for example:

```text
rose
sky
amber
lavender
mint
peach
teal
```

Map keys to global tokens.

Do not store raw arbitrary hex colors on every chore in v1.

---

# 30. SHARED COMPONENT LIBRARY

Build shared primitives early.

Recommended:

```text
src/components/ui/
  AppButton
  IconButton
  Card
  IconTile
  Pill
  Avatar
  EmptyState
  LoadingState
  ErrorState
  ConfirmDialog
  SegmentedControl
  Toggle
  Select
  TextField
  TextArea
  TimePicker
  DayOfWeekPicker
  MemberChip
  ProgressBar
  Toast
```

Household-specific components:

```text
src/components/chore/
  ChoreRow
  ChoreCard
  ChoreIcon
  ChoreStatus
  CompletionControl
  RecurrenceSummary
```

Avoid cloning visual markup across pages.

---

# 31. HOME / TODAY PAGE

Route:
`/`

Purpose:
What matters today?

## Header

Title:
**Tandem**

Optional subtitle:
**Mallory & Nik**

Right action:
settings gear

Use the universal root header.

## Content

Recommended order:

### Date / small greeting area
- current day/date
- optional weather should NOT be in v1 unless intentionally added later

### Progress widget
Example:
**2 of 5 done**

Small progress bar/ring.

### Today's chores
Each row contains:
- icon tile
- chore name
- shared active/paused state
- optional due/reminder time
- status/completion control

Completed chores stay visible and move visually into completed styling rather than immediately disappearing.

### Upcoming
Optional small section for tomorrow / next chores.

## Empty state

> Nothing due today 🎉  
> Enjoy the clean-house victory.

---

# 32. CALENDAR PAGE

Route:
`/calendar`

Use universal root header.

Title:
**This Week** or **Calendar**

Recommended layout:

- horizontal 7-day selector
- selected date
- completion summary per day
- list of chores for selected date
- previous/next week controls

Do not build a dense desktop month calendar as the primary mobile UI.

Potential later enhancement:
month overview.

---

# 33. CHORES PAGE

Route:
`/chores`

Title:
**Chores**

Purpose:
Manage recurring chore definitions.

Sections/filter options:
- Active
- Paused
- All

Each chore row:
- icon
- name
- active/paused state
- human-readable recurrence
- next due date
- tap for details/edit

Floating/central add button routes to Add Chore.

---

# 34. ADD CHORE PAGE

Route:
`/chores/new`

Universal detail header:
**Add a Chore**

Form:

1. Chore name
2. Icon
3. Accent color
4. Frequency
5. Frequency-specific controls
6. Optional reminder for current user
7. Optional notes
8. Create Chore button

---

# 35. FREQUENCY BUILDER UX

Avoid exposing database terminology.

## UI options

### Daily
"Every day"

Optional advanced:
"Every [N] days"

### Weekly
"Every week"

Then:
"Repeat on"
S M T W T F S

Optional:
"Every [N] weeks"

### Monthly
"Every month on the [day]"

Keep first-pass UI friendly.

Show a preview sentence:

> Every Sunday

or

> Every 2 weeks on Saturday

This preview should use a shared formatter.

---

# 36. CHORE DETAILS PAGE

Route:
`/chores/[id]`

Universal detail header:
**Chore Details**

Content:

- large icon + name
- recurrence summary
- active/paused state
- next due date
- current user's reminder
- notes
- recent completion info

Primary action:
**Mark as Done**

Secondary actions:
- Skip
- Reschedule
- Edit

If current occurrence is already done:
- show completion status
- show who + when
- allow Undo if appropriate

---

# 37. COMPLETION CELEBRATION

Keep it fun but quick.

After marking a chore done:
- check animation
- optional tiny confetti
- haptic-like visual feedback
- toast or brief confirmation

Do not force a full-screen modal after every chore forever.

A first-run or occasional richer celebration is fine.

Default should be fast:
tap -> satisfying completion -> keep using app.

---

# 38. HISTORY PAGE

Route:
`/history`

Universal root header:
**History**

List recent activity grouped by:
- Today
- Yesterday
- This Week
- Older

Example:

> 🗑 Take trash out  
> Nik • Mon 8:42 AM

> 🐾 Scoop litter boxes  
> Mallory • Sun 9:12 AM

Filters later:
- member
- chore
- completed/skipped

V1 can keep filters simple.

---

# 39. HOUSEHOLD / SETTINGS PAGE

Route:
`/household` or `/settings`

Universal root or detail shell; choose one pattern and keep it consistent.

Sections:

### Household
- household name
- members
- invite member
- invite code/link

### Notifications
- status
- test notification
- device subscription status

### Appearance
Future-friendly placeholder; do not overbuild v1.

### Account
- display name
- email
- sign out

---

# 40. MEMBER IDENTITY

Use simple avatar circles.

Mallory:
- initial M
- one accent color

Nik:
- initial N
- different accent color

Actual profile photos are not required.

Use names consistently instead of generic "User 1/User 2."

Database logic must not hardcode Mallory or Nik IDs, however.

---

# 41. LOADING / ERROR / EMPTY STATES

Every data-driven screen needs proper states.

## Loading
Use skeletons that resemble final content.

## Empty
Use friendly, specific copy and one clear action.

## Error
Explain the failure and provide Retry.

Do not show a blank page when Supabase is unavailable.

---

# 42. NETWORK BEHAVIOR

The database is cloud-authoritative, but the UI should still feel fast.

Recommended:
- TanStack Query memory cache
- optimistic completion toggle where safe
- visible pending state
- reconcile after server response
- revert and show toast if mutation fails

Avoid pretending a change succeeded permanently if the server rejected it.

If offline:
- show a small offline indicator
- do not silently treat local changes as synced
- v1 may disable mutations while offline rather than implementing a complex offline write queue

This is preferable to creating conflict-prone hidden local state.

---

# 43. TIME ZONES

Store timestamps as `timestamptz`.

Store each user's timezone for reminder delivery.

Scheduled chore dates are primarily household-local calendar dates.

For v1:
- assume both household members normally share the same household timezone
- retain explicit timezone fields for reminder calculations

Avoid comparing date-only chores by converting them carelessly through UTC.

---

# 44. ACCESSIBILITY

Minimum expectations:

- color is not the only signal of status
- buttons have text or accessible labels
- touch targets roughly 44px minimum
- visible focus state
- forms have labels
- contrast is readable
- completion controls expose checked/completed state
- icons used decoratively are hidden from screen readers

---

# 45. RESPONSIVE BEHAVIOR

Primary target:
phone portrait.

Also support:
- larger phones
- tablet
- desktop browser

Do not let the interface stretch into an ugly full-width desktop layout.

Recommended:
- center the app content
- cap main content width on wide screens
- retain the mobile-app aesthetic

---

# 46. PWA INSTALL EXPERIENCE

Create a small install-help experience.

Detect whether running in standalone mode when practical.

If not installed:
- show optional "Add Our Home to your Home Screen" card
- include separate short instructions for iPhone and Android when needed

Do not nag on every visit.

Dismissal may be remembered as a device-local UI preference.

That is an acceptable local-only preference because it is not household data.

---

# 47. APP ICON / BRAND

Working brand:
**Tandem**

The visible name must come from the centralized brand configuration described above.

Icon direction:
- simple house
- teal/green
- soft cream/pink accent optional
- readable at small Home Screen size

Do not block engineering on final logo polish.

Use a clean placeholder icon early and replace later.

---

# 48. DATA SECURITY

Required:

- RLS enabled
- household membership checked in policies
- public browser gets anon key only
- service-role key stays server-only
- input validation
- do not trust `household_id` merely because the client submitted it
- server/database policies remain the final authority

---

# 49. VALIDATION

Use a shared schema library such as Zod.

Shared validation for:
- chore names
- recurrence
- reminder times
- household invite code inputs

Avoid separately validating the same structure in five pages.

---

# 50. HUMAN-READABLE FORMATTERS

Centralize display strings.

Examples:

```text
Every Sunday
Every Monday and Thursday
Every 2 weeks on Saturday
Every 3 days
Monthly on the 1st
Completed by Nik at 8:42 AM
```

Recommended files:

```text
src/domain/formatters/
  recurrence.ts
  dates.ts
```

Do not build these strings ad hoc in each component.

---

# 51. ROUTE STRUCTURE

Suggested:

```text
/
  Home / Today

/calendar

/chores

/chores/new

/chores/[id]

/chores/[id]/edit

/history

/household

/settings/notifications

/auth/sign-in

/auth/sign-up

/join/[inviteCode]
```

Exact routing may evolve, but keep it predictable.

---

# 52. SUGGESTED SOURCE TREE

```text
src/
  app/
    (auth)/
    (app)/
      layout.tsx
      page.tsx
      calendar/
      chores/
      history/
      household/
    manifest.ts

  components/
    layout/
      AppFrame.tsx
      PageShell.tsx
      PageHeader.tsx
      BottomNav.tsx

    ui/
      Button.tsx
      Card.tsx
      IconButton.tsx
      Pill.tsx
      Avatar.tsx
      SegmentedControl.tsx
      EmptyState.tsx
      LoadingState.tsx
      Toast.tsx

    chore/
      ChoreRow.tsx
      ChoreCard.tsx
      ChoreIcon.tsx
      CompletionControl.tsx
      RecurrenceSummary.tsx

  data/
    supabase/
      browser.ts
      server.ts
      types.ts

    chores/
      queries.ts
      mutations.ts
      keys.ts

    occurrences/
    household/
    reminders/
    history/

  domain/
    recurrence/
      generateOccurrences.ts
      recurrenceTypes.ts
      recurrence.test.ts

    formatters/
      recurrence.ts
      dates.ts

  hooks/
    useHousehold.ts
    useRealtimeHousehold.ts
    useOnlineStatus.ts

  styles/
    globals.css
    tokens.css

  lib/
    validation/
    push/
    dates/
```

This is guidance, not a demand for empty abstraction files.

---

# 53. SUPABASE MIGRATIONS

Database changes should be represented as migration files in the repository.

Do not rely on undocumented manual dashboard clicks.

Recommended:

```text
supabase/
  migrations/
  functions/
```

Migrations should include:
- tables
- constraints
- indexes
- RLS enablement
- RLS policies
- useful database functions/triggers

---

# 54. INDEXES

Add sensible indexes for common household queries.

Examples:
- chores by household
- occurrences by household + scheduled date
- occurrences by chore + scheduled date
- completions by occurrence
- activity by household + created_at
- reminders by user/chore

Do not prematurely micro-optimize, but do not leave obvious range-query columns unindexed.

---

# 55. REALTIME SUBSCRIPTION LIFECYCLE

Create one household-level realtime hook/provider rather than one subscription per card.

Example:

```ts
useRealtimeHousehold(householdId)
```

Responsibilities:
- subscribe after authenticated household is known
- listen to relevant table changes
- invalidate targeted query keys
- clean up channels on household/user change
- reconnect gracefully

Avoid creating dozens of duplicate websocket subscriptions.

---

# 56. FORM ARCHITECTURE

Chore Create and Chore Edit should share one form component.

Example:

```tsx
<ChoreForm
  mode="create"
  initialValues={...}
  onSubmit={...}
/>
```

and

```tsx
<ChoreForm
  mode="edit"
  initialValues={existingChore}
  onSubmit={...}
/>
```

Do not duplicate the entire form in two routes.

---

# 57. DESIGN-SYSTEM RULE: NO ONE-OFF PAGE FIXES

If a page "looks a little different," first ask:

- Is the shared component wrong?
- Is the design token wrong?
- Is the page bypassing the shared shell?

Do not immediately patch the page with:
- custom padding
- custom title font-size
- negative margin
- arbitrary absolute positioning
- local font family
- duplicated header markup

Fix the shared cause whenever the desired rule is global.

---

# 58. CSS RULES

Preferred hierarchy:

1. global design tokens
2. shared layout components
3. shared UI components
4. feature components
5. page composition
6. minimal page-specific styling

Page-specific CSS should be the exception, not the default.

---

# 59. MOBILE SAFE AREAS

PWA must account for phone notches and Home indicator.

Use CSS safe-area environment variables where needed:

```css
env(safe-area-inset-top)
env(safe-area-inset-bottom)
```

Bottom nav must not collide with the iPhone Home indicator.

---

# 60. BUTTON HIERARCHY

Primary:
- deep teal/green filled

Secondary:
- soft neutral filled

Tertiary:
- text/button

Danger:
- reserved for destructive actions

Do not use destructive red for normal "Skip" actions.

---

# 61. CARD LANGUAGE

Cards should:
- use the shared radius
- use consistent internal padding
- use minimal soft shadow
- avoid heavy borders everywhere

Chore icon tiles can be more colorful than the base cards.

---

# 62. MOTION

Keep motion light.

Allowed:
- checkmark bounce
- progress animation
- row completion transition
- modal/sheet entrance
- subtle confetti

Respect reduced-motion preferences.

Do not make basic navigation slow.

---

# 63. SHEETS / DIALOGS

Use a consistent modal/sheet component for:
- reschedule
- skip confirmation if necessary
- invite code sharing
- destructive actions

On phones, bottom sheets are a good default.

---

# 64. HOME WIDGET-LIKE CARDS

Inside the app, use widget-like cards such as:

- `3 tasks left today`
- `Next: Clean bathroom • Saturday`
- weekly completion progress

Actual OS home-screen widgets are **not** required for v1.

Do not confuse visual app widgets with native iOS/Android widgets.

---

# 65. OPTIONAL FUTURE FEATURES — DO NOT BUILD YET

Keep architecture compatible, but do not bloat v1.

Possible later features:

- points/streaks
- chore claiming
- recurring shopping tasks
- shared grocery list
- household supplies inventory
- estimated chore duration
- workload fairness stats
- photo proof
- comments
- vacation mode
- guest/roommate support
- multiple households
- actual native home-screen widgets
- themes
- dark mode
- calendar integrations

Do not implement these unless explicitly requested.

---

# 66. V1 DEFINITION

V1 is successful when:

1. Mallory can create an account without requiring a paid email service.
2. Mallory can create a household.
3. Nik can join it.
4. Both install the app to their phones.
5. Either can create/edit a recurring chore.
6. Chores appear on correct days.
7. Each can see Today and Week views.
8. Chores are shared by the household and do not display a responsible person.
9. Either household member can mark an occurrence complete.
10. The other phone receives the state change live while open.
11. Completion records who and when.
12. Completed items remain visually visible for the day.
13. A single occurrence can be skipped.
14. A single occurrence can be rescheduled.
15. Past history is preserved when recurrence changes.
16. Each person can enable their own reminder.
17. Push notifications can be delivered to an installed PWA.
18. RLS prevents users outside the household from reading data.
19. All root pages use the same header metrics.
20. All detail pages use the same header metrics.
21. A global font/color/spacing change can be made centrally without editing each page.

---

# 67. TESTING STRATEGY

## Unit tests

Prioritize pure business logic:

- recurrence generation
- monthly end-of-month behavior
- every-N-days calculation
- every-N-weeks weekday calculation
- rescheduling behavior
- early completion targeting
- recurrence formatter

## Integration tests

- auth -> create household
- join household
- create chore
- occurrence generation
- complete occurrence
- realtime invalidation path
- RLS access denial

## E2E / Playwright

Mobile viewport tests:
- sign in
- Home
- Calendar
- Add Chore
- Chore Details
- History
- header consistency
- bottom nav safe spacing

---

# 68. HEADER CONSISTENCY E2E TEST IDEA

Create a test that visits:

```text
/
/calendar
/chores
/history
/household
```

Read computed style for `[data-testid="page-header-title"]`.

Assert equal:
- fontFamily
- fontSize
- fontWeight
- lineHeight

Read bounding rect:
- equal left coordinate
- equal top coordinate within tiny tolerance

Then separately test detail pages.

This turns "please keep headers consistent" into an enforceable requirement.

---

# 69. DATABASE-TO-UI EXAMPLE

Chore:

```json
{
  "name": "Scoop litter boxes",
  "icon_key": "paw",
  "accent_key": "rose",
  "recurrence_type": "weekly",
  "interval_count": 1,
  "weekdays": [0]
}
```

Occurrence:

```json
{
  "scheduled_date": "2026-09-20",
  "status": "scheduled"
}
```

After Mallory completes:

```json
{
  "user_id": "mallory-id",
  "completed_at": "2026-09-20T14:12:00Z"
}
```

UI:

```text
🐾 Scoop litter boxes
Mallory
✓ Done at 9:12 AM
```

Nik's active app updates through Realtime.

---

# 70. COPY TONE

Use friendly language.

Good:
- "Nothing due today 🎉"
- "Nice! One less thing."
- "Nik finished Take trash out."
- "Remind me"

Avoid:
- "Task execution successful"
- "Resource updated"
- corporate project-management language

---

# 71. INITIAL SAMPLE CHORES FOR DEVELOPMENT

Use seed/dev fixtures only, not hardcoded production data.

Examples:

- Scoop litter boxes — Sunday — paw
- Take trash out — Monday — trash
- Wipe kitchen counters — daily — sparkle
- Water plants — Wednesday/Sunday — leaf
- Change sheets — every 2 weeks Saturday — bed
- Clean bathroom — Saturday — bathtub
- Vacuum downstairs — Friday — vacuum

These create enough variety to test recurrence modes and shared household management.

---

# 72. IMPLEMENTATION PHASES

## PHASE 0 — Foundation

Goal:
Build the skeleton correctly before feature work.

Tasks:
- initialize Next.js + TypeScript
- configure Tailwind
- create global tokens
- create centralized app/brand configuration (`Tandem` must not be scattered as a literal)
- load global font
- create `AppFrame`
- create `PageShell`
- create `PageHeader`
- create `BottomNav`
- create root routes with placeholder content
- add PWA manifest/icon placeholders
- install/query provider
- configure lint/typecheck/test setup

Exit criteria:
- Home, Calendar, Chores, History render
- all share identical root-page header styling
- navigation works
- no Supabase business features yet

**Do not skip this phase.**

---

## PHASE 1 — Supabase + Auth + Household

Tasks:
- Supabase client setup
- env template
- migrations
- profiles
- households
- household_members
- RLS
- sign up/in/out
- create household
- invite code
- join household

Exit criteria:
Two separate accounts can access the same household and cannot access another household.

---

## PHASE 2 — Chore Definitions

Tasks:
- chores table
- validation
- chore data layer
- chore list
- create form
- edit form
- icon registry
- accent registry
- shared active/paused management UX
- recurrence input UX

Exit criteria:
Users can create/edit/pause chores in shared cloud storage.

---

## PHASE 3 — Occurrences + Calendar

Tasks:
- recurrence engine
- tests
- occurrences table
- occurrence generation
- Today view
- Week view
- upcoming logic
- overdue handling

Exit criteria:
Recurring chores reliably appear on expected dates.

---

## PHASE 4 — Completion + History + Realtime

Tasks:
- occurrence completions
- completion/undo
- shared-occurrence completion
- skip
- reschedule
- activity events
- History screen
- Realtime household hook
- cache invalidation

Exit criteria:
Two open phones see each other's changes quickly.

---

## PHASE 5 — PWA + Push Reminders

Tasks:
- production service worker
- install UX
- push subscription
- reminder preferences
- server delivery job
- duplicate prevention
- notification suppression
- notification settings/test action

Exit criteria:
Each user can independently receive reminders on their installed PWA.

---

## PHASE 6 — Polish

Tasks:
- loading states
- empty states
- error states
- animations
- accessibility
- responsive QA
- safe areas
- header consistency E2E
- visual pass against design direction

Exit criteria:
Feels like a finished shared household app, not a prototype.

---

# 73. CODEX WORKFLOW RULES

When Codex is asked to work on this repo:

1. Read `OUR_HOME_BLUEPRINT.md`.
2. Identify the current implementation phase.
3. Inspect existing shared primitives before creating new ones.
4. Do not duplicate existing component responsibilities.
5. Make the smallest coherent set of changes for the requested phase.
6. Run:
   - lint
   - typecheck
   - relevant tests
7. Fix failures before considering the task complete.
8. Summarize:
   - what changed
   - files changed
   - migrations added
   - tests run
   - any remaining known issue
9. Do not silently make architectural changes that conflict with this blueprint.
10. If a future request changes the blueprint, update architecture intentionally rather than layering hacks over it.

---

# 74. ENVIRONMENT VARIABLES

Create an `.env.example`.

Likely values:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Server-only if required:
SUPABASE_SERVICE_ROLE_KEY=

# Web Push:
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
```

Never commit secret values.

---

# 75. DEPLOYMENT CHECKLIST

Before production use:

- [ ] production Supabase project exists on the Free plan
- [ ] Vercel project is on the Hobby plan
- [ ] no billing-required service has been introduced
- [ ] free Vercel deployment URL is being used unless Mallory explicitly chose otherwise
- [ ] migrations applied
- [ ] RLS verified
- [ ] Vercel environment variables configured
- [ ] PWA manifest works
- [ ] app icons render
- [ ] service worker updates correctly
- [ ] iPhone Home Screen install tested
- [ ] Android install tested
- [ ] two-account shared household tested
- [ ] realtime tested on two devices
- [ ] push permission flow tested
- [ ] reminder delivery tested while app is closed
- [ ] no service-role secret appears in client bundle
- [ ] header consistency E2E passes
- [ ] mobile safe area checked

---

# 76. DEFINITION OF "FAST SYNC"

For normal online usage:

- local mutation feedback should feel immediate
- server write occurs promptly
- active second device should generally reflect changes within moments
- no manual refresh required
- if realtime drops temporarily, normal query refetch/reconnect should eventually reconcile state

Do not build a custom sync engine.

Use the database and Realtime as the canonical system.

---

# 77. WHAT NOT TO DO

Do not:

- build a localStorage-first app
- keep separate conflicting copies of chore state on each phone
- put all logic in giant page components
- build a unique header for every route
- hardcode typography independently on each page
- hardcode random colors throughout JSX
- calculate recurrence independently on multiple screens
- edit future recurrence by rewriting completed history
- assume a task completed today was necessarily scheduled today
- make reminders global for both users
- expose service-role credentials client-side
- defer RLS until "later"
- build every future feature into v1
- turn the app into a generic project-management product

---

# 78. DESIGN MANTRA

**Colorful shared-home app. One shared source of truth. One shared visual system.**

The app should feel like Mallory and Nik share a tiny, cheerful home dashboard that happens to be extremely well engineered underneath.

---

# 79. FIRST CODEX PROMPT

After placing this file at the root of the repository as:

`OUR_HOME_BLUEPRINT.md`

start Codex with:

> Read `OUR_HOME_BLUEPRINT.md` in full and treat it as the source of truth for this project. We are starting from scratch. **The $0/month requirement is absolute: do not introduce any paid service, billing-required API, paid hosting tier, or purchased domain.** Implement **Phase 0 — Foundation only**. Prioritize the global design system, centralized configurable branding (working name: `Tandem`), shared `AppFrame`, universal `PageShell`/`PageHeader`, shared bottom navigation, mobile-first route skeletons, PWA manifest setup, and test/lint/typecheck foundation. Do not implement Supabase business logic yet. The main goal of Phase 0 is to make it structurally difficult for future pages to drift in fonts, header size, alignment, spacing, and general page chrome. When complete, run the relevant checks and give me a concise summary of what you created and anything I need to do manually.

---

# 80. SECOND CODEX PROMPT

Once Phase 0 is working:

> Re-read `OUR_HOME_BLUEPRINT.md`. Implement **Phase 1 — Supabase + Auth + Household** only. Preserve the shared page/layout system exactly rather than creating custom auth/app headers. Create repository migrations and RLS policies instead of relying on undocumented manual database changes. Add `.env.example`, account creation/sign-in/sign-out, household creation, invite code/link joining, and the required data access layer. Run lint, typecheck, and tests. At the end, tell me exactly what values/services I need to configure outside the repo.

---

# 81. PRODUCT DECISIONS LOG

These choices are intentional and should not be "simplified" away:

### Decision: working product name is Tandem
Reason:
Mallory likes the name Tandem, but wants the app to remain easy to rename later. The name, tagline, manifest values, and related branding should therefore come from centralized configuration rather than hardcoded literals across the project.

### Decision: reminders are push-only
Reason:
Mallory wants phone push reminders, not email reminders. The reminder system should therefore use standards-based Web Push only in v1 and should not expose email as a reminder channel.

### Decision: PWA rather than native app
Reason:
Mallory and Nik want to install the app privately on their phones without App Store / Play Store distribution.

### Decision: Supabase rather than local device storage
Reason:
Both users must share state and see each other's updates quickly.

### Decision: Cloud database is authoritative
Reason:
Avoid the local-first architecture used in earlier personal projects where data could not naturally synchronize between users.

### Decision: universal PageShell from day one
Reason:
Previous project experience showed that independently built pages gradually drifted in font, size, header alignment, and spacing.

### Decision: global typography and color tokens
Reason:
Global changes should be possible in one place.

### Decision: chore definition separated from occurrence
Reason:
Reliable recurrence, history, rescheduling, skipping, and early completion all require separating "the rule" from "this week's instance."

### Decision: reminders are per-user
Reason:
Shared chore does not imply shared notification preferences.

### Decision: chores are shared and never assigned
Reason:
Tandem is a shared household system, not a responsibility-assignment system. Every member may manage or complete any chore. The app records the actual completer later, while personal reminder subscriptions remain independent and never imply ownership.

### Decision: completed chores remain visible
Reason:
The other household member should be able to see that the chore was already handled.

---

# END OF BLUEPRINT
