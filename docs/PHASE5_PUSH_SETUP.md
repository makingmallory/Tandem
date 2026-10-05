# Phase 5 push setup

These steps keep Tandem on Supabase Free and Vercel Hobby. Do not commit generated keys.

## 1. Generate VAPID keys

From a terminal, run:

```powershell
npx web-push generate-vapid-keys
```

Copy the public and private values somewhere secure. The public value is safe for the browser. The private value is an Edge Function secret and must never use a `NEXT_PUBLIC_` name.

Generate a separate cron secret:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

## 2. Apply the database migration

This also applies the Phase 6 dynamic-notification migration. Existing reminders remain set to the
due date, while the updated UI can save multiple day-, week-, or calendar-month-based notifications,
each with its own local time.

```powershell
cd "C:\Users\mbbam\OneDrive\Documents\Projects\Tandem"
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

## 3. Configure and deploy the Edge Function

Replace the example values without adding quote characters:

```powershell
npx supabase secrets set VAPID_PUBLIC_KEY=YOUR_PUBLIC_KEY VAPID_PRIVATE_KEY=YOUR_PRIVATE_KEY VAPID_SUBJECT=mailto:YOUR_EMAIL REMINDER_CRON_SECRET=YOUR_CRON_SECRET PUSH_APP_NAME=Tandem
npx supabase functions deploy send-reminders --no-verify-jwt
```

Redeploy `send-reminders` after applying the Phase 6 migration even when its secrets are already
configured. The function now includes dynamic offset-aware notification copy and expects the expanded
claim result.

Supabase injects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` into the function automatically. Do not put the service-role key in Vercel.

## 4. Configure Supabase Cron

The cron secret was previously committed in repository history. Generate a new secret before
production and use it both here and as `REMINDER_CRON_SECRET` for the Edge Function. Do not reuse
the historical value.

Open `supabase/cron/setup_reminder_cron.sql`. Replace:

- `YOUR_PROJECT_REF` with the project reference shown in Supabase Dashboard → Project Settings → General.
- `REPLACE_WITH_A_LONG_RANDOM_SECRET` with the newly generated `REMINDER_CRON_SECRET` used above.

In Supabase Dashboard, open **SQL Editor**, choose **New query**, paste the edited file, and click **Run**. Then open **Integrations → Cron** and confirm `tandem-reminder-scan` is scheduled for every five minutes.

## 5. Configure Vercel

Open Vercel → the Tandem project → **Settings → Environment Variables**. Add:

```text
NEXT_PUBLIC_VAPID_PUBLIC_KEY=YOUR_PUBLIC_KEY
```

Select Production, Preview, and Development if desired, save, then redeploy. Only the VAPID public key
belongs in a `NEXT_PUBLIC_*` variable. Never put the VAPID private key, cron secret, service-role key,
or database password in any `NEXT_PUBLIC_*` variable.

## 6. Install and enable notifications

### iPhone/iPad

1. Open the production Vercel URL in Safari.
2. Tap Share.
3. Tap **Add to Home Screen**, then **Add**.
4. Launch Tandem from its Home Screen icon.
5. Open Household → Notification settings → **Enable notifications**.
6. Allow the iOS permission prompt.

### Android

1. Open the production URL in Chrome.
2. Use Tandem's Install button, or Chrome menu → **Install app**.
3. Launch the installed app.
4. Open Household → Notification settings → **Enable notifications**.
5. Allow the Android permission prompt.

## 7. Test the real push path

1. In Notification Settings, confirm “Notifications enabled on this device.”
2. Tap **Send test notification**.
3. Background or close the PWA and confirm the system notification appears.
4. Tap it and confirm Tandem opens Notification Settings.

## 8. Test completion suppression

1. Open an active chore due today.
2. Turn **Notifications** on, select **On the due date**, and choose a time in the next five to ten minutes.
3. On the other household account, complete the same occurrence before that time.
4. Wait through the next five-minute Cron scan.
5. Confirm no reminder is delivered. The delivery query checks the shared occurrence status immediately before sending, so either member's completion suppresses it.
