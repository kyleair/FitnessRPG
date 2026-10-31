# Fitness Tracker

An Expo / React Native fitness RPG for iPhone and Android, with browser-based Strava connection and a persistent local backend.

## First run on your phone

GitHub Actions runs `npm test`, `npm run lint`, and `npm run typecheck` on pull requests and pushes to `main`, using Node 24. Run the same commands locally before opening a PR. Tests use simulated Strava responses and temporary databases; no `.env` files or Strava credentials are needed in CI.

A separate Gitleaks check scans commits for accidentally committed secrets. `.env` files and `server/.data/` remain ignored; only `.env.example` templates belong in Git. The scanner uses GitHub's automatic token and needs no manually configured secrets for this personal repository.

Prerequisite: Node.js 22.13+ (Node 24 LTS recommended). Dependencies are already installed on this computer. After cloning on another computer, run `npm ci` first.

1. Install Expo Go on your iPhone or Android.
2. Connect your computer and phone to the same Wi-Fi network.
3. Open PowerShell in this folder and run:

   ```powershell
   npx expo login
   npm start
   ```

4. Sign into the same Expo account in Expo Go. On iPhone, scan the terminal's QR code with the Camera app and open it in Expo Go. On Android, use Expo Go's QR scanner.
5. You should see the Classic RPG dashboard with sample activities. No `.env`, Strava account, backend, Mac, or Apple developer membership is needed for this demo.
6. Edit `src/screens/HomeScreen.tsx` and save to see Fast Refresh on your phone. Keep the terminal running; Ctrl+C stops it.

This project uses SDK 58 to match Expo Go 58 on your phone. After an SDK upgrade, stop the old Metro terminal with Ctrl+C and run `npx expo start --clear` before scanning the new QR code. See https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/ for future upgrades.

### Connection troubleshooting

- Allow Node.js through Windows Firewall on your **private** network if prompted. Allow Expo Go access to the local network on iPhone.
- Guest/public Wi-Fi may block devices from talking to one another. Try a home network or hotspot.
- If the QR connection fails, stop Expo and try `npx expo start --tunnel`. Accept the tunnel dependency installation if prompted. This tunnels Metro only; it does not expose the optional backend.
- For a stale bundle, run `npx expo start --clear`.
- If Metro reports `Unable to resolve module ./index`, pull the latest branch and restart Expo with `npx expo start --clear`, then scan the new QR code. The root `index.ts` delegates to Expo Router and is also the configured package entry; no alternate launch command is needed.
- `npm run ios` launches a simulator and requires macOS. Use `npm start` for your physical iPhone on Windows.

## Connect Strava in Expo Go

One backend owns the FitnessRPG Strava application credentials; each phone signs into its own Strava account. Your friend does not need a separate developer registration when using that backend. The application must have capacity for both athletes in Strava API settings.

1. Run `npm ci` after pulling. Use Node 22.13+ (Node 24 recommended; older supported releases may print a SQLite experimental warning).
2. Keep `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` in `server/.env`. Copy the example only if your file does not exist. No refresh token or CLI connection command is needed.
3. Set `PUBLIC_BACKEND_URL=http://YOUR_COMPUTER_LAN_IP:3001` in `server/.env`, and the same URL as `EXPO_PUBLIC_API_URL` in root `.env`. Use the address reachable from the phone, not localhost. Find it with `ipconfig`.
4. Leave the Strava callback-domain setting unchanged. Authorization now uses `http://127.0.0.1:3001/auth/strava/callback` in your **computer browser**. Strava allows this loopback address regardless of the registered callback domain. If you change `PORT`, the generated browser address and callback use that port.
5. Start `npm run server`, then `npx expo start --clear` in a second terminal. Open Expo Go on the same network.
6. Tap **Connect Strava** in Expo Go to get a code. On the computer running the backend, open `http://127.0.0.1:3001/connect`, enter that code, and click **Continue to Strava**. Sign into your own athlete account and approve activity access. On the phone, tap **Check connection** (or leave and return to Expo Go). Do not open the loopback address on your phone.

New connections request `activity:read` by default. Existing connections and imported snapshots are retained; broader activity grants remain supported. New connections and reconnections use the computer-browser code flow. The old shared `server/.data/tokens.json` is not automatically assigned to the first phone that connects. The old CLI helper has been removed; `STRAVA_REFRESH_TOKEN` is no longer used by the API.

