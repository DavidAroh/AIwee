# AiWee Mobile (Expo / React Native)

The native app for citizens — live incident feed + one-touch SOS, sharing the
same Supabase backend as the web app. Built with Expo so you can run it on your
phone via **Expo Go** with no Android Studio / Xcode.

## Why React Native (not Flutter)

The whole project is React + TypeScript. The stores, types, collection
heuristics, and Supabase data layer port almost verbatim — so RN reuses the
existing code and mental model instead of rewriting everything in Dart.

## Run it

```bash
cd mobile
cp .env.example .env         # fill in your Supabase URL + anon key
npm install
npm start                    # scan the QR code with Expo Go
```

Requires the Supabase backend from [`../SUPABASE.md`](../SUPABASE.md) to be set
up (schema pushed + `collect` function scheduled). Without env vars the app
shows a setup screen.

## What's wired now

Faithful port of the web Citizen app. All screens share one live source
(`useLiveData` → Supabase Realtime), so an incident or SOS from any device shows
up everywhere at once.

- **Home** (`HomeScreen`) — header (logo, Map/Feed toggle, LIVE badge,
  AI-sourced chip), map with ACTIVE/VERIFIED stat cards, incident ticker, and
  web-style feed cards. Carto light tiles, type-colored markers, live SOS
  markers + dashed GPS trails.
- **Incident drawer** (`IncidentDrawer`) — tap any card or map marker → bottom
  sheet with badges, confidence bar, severity/reports/status grid, cues, source,
  and **crowd verification** (YES/NO → `confirm_incident` RPC).
- **SOS** — press & hold the red button → confirm → creates an emergency,
  vibration alarm + keep-awake, streams GPS to `emergency_track`. "I'm Safe"
  resolves it.
- **Safety Timer** (`SafetyTimer`) — dead-man's switch on the map: pick a
  duration; if you don't check in, an SOS fires automatically.
- **Report** (`ReportScreen`) — type grid + description → `report` Edge Function.
- **Alerts** (`AlertsScreen`) — Live / Alerts sub-tabs, SOS + incident cards,
  tap to open the drawer.
- **Profile** (`ProfileScreen`) — avatar, stats, trust level, copy-ID, and a
  **settings sheet** (alert radius + notification toggles).

### Maps: platform note

The map uses the **default** provider, so **iOS runs with no API key** (Apple
Maps base + Carto tile overlay). **Android** (Google Maps) needs a free key —
add it to `app.json`:

```json
"android": {
  "config": { "googleMaps": { "apiKey": "YOUR_ANDROID_MAPS_KEY" } }
}
```

Get one from the Google Cloud console (Maps SDK for Android). Without it the
Android base map is blank; iOS is unaffected.

## Roadmap (next ports)

| Area | Plan |
|---|---|
| Map | Add `react-native-maps` with incident + SOS markers and the live trail |
| Report | Reuse the `report` Edge Function; camera via `expo-image-picker` |
| Alerts / Profile | Port the web tabs; add bottom-tab navigation (`expo-router`) |
| Loud siren | Bundle `siren.mp3`, loop via `expo-av` (hook in `services/sos.ts`) |
| Flashlight strobe | `expo-camera` torch toggle loop |
| Push notifications | `expo-notifications` + a Supabase DB webhook on new SOS |
| Safety Timer | Port the dead-man's-switch; background via `expo-task-manager` |

## Shared code

`src/lib/types.ts` mirrors the web incident/emergency shapes and the Supabase
row mappers, so both apps speak the same language against the same tables.
