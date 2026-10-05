# Vercel Hobby deployment

Tandem can run at $0/month for its intended two-person, personal use with Vercel Hobby, Supabase
Free, the included `*.vercel.app` HTTPS URL, and standards-based Web Push. Do not attach billing or
add a paid domain, push provider, email service, or Vercel Cron job.

## 1. Create the Vercel project

Import this repository into a Vercel Hobby project. Keep the detected framework as **Next.js** and
the standard commands (`npm run build` and `npm install`). No localhost URL is used by production
code, and no custom domain is required.

## 2. Add only the Next.js environment values

In **Project Settings → Environment Variables**, add these to Production (and Preview only if the
preview URL is allowed by Supabase):

```text
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
NEXT_PUBLIC_VAPID_PUBLIC_KEY=YOUR_VAPID_PUBLIC_KEY
HOUSEHOLD_TIME_ZONE=America/Chicago
```

For an older Supabase project, use `NEXT_PUBLIC_SUPABASE_ANON_KEY` instead of the publishable key.
Do not add `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY`, `REMINDER_CRON_SECRET`, or a database
password to Vercel. Those secrets belong only in Supabase/its Edge Function environment. The VAPID
private key, cron secret, service-role key, and database password must never use `NEXT_PUBLIC_*`
variables. Redeploy after changing a `NEXT_PUBLIC_*` value because it is embedded at build time.

## 3. Configure Supabase Auth for the final URL

In **Authentication → URL Configuration**:

1. Set **Site URL** to `https://YOUR-APP.vercel.app`.
2. Add `https://YOUR-APP.vercel.app/**` to allowed redirect URLs.
3. Add a Preview URL pattern only if preview deployments need authenticated testing.
4. Keep email/password enabled and Confirm Email off for the initial private setup.
5. After both intended accounts exist, turn **Allow new users to sign up** off while leaving the
   email provider enabled.

## 4. Confirm the already-configured reminder backend

Follow [`PHASE5_PUSH_SETUP.md`](./PHASE5_PUSH_SETUP.md) if the Edge Function or Cron job must be set
up again. The previously committed cron secret must be rotated before production; use the new value
in both Supabase Function secrets and the placeholder-based SQL setup. The `send-reminders` function needs `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
`VAPID_SUBJECT`, `REMINDER_CRON_SECRET`, and `PUSH_APP_NAME` in Supabase. The
`tandem-reminder-scan` Supabase Cron job should remain on its five-minute schedule.

For this Phase 6 update, run `npx supabase db push` and redeploy `send-reminders` with
`npx supabase functions deploy send-reminders --no-verify-jwt`. No new secret or Vercel
environment variable is required.

## 5. Deploy and verify

After deployment:

1. Open `/manifest.webmanifest`, `/sw.js`, and `/offline.html` on the production URL.
2. Sign in and verify Home, Calendar, Chores, History, Household, and settings.
3. Install from Safari on iPhone and Chrome on Android; confirm top and bottom safe areas.
4. Enable notifications only from Notification Settings, send a test, and open it.
5. Complete a chore from the second account and confirm the first open device updates via Realtime.
6. Load a page once, go offline, navigate or reload, and confirm the branded fallback appears.

Supabase Free may pause after provider-defined inactivity and can require manual restoration. That
tradeoff is acceptable for this private $0 deployment; the app does not try to bypass it.
