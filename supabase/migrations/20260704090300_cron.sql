-- Scheduled collection: run the `collect` Edge Function every 15 minutes so the
-- incidents table stays fresh with zero manual effort.
--
-- Prerequisites (run ONCE in the SQL editor, before or after this migration):
--   1. Deploy the function:      supabase functions deploy collect
--   2. Store the service key in Vault (keeps it out of the repo):
--        select vault.create_secret(
--          '<your-service-role-key>',   -- Project Settings → API → service_role
--          'aiwee_service_key'
--        );
--
-- Re-running this migration is safe: it unschedules the old job first.

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  perform cron.unschedule('aiwee-collect');
exception when others then
  null; -- job didn't exist yet
end $$;

select cron.schedule(
  'aiwee-collect',
  '*/15 * * * *',
  $job$
  select net.http_post(
    url     := 'https://xpvytqdzuoxtjftzpnhe.supabase.co/functions/v1/collect',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'aiwee_service_key'
      )
    ),
    body    := '{}'::jsonb
  );
  $job$
);
