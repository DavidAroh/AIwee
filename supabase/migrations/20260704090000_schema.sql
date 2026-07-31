-- AiWee schema — live incidents + personal SOS emergencies.
-- Realtime + RLS are configured in the following migrations.

-- ── Incidents (collected live + citizen reports) ────────────────────────────────
create table if not exists public.incidents (
  id                     text primary key,
  type                   text not null default 'Other',
  description            text not null default '',
  summary                text not null default '',
  location_name          text not null default 'Port Harcourt',
  latitude               double precision not null,
  longitude              double precision not null,
  severity               integer not null default 5,
  confidence             integer not null default 60,
  status                 text not null default 'UNVERIFIED',   -- UNVERIFIED | VERIFIED | CLOSED
  reporters_count        integer not null default 1,
  source_kind            text not null default 'news',         -- news | social | citizen | ai
  outlet                 text,
  url                    text,
  cues                   text[] not null default '{}',
  corroborating_evidence text[] not null default '{}',
  media_url              text,
  -- Stable de-duplication key (type + headline fingerprint) so repeated
  -- collector runs upsert instead of piling up duplicate rows.
  dedup_key              text unique,
  event_time            timestamptz not null default now(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists incidents_event_time_idx on public.incidents (event_time desc);
create index if not exists incidents_status_idx on public.incidents (status);
create index if not exists incidents_type_idx on public.incidents (type);

-- ── Emergencies (personal SOS) ──────────────────────────────────────────────────
create table if not exists public.emergencies (
  id            text primary key,
  level         text not null,                    -- THREAT | MEDICAL | KIDNAP | VIOLENCE | SILENT
  status        text not null default 'ACTIVE',   -- ACTIVE | RESOLVED
  started_at    timestamptz not null default now(),
  resolved_at   timestamptz,
  note          text,
  auto          boolean not null default false,
  battery       integer,
  safe_votes    integer not null default 0,
  acks          integer not null default 0,
  source        text not null default 'self',     -- self | sim
  device_id     text,
  last_lat      double precision,
  last_lng      double precision,
  last_accuracy double precision,
  last_speed    double precision,
  created_at    timestamptz not null default now()
);

create index if not exists emergencies_status_idx on public.emergencies (status);
create index if not exists emergencies_started_idx on public.emergencies (started_at desc);

-- ── Live GPS trail for each emergency ───────────────────────────────────────────
create table if not exists public.emergency_track (
  id           bigint generated always as identity primary key,
  emergency_id text not null references public.emergencies(id) on delete cascade,
  lat          double precision not null,
  lng          double precision not null,
  accuracy     double precision,
  speed        double precision,
  t            timestamptz not null default now()
);

create index if not exists emergency_track_eid_idx on public.emergency_track (emergency_id, t);

-- Mirror the newest track point onto the emergency row so a single SELECT gives
-- the current position (and to feed realtime UPDATE events on the row).
create or replace function public.sync_emergency_last_point()
returns trigger
language plpgsql
as $$
begin
  update public.emergencies
     set last_lat = new.lat,
         last_lng = new.lng,
         last_accuracy = new.accuracy,
         last_speed = new.speed
   where id = new.emergency_id;
  return new;
end;
$$;

drop trigger if exists trg_sync_last_point on public.emergency_track;
create trigger trg_sync_last_point
  after insert on public.emergency_track
  for each row execute function public.sync_emergency_last_point();

-- ── Mutation RPCs (called by anon clients; run with definer rights) ──────────────
create or replace function public.confirm_incident(p_id text, p_confirmed boolean)
returns void
language sql
security definer
set search_path = public
as $$
  update public.incidents
     set reporters_count = reporters_count + case when p_confirmed then 1 else 0 end,
         confidence = greatest(10, least(99, confidence + case when p_confirmed then 12 else -5 end)),
         status = case
           when p_confirmed and reporters_count + 1 >= 3 and status = 'UNVERIFIED'
           then 'VERIFIED' else status end,
         updated_at = now()
   where id = p_id;
$$;

create or replace function public.ack_emergency(p_id text)
returns void language sql security definer set search_path = public as $$
  update public.emergencies set acks = acks + 1 where id = p_id and status = 'ACTIVE';
$$;

create or replace function public.vote_safe_emergency(p_id text)
returns void language sql security definer set search_path = public as $$
  update public.emergencies set safe_votes = safe_votes + 1 where id = p_id and status = 'ACTIVE';
$$;

create or replace function public.resolve_emergency(p_id text)
returns void language sql security definer set search_path = public as $$
  update public.emergencies
     set status = 'RESOLVED', resolved_at = now()
   where id = p_id;
$$;
