-- Run once in Supabase Dashboard -> SQL Editor after replacing both placeholders.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'tandem_project_url');
select vault.create_secret('REPLACE_WITH_A_LONG_RANDOM_SECRET', 'tandem_reminder_cron_secret');

select cron.schedule(
  'tandem-reminder-scan',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'tandem_project_url') || '/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'tandem_reminder_cron_secret')
    ),
    body := '{"mode":"scheduled"}'::jsonb
  );
  $$
);
