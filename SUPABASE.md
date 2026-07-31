# AiWee — Supabase backend

Live incidents + personal SOS, shared across every web and mobile client via
Supabase Realtime. The app runs **with or without** this backend:

- **Configured** → live data + SOS sync across devices (Realtime websockets).
- **Not configured** → the existing client-side collection runs (single device).

Everything is env-gated, so nothing here is required to run the app locally.

---

## What's in `supabase/`

```
supabase/
  config.toml                      local dev config
  migrations/
    …_schema.sql                   incidents, emergencies, emergency_track, RPCs
    …_rls.sql                      row-level security policies
    …_realtime.sql                 realtime publication
  functions/
    _shared/heuristics.ts          text → incident classification (Deno)
    _shared/sources.ts             Google News / GDELT / outlets / Reddit (Deno)
    _shared/cors.ts
    collect/index.ts               scheduled collector → upserts incidents
    report/index.ts                anonymous citizen report → incident
```

The collectors are the same logic the browser uses, but run **server-side** —
so no CORS proxy, no rate-limit bursts, and Reddit isn't blocked.

---

## 1. Create the project

1. Create a project at <https://supabase.com/dashboard>.
2. Grab **Project URL** and **anon key** from *Project Settings → API*.

## 2. Link + push the schema

```bash
npm i -g supabase                 # or: npx supabase ...
supabase login
supabase link --project-ref <your-project-ref>
supabase db push                  # applies the migrations
```

## 3. Deploy the Edge Functions

```bash
supabase functions deploy collect
supabase functions deploy report
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.
Optionally set the news window:

```bash
supabase secrets set INCIDENT_RECENCY_DAYS=30
```

## 4. Schedule collection (every 15 min)

A ready-to-apply migration ships this: `migrations/…_cron.sql` (project ref
already baked in). It uses **Vault** so your service key never lives in the repo.

Run **once** in the SQL editor to store the key:

```sql
select vault.create_secret(
  '<your-service-role-key>',   -- Project Settings → API → service_role
  'aiwee_service_key'
);
```

Then apply the migration (part of `supabase db push`) and kick off a first run:

```bash
supabase functions invoke collect
```

**Dashboard alternative:** *Database → Cron Jobs → New job*, schedule
`*/15 * * * *`, HTTP POST to your `collect` function URL.

## 5. Point the apps at it

**Web** — add to `.env`:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

**Mobile** — add to `mobile/.env` (see `mobile/README.md`):

```
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

Restart the dev server. The web LiveBadge switches to backend-sourced data and
new incidents/SOS stream in live.

---

## Data model (quick reference)

| Table | Purpose |
|---|---|
| `incidents` | live + citizen incidents; `dedup_key` prevents duplicate rows across collector runs |
| `emergencies` | personal SOS; latest GPS position mirrored onto the row |
| `emergency_track` | full live GPS trail per emergency |

RPCs (callable with the anon key): `confirm_incident`, `ack_emergency`,
`vote_safe_emergency`, `resolve_emergency`.

## Security note (MVP posture)

RLS is enabled. Clients can **read** all live data and **create/track** an SOS;
incident writes happen through Edge Functions (service role). This is
intentionally permissive for an anonymous civic app. Before production, add
Supabase Auth and tighten the `emergencies`/`emergency_track` insert/update
policies to device ownership, and require a shared secret / JWT on `collect`.

## Removing the old Express backend

An earlier `server/` (Express + SSE) exists as a self-hostable alternative. If
you're going with Supabase, it can be deleted — nothing in the app imports it.
