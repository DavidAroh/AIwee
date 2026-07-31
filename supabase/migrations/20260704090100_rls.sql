-- Row Level Security. MVP posture: anyone (anon key) can READ live data and
-- create/track an SOS; incident writes come from Edge Functions (service role,
-- which bypasses RLS). Mutations that need auth-free client access go through the
-- SECURITY DEFINER RPCs in the schema migration.
--
-- For production, add Supabase Auth and tighten INSERT/UPDATE to authenticated
-- users / device ownership.

alter table public.incidents        enable row level security;
alter table public.emergencies      enable row level security;
alter table public.emergency_track  enable row level security;

-- Incidents: public read-only for clients (collector writes via service role).
drop policy if exists incidents_read on public.incidents;
create policy incidents_read on public.incidents
  for select using (true);

-- Emergencies: public read; anyone may raise one and update their own via id.
drop policy if exists emergencies_read on public.emergencies;
create policy emergencies_read on public.emergencies
  for select using (true);

drop policy if exists emergencies_insert on public.emergencies;
create policy emergencies_insert on public.emergencies
  for insert with check (true);

drop policy if exists emergencies_update on public.emergencies;
create policy emergencies_update on public.emergencies
  for update using (true) with check (true);

-- Emergency track: public read; anyone may append points to an active emergency.
drop policy if exists track_read on public.emergency_track;
create policy track_read on public.emergency_track
  for select using (true);

drop policy if exists track_insert on public.emergency_track;
create policy track_insert on public.emergency_track
  for insert with check (
    exists (
      select 1 from public.emergencies e
      where e.id = emergency_id and e.status = 'ACTIVE'
    )
  );

-- Allow anon/authenticated to execute the mutation RPCs.
grant execute on function public.confirm_incident(text, boolean) to anon, authenticated;
grant execute on function public.ack_emergency(text)             to anon, authenticated;
grant execute on function public.vote_safe_emergency(text)       to anon, authenticated;
grant execute on function public.resolve_emergency(text)         to anon, authenticated;