A dedicated FitnessRPG Strava registration is preferable to the website's registration. Changing a shared application's callback domain can disrupt the website's sign-in flow, and separate processes refreshing the same athlete/application authorization can invalidate each other's tokens. This change does not edit website configuration or Strava settings.

### Storage and sessions

- `server/.data/fitness.sqlite` stores each athlete's tokens and activity snapshot, pagination cursor, import-complete flag, and sync time. SQLite commits snapshots atomically; interrupted or failed syncs retain the last successful import. The database and its WAL/SHM files are ignored by Git.
- Device sessions last 90 days. Native phones keep the opaque session token in Expo SecureStore; the database stores its hash. Strava tokens never go to the phone. Web preview uses tab-scoped sessionStorage. Changing backend addresses starts a separate session.
- Every activity/dashboard request requires the device's session. Athletes are isolated, while two sessions for the same athlete share a token refresher and cached import in this backend process.
- **Sign out** revokes this device session and cancels its pending connection. It does not revoke Strava authorization or delete the athlete's saved import. Signing in again as that athlete restores it. Full account deletion/deauthorization is future work.
- Connection codes and OAuth states expire after ten minutes and are single-use. The callback also requires the browser cookie from the connection flow. Keep the same computer browser throughout. Browser authorization routes accept only loopback connections at the generated 127.0.0.1 address. Expired, denied or cancelled connections can be restarted from the app.
- The database contains personal activity data and unencrypted server tokens. Keep it local and excluded from sharing/backups to public destinations. This remains a trusted-LAN development server; public deployment needs HTTPS, protected persistent storage, operational rate limiting, and an account deletion/revocation policy. Run one backend process per database so token-refresh coordination stays centralized.

If your friend is on the same network, both apps can point at this backend and each connect their own Strava account. For separate local setups using the same Strava application, follow the instructions below.

### Friend setup: own backend, shared Strava application

Each developer runs their own backend and database. Kyle securely supplies only the shared application's **STRAVA_CLIENT_ID** and **STRAVA_CLIENT_SECRET**. These identify the application; you authorize your own athlete account separately. Do not copy Kyle's access token, refresh token, `.data` directory, or entire `.env` files. Keep the supplied secret in your ignored `server/.env` only.

1. Pull the code and run `npm ci`.
2. Copy `.env.example` to `.env`, and `server/.env.example` to `server/.env`, only if those destination files do not already exist.
3. Find your computer's active LAN IPv4 address with `ipconfig`. For example, if it is `192.168.1.100`, use:

   Root `.env`:
   ```dotenv
   EXPO_PUBLIC_API_URL=http://192.168.1.100:3001
   ```

   `server/.env`:
   ```dotenv
   PORT=3001
   PUBLIC_BACKEND_URL=http://192.168.1.100:3001
   STRAVA_CLIENT_ID=VALUE_KYLE_SENDS_YOU
   STRAVA_CLIENT_SECRET=VALUE_KYLE_SENDS_YOU
   ```

4. No callback-domain coordination is needed. Both developers use `http://127.0.0.1:3001/connect` on their own computer. Keep the existing Strava callback setting; the application still needs capacity for both athletes.
5. Run `npm run server`. In a second terminal, run `npx expo start --clear`. Connect your phone to your own computer's network and open the app in Expo Go. Allow Node through the private-network firewall if needed.
6. Tap **Connect Strava** on your phone. Open `http://127.0.0.1:3001/connect` on your computer, type the displayed code, and continue to Strava. Sign into **your own account**, approve activity access, then tap **Check connection** on your phone.

**Simultaneous testing:** each computer browser connects to its own local backend, so both developers can authorize and sync concurrently without editing the shared callback domain. The phone still uses its computer's LAN IP for API requests. If that IP changes, update both local environment files and restart the backend and Expo; the loopback callback stays the same. Codes expire after ten minutes, are single-use, and are replaced when you tap Generate new code. Only enter a code from your own phone.

Your activities and athlete tokens stay in your own `server/.data/fitness.sqlite`; Kyle's database stays on his computer. Different athlete accounts have separate authorizations. The token-rotation conflict described above applies when multiple backends use the **same athlete and application**, not merely the same application. Both developers share the registration's API request limits.

