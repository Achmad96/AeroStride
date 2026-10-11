# Run Tracker (MVP)

Expo (React Native + TypeScript) run tracker: GPS + background tracking, live stats, route map, local SQLite history. No backend, no login.

## Plan & assumptions

- **Dev build required for background tracking.** Expo Go cannot do background location. Use a development build (`expo run:android` / `expo run:ios`, or EAS). Everything else (UI, maps, history) works in Expo Go in the foreground.
- **Single source of GPS data:** one `expo-location` background task feeds a Zustand store, in the foreground and background alike.
- **Tracking logic is pure** (`src/tracking/tracker.ts`): state in → new state out. It is unit-tested and its state is JSON-serialisable, which is how crash recovery works.
- **Crash recovery:** the run state is snapshotted to SQLite (`kv` table) every 5 s and on every pause/resume/stop. On relaunch, an "Unsaved run found" prompt appears. A recovered run comes back **paused**, counted only up to its last GPS point.
- **Filters:** accuracy > 30 m rejected; implied speed > 12 m/s (~43 km/h) rejected; steps < 2 m ignored (standing jitter). The distance covered while paused is never counted.
- Weeks start on **Monday**. Runs < 10 m cannot be saved.
- Android maps need a Google Maps API key (`app.json` → `android.config.googleMaps.apiKey`). iOS uses Apple Maps.
- Delete is by **long-press** in History.

## Folder structure

```
app/                       Expo Router screens
  _layout.tsx              Root stack, registers background task, loads settings
  (tabs)/_layout.tsx       Tabs: Home / History / Settings
  (tabs)/index.tsx         Home: weekly summary + Start Run, crash recovery prompt
  (tabs)/history.tsx       Saved runs, long-press to delete
  (tabs)/settings.tsx      km / miles
  active.tsx               Live timer, distance, pace, map, pause/resume/stop
  summary.tsx              Post-run summary, Save / Discard
  detail/[id].tsx          Saved run detail
  permission.tsx           Permission explanation screen
src/
  tracking/geo.ts          Haversine, pace, formatting
  tracking/tracker.ts      Pure tracking logic (filters, pause, recovery)
  tracking/locationService.ts  Permissions + background location task
  tracking/__tests__/      Jest unit tests
  db/database.ts           expo-sqlite access (runs + kv)
  store/runStore.ts        Active run state (Zustand) + snapshotting
  store/settingsStore.ts   Unit setting
  components/              Button, Stat, RunMap, RunDetailView
  theme.ts                 Light/dark high-contrast palette
```

## Setup

```bash
npm install
npm test               # unit tests
npm run typecheck
npx expo start         # UI in Expo Go (foreground only)

# Full functionality incl. background tracking (development build):
npx expo run:android   # or: npx expo run:ios  (needs macOS/Xcode)
npx expo start --dev-client
```

If `npm install` reports version mismatches, run `npx expo install --fix`.

Permissions are configured in `app.json`:
- iOS: `UIBackgroundModes: ["location"]` and the `NSLocation*UsageDescription` strings.
- Android: `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, plus the `expo-location` plugin flags `isAndroidBackgroundLocationEnabled` and `isAndroidForegroundServiceEnabled`.

## Test plan

**Automated** (`npm test`): Haversine accuracy; accuracy filter; speed-jump filter and self-healing; jitter; out-of-order fixes; pause/resume time and distance; late fixes after resume; current/average pace; <10 m rule; crash recovery; unit formatting.

**Manual outdoor checklist**
- [ ] First launch: tapping Start shows the OS permission prompt; denying it shows the explanation screen; "Open Settings" works.
- [ ] Start outdoors: "Waiting for GPS" banner disappears within ~30 s; route line draws; map follows you.
- [ ] Run or walk a known 1 km (track or measured route): distance within ~3%.
- [ ] Timer, distance and pace update every second; pace is stable (not jumping wildly).
- [ ] Lock the screen for 5 min while moving; unlock: route continuous, time correct.
- [ ] Switch to another app for 5 min: tracking continues (Android shows the notification, iOS shows the blue status bar).
- [ ] Pause for 2 min and walk 100 m while paused: time and distance do not increase; resume continues correctly.
- [ ] Stop → Cancel in the dialog keeps running; Stop → confirm goes to the summary.
- [ ] Summary: distance, duration, pace, date and full-route map are correct; Save adds it to History; Discard (with confirm) does not.
- [ ] Stand still for 2 min: distance stays ~0. Walk through a tunnel/building: "GPS signal lost" banner shows, the timer continues, no distance spike afterwards.
- [ ] Run < 10 m: Save is disabled with a message.
- [ ] Force-kill the app mid-run → relaunch → "Unsaved run found" → Recover shows a paused run with the right distance; Resume continues.
- [ ] History: newest first; tap opens detail; long-press deletes after confirm.
- [ ] Settings: miles toggle changes distance and pace everywhere, and persists after restart.
- [ ] Dark mode and light mode are both readable in direct sunlight; all buttons are easy to hit while running.
- [ ] Battery: 30 min run costs a reasonable amount (< ~10%).

## Suggested post-MVP features (by priority)

1. Auto-pause when standing still.
2. Per-km/mile splits and a pace chart.
3. Elevation gain (barometer / altitude).
4. Export GPX/TCX and share a run.
5. Edit or trim a run; notes; manual runs.
6. Personal records and weekly/monthly goals.
7. Audio cues per km.
8. Kalman/smoothing of the route for a cleaner polyline.
9. Cloud backup/sync (Supabase/Firebase) and accounts.
10. Training plans, wearables, social features.

