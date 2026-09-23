# Supabase setup

This setup uses a Supabase Free project and its public publishable key. It does not require a paid
email provider, service-role key, custom domain, or billing information.

## 1. Create the free project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create an account if needed.
2. Choose **New project**.
3. Select the **Free** plan. Do not add billing or upgrade the project.
4. Choose an organization, enter a project name, and create a strong database password.
5. Save the database password somewhere safe. It is used by the CLI when migrations are applied;
   it does not belong in the app's environment variables.
6. Wait for the project status to become healthy.

## 2. Add local environment values

1. In the Supabase project, click **Connect** near the top of the dashboard.
2. Choose the **App Frameworks** or **Next.js** connection view.
3. Copy the **Project URL** and **Publishable key**.
4. Copy `.env.example` to a new file named `.env.local`.
5. Set:

```text
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Some older projects show a legacy **anon/public** key instead. In that case, leave the publishable
key blank and put the legacy key in `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Never copy the `service_role`, secret, or database password into a `NEXT_PUBLIC_*` variable. The
Next.js app does not need a service-role key. Supabase supplies it directly to the deployed reminder
Edge Function; never add it to Vercel.

## 3. Apply the repository migration

Open a terminal in this repository and run:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

- The project ref is the portion before `.supabase.co` in the Project URL.
- The browser login authorizes the CLI to manage only projects your Supabase account can access.
- `supabase link` may ask for the database password created in step 1.
- `supabase db push` applies all repository migrations in order.

After the push, open **Table Editor** in Supabase. Confirm these tables exist:

- `profiles`
- `households`
- `household_members`

Open **Database → Policies** and confirm RLS is enabled for all three tables. Do not add broad
dashboard policies; the migration already defines the required policies and grants.

## 4. Configure private email/password authentication

In the Supabase dashboard:

1. Open **Authentication → Providers** (sometimes labeled **Sign In / Providers**).
2. Open the **Email** provider.
3. Keep the Email provider enabled.
4. Turn **Allow new users to sign up** on temporarily.
5. Turn **Confirm Email** off. This makes a new email/password account immediately usable without
   sending a confirmation message.
6. Keep anonymous sign-ins off.
7. Do not enable Magic Link, email OTP, social providers, custom SMTP, or password-recovery email.
8. Leave password-change security notification emails disabled so changing a password does not
   introduce an email-delivery dependency.

Then open **Authentication → URL Configuration**:

1. For local development, set **Site URL** to `http://localhost:3000`.
2. Add `http://localhost:3000/**` to the allowed redirect URLs if the dashboard asks for one.
3. After deployment, change **Site URL** to the free Vercel URL and add
   `https://YOUR-APP.vercel.app/**` to the allowed redirect URLs. A custom domain is not required.

## 5. Create the two private accounts

1. Start the app with `npm run dev` and open `http://localhost:3000`.
2. Create the first account. Create the household from the setup screen.
3. On the Household screen, copy the invite link.
4. Open the link in another browser profile or private window.
5. Create the second account and join using the invite.
6. Verify that both users see the same household and both member names.
7. Return to **Authentication → Providers → Email** and turn **Allow new users to sign up** off.
   Keep the Email provider itself enabled. Existing users will continue to sign in normally, but
   additional public account creation will be blocked.

## 6. Optional database verification

The regular `npm test` command runs the migration and RLS scenarios in embedded PostgreSQL, so it
does not require Docker or touch the hosted project.

The repository also contains a Supabase-native pgTAP suite. To run it locally, install and start
Docker Desktop, then run:

```bash
npm run db:start
npm run db:reset
npm run db:test
```

The suite verifies that an outsider cannot read or update another household, a valid invite grants
membership, fellow members become visible, malformed invites reveal nothing, and a user cannot
join or create a second active household.

## 7. Vercel deployment

Follow [`VERCEL_DEPLOYMENT.md`](./VERCEL_DEPLOYMENT.md). The free `*.vercel.app` URL is sufficient.