`GET /connect` is the computer-only pairing form. `GET /health` is public. `POST /api/session` creates a device session; `GET /api/session`, `POST /api/strava/connect`, `POST /api/logout`, `GET /api/dashboard` and `GET /api/activities` use an Authorization bearer token. Opening the dashboard URL directly in a browser now returns 401 by design.

Strava authorization reference: https://developers.strava.com/docs/authentication/.

## Commands

| Command | Purpose |
| --- | --- |
| `npm start` | Expo QR code for a physical phone |
| `npm run android` | Launch a configured Android emulator/device |
| `npm run server` | Local Strava API, port 3001 |
| `npm run typecheck` | Check app TypeScript |
| `npm test` | Test token refresh, rotation, concurrent requests, and rejected credentials |
| `npx expo export --platform ios --platform android` | Verify both native bundles |

## Layout and next steps

- `src/screens/HomeScreen.tsx`: dashboard, loading/error states, refresh, and demo/backend selection.
- `src/activities.ts`: normalized activity shape and sample data.
- `server/index.mjs`: backend entry point.
- `server/app.mjs`: authenticated API and browser connection routes.
- `server/database.mjs`: SQLite sessions, tokens, and import snapshots.
- `server/strava.mjs`: Strava token refresh and activity mapping.

## Product and design documentation

The product direction and design decisions live in [`docs/`](docs/). The browser prototype is in [`mockups/`](mockups/); its README explains the current flows and review criteria.

For physical-device testing, use [`docs/mobile-testing.md`](docs/mobile-testing.md). It covers demo mode, Android and iPhone Expo Go flows, backend/Strava testing, validation checks, and troubleshooting.

Start with [`docs/product-vision.md`](docs/product-vision.md), [`docs/core-game-model.md`](docs/core-game-model.md), and [`docs/decision-log.md`](docs/decision-log.md).

Next: move to an Expo development build for automatic browser return, add account deletion/revocation handling, and prepare a hosted backend when needed. Check Strava's current API access limits and data-use rules before adding more users or shared activity views.

Each developer keeps local environment files and database files out of Git. Share the source through the existing FitnessRPG repository.

## Verification notes

TypeScript, lint, backend tests, and iOS/Android production bundle exports pass. The browser flow is integration-tested with simulated Strava responses, including two-athlete isolation, token rotation, replay/expiry, sign-out, restart recovery, and persisted pagination. Complete real consent on your phone after configuring the callback domain.

The SDK 58 dependency tree currently reports five high-severity npm audit entries, stemming from node-forge and zod in Expo tooling. `npm audit fix` has no compatible fix; its forced fix downgrades Expo to SDK 44. Do not run that forced downgrade. Recheck advisories when updating Expo.


## Native home dashboard

The Expo home screen now follows the Classic RPG prototype and requests `/api/dashboard`. It shows real recent Strava activities, calculated class XP/levels, and imported calendar-month distance (UTC). Class identity, avatar, quests, and unsupported performance metrics are labeled previews. Tap a class for its formula and totals; See more activities opens the dedicated activity history page.

The first dashboard visit imports one page of up to 200 summaries, then a backend queue imports remaining pages and processes running details/cycling streams automatically. Each page and skill result is saved independently. The queue reads Strava read/overall budget headers, pauses at the 15-minute or daily limit, and resumes automatically while the server runs. Without budget headers it falls back to 25 read requests per 15-minute window. Budget reservations, import cursors, retry times, and results persist in SQLite; reopening the app resumes pending work after a server restart. The app refreshes progress from the backend while active without forcing extra Strava calls. Failed requests preserve committed data; an unavailable first import shows an error rather than demo data.

Experimental rules and limitations are recorded in `docs/decision-log.md`. These levels are game progress over imported history, not a fitness assessment. Distance skills now use separately fetched distance/time streams; bench weight is not present in the current Strava summaries. Imported workouts are retained without automatic edit/deletion reconciliation.

After pulling these changes, run `npm ci`, restart `npm run server`, and restart Metro with `npx expo start --clear`. All new native dependencies are compatible with Expo Go SDK 58. `npm run web` also supports browser preview on localhost:8081. For a different browser origin, set `DEV_WEB_ORIGIN` in `server/.env` and restart the backend.

### Activity permissions

