-- Broadcast row changes over Supabase Realtime so web + mobile clients receive
-- live incident and SOS updates with no polling.

-- Full row data on UPDATE/DELETE (needed for emergency last-position updates).
alter table public.incidents       replica identity full;
alter table public.emergencies     replica identity full;
alter table public.emergency_track replica identity full;

do $$
begin
  -- The publication exists by default on Supabase; guard the ADD in case a
  -- table was already a member.
  begin
    alter publication supabase_realtime add table public.incidents;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.emergencies;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.emergency_track;
  exception when duplicate_object then null; end;
end $$;