New authorizations request only `activity:read` by default, which allows activities visible to Everyone or Followers. We also accept `activity:read_all` if granted, and then import private (Only You) activities too. There is no additional private-activity filter. Plain `read` alone is not sufficient; it is a different scope. Dashboard totals and experimental XP cover the activities accessible under the granted permissions. Existing connections and snapshots are not reset by this change.

### Three-class XP foundation

The app and demo show Running, Strength, and Cycling, each with its own level, total XP, and within-level progress. Running earns 1 XP/km and Cycling earns 1 XP/3 km (experimental). Class XP is independent of future personal-best skills. Strength earns 1 XP per 500 lb of completed-set lifting volume from manually recorded workouts. Strava summaries without sets/reps/weights still earn no Strength XP and show the volume-unavailable explanation when no recorded volume exists. Existing saved imports are preserved; restart the backend to apply the new rules. Totals are derived from saved activities, so no database migration is necessary.

### Class skills

Tap **View skills & progress** on a class card to open a dedicated page with running/cycling best times or empty strength 1RM skills. Running times come from Strava best efforts. Cycling times are calculated estimates from elapsed distance/time samples, including stops within each effort. Neither is an official race result. Each value shows its activity, date, and source. There are no tiers.

Restart the backend and reload the app after pulling. No reconnect or account reset is needed; the backend creates its budget table automatically. Initial history and skill processing continue without manual refreshes while the server runs. Class details show pending/unavailable data and retry pauses. Completed skill results, including unavailable/empty results, are retained without daily refetching. Failed skill requests retry after 15 minutes; budget pauses follow Strava reset windows. Class XP is independent of skill processing.

### Class pages and navigation

Expo Router now owns navigation in `src/app/`. Class pages live at `/classes/running`, `/classes/cycling`, and `/classes/strength`; shared screen components stay in `src/screens/`. Each page follows the Classic RPG mockup: cumulative level and recorded-skill summaries, a two-column unlocked skill grid, then a two-column locked skill grid. A skill unlocks when it has a recorded result; pending or unavailable import data does not imply the user has never completed the distance.

After pulling, run `npm ci` and restart Metro with `npx expo start --clear` because the entry point and navigation dependencies changed. Strength metrics and skill tiers remain deferred.

Running skills now use elapsed times supplied in Strava activity-detail `best_efforts`, without a stream fallback. Cycling skills still use calculated distance/time stream efforts. Restart the backend and sync to replace previous calculated running records; the automatic queue processes pending skills within the available API budget. Missing provider efforts remain locked/empty. No reconnect or database migration is required.

### Daily checks after initial import

After history import, the first dashboard visit each UTC day queues an incremental summary check, paginating only if needed. It asks for activities at or after the newest stored activity date (with a one-second overlap), deduplicates IDs, and fetches skill data only for new/unprocessed activities. Refreshing again that day reads saved results and resumes pending work; it does not force another Strava check. No daily check runs solely because the server is left on. A newly recorded workout after that day's check appears on the next day's visit.

This deliberately treats existing workouts as immutable. Old edits/deletions and newly uploaded backdated activities earlier than the newest stored activity are not discovered by the incremental scan. A future explicit history reconciliation can support those cases. Calculation-version changes can still queue one-time skill reprocessing. Budgets are shared across accounts in one backend process and persisted per Strava client ID; other developers using the same Strava application also consume its upstream budget, so external usage can still produce a handled 429. See [Strava rate limits](https://developers.strava.com/docs/rate-limits/).

### Activities page

The dashboard's **See more activities** button opens `/activities` with three recent records, source labels, XP contributions, and the current native Classic RPG styling. **Show all activities** expands a virtualized history list, loading 50 saved records per page as you scroll; **Load older activities** also loads the next page. **Show recent activities** collapses the history. All imported activities are accessible, including sports without an XP rule. Incomplete imports and sync retry times remain visible.

The authenticated `/api/activities` endpoint now returns `{ items, total, nextCursor, historyComplete, source }` rather than the dashboard's 30-record array. Optional `limit` (1-100, default 50) and `cursor` (last returned activity ID) page through the connected athlete's stored history. Browsing history reuses the existing daily-check/queue policy and does not independently refetch workout details. Start workout and Log activity open native recording flows; see below. Restart the backend and reload the app after pulling; no dependency installation or database migration is needed.

### Manual activities and Strength workouts

From Activities, choose **Log activity** to enter a previous run, ride, walk, swim, or other activity, with a name, distance (km/mi), duration (minutes/hours), and date (YYYY-MM-DD). Review the normalized distance and XP before saving. Running uses 1 km/XP and Cycling 3 km/XP; unsupported sports stay in history with no XP rule. To enter a previous Strength workout, choose **Log a past Strength workout instead**, then record its date, duration, exercises, and completed sets.

**Start workout** records a live Strength session. Begin blank or use Upper body/Lower body templates, search the exercise picker, and add/remove exercises or sets. Enter weight in lb/kg and whole reps; mark each finished set using its circle. Editing weight/reps unchecks that set. **Complete workout** reviews only completed sets; **Save workout** writes the final activity. Strength XP is total completed-set weight times reps, converted to pounds, divided by 500. Zero weight is allowed for unweighted sets, but body weight is not inferred. Incomplete sets are neither counted nor stored in the completed activity. Strength 1RM skills remain deferred.

Both flows use authenticated `POST /api/activities` and the connected athlete's local SQLite database. The server validates and calculates volume; client-provided XP is ignored. Manual entries live in a separate account-scoped table and use negative local IDs, so Strava snapshots and cursors cannot overwrite or collide with them. They count in history, monthly totals, and class XP, but never enter running/cycling skill processing or fastest-time results. Saves work without a successful Strava refresh. Do not manually enter a workout already imported from Strava unless you intend to count both records; cross-source duplicate detection is not implemented.

Save requests retain an account-scoped idempotency key. If the response is lost, retry Save to confirm the same activity without duplicate XP; the submitted review remains locked until resolved. Device drafts (including completed checkboxes and pending submissions) persist in AsyncStorage, separated by backend, athlete, and flow. Sign-out clears the active account reference without exposing its draft to the next account. Drafts are local to the device and are not yet synchronized between devices. Demo mode allows reviewing forms but does not save demo entries to the backend. A connected Strava account is currently required to identify the athlete for saved manual records.

Run `npm ci` if pulling these changes on another computer, then restart the backend and Metro (`npx expo start --clear`). The backend automatically creates `manual_activities`; existing data is preserved. AsyncStorage is installed through Expo's SDK-compatible installer and is included in Expo Go SDK 58. No new development build is required for that bundled module.

### Correcting manual entries

Manual rows in Activities (and the dashboard's latest activity) have **Edit** and **Delete** controls. Edit opens the appropriate prefilled activity or Strength form; review and **Save changes** replace the existing record and recalculate its class XP, levels, monthly totals, and history. Existing completed Strength sets remain completed when correcting their values; newly added sets must be marked complete. Unchanged dates preserve the original start time. Strava records are read-only in both the UI and API.

Delete asks for confirmation, then removes the manual entry and its contribution from totals. It cannot be undone in the app. A minimal deletion marker is retained to stop delayed save retries from restoring the entry; its stored activity payload is cleared. Changes never issue Strava write calls or create fastest-time results.

Authenticated `GET /api/activities/:id` loads a manual entry; `PUT` replaces it with a validated payload plus `expectedRevision`; `DELETE` accepts `{ expectedRevision }`. IDs must be negative local manual IDs owned by the connected athlete. Revision mismatches return 409 instead of overwriting another session's changes. Exact edit/delete retries are safe. Original creation retries return the latest saved record or 410 if it was deleted. The backend automatically upgrades existing manual tables with revision/deletion metadata on restart; existing entries are preserved. Edit drafts are scoped by activity and revision and kept separate from new-entry drafts.


## Cycling skill processing

Cycling now calculates the full catalog: 1K/5K/10K/20K/50K/100K/160K elapsed best times, longest ride, four-week distance/elevation totals, greatest elevation gain in a rolling hour, longest sustained climb, and total elevation in one ride. Values show explicit units and Strava ride/window attribution. Monthly skills cover the 28 days before the most recent Saturday 00:00 UTC; the dashboard's calendar-month distance remains separate.

Restart the backend to queue a one-time version-2 cycling stream pass for saved rides. It requests altitude alongside distance/time within the existing API budget and stores only compact results in each account's SQLite snapshot. No reconnect, dependency install, schema migration, or raw-stream storage is required. Summary skills appear immediately; missing stream dimensions leave only the affected skills empty. See `docs/decision-log.md` for the experimental sustained-climb rule and data coverage limitations.
