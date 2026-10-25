# Fitness Tracker

An Expo / React Native / TypeScript starter for iPhone and Android, with an optional local Strava backend. The default screen shows clearly labelled sample activities; Strava is not connected yet.

## First run on your phone

Prerequisite: Node.js 22.13+ (Node 24 LTS recommended). Dependencies are already installed on this computer. After cloning on another computer, run `npm ci` first.

1. Install Expo Go on your iPhone or Android.
2. Connect your computer and phone to the same Wi-Fi network.
3. Open PowerShell in this folder and run:

   ```powershell
   npx expo login
   npm start
   ```

4. Sign into the same Expo account in Expo Go. On iPhone, scan the terminal's QR code with the Camera app and open it in Expo Go. On Android, use Expo Go's QR scanner.
5. You should see the green "Keep moving." dashboard with three demo activities. No `.env`, Strava account, backend, Mac, or Apple developer membership is needed for this demo.
6. Edit `App.tsx` and save to see Fast Refresh on your phone. Keep the terminal running; Ctrl+C stops it.

This project uses SDK 58 to match Expo Go 58 on your phone. After an SDK upgrade, stop the old Metro terminal with Ctrl+C and run `npx expo start --clear` before scanning the new QR code. See https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/ for future upgrades.

### Connection troubleshooting

- Allow Node.js through Windows Firewall on your **private** network if prompted. Allow Expo Go access to the local network on iPhone.
- Guest/public Wi-Fi may block devices from talking to one another. Try a home network or hotspot.
- If the QR connection fails, stop Expo and try `npx expo start --tunnel`. Accept the tunnel dependency installation if prompted. This tunnels Metro only; it does not expose the optional backend.
- For a stale bundle, run `npx expo start --clear`.
- `npm run ios` launches a simulator and requires macOS. Use `npm start` for your physical iPhone on Windows.

## Optional: connect one Strava account

The phone calls the local backend; credentials stay server-side. This backend currently serves **one account**, has no app-user authentication, and is intended only for development on a trusted private network. Add app authentication and per-user token storage before hosting it publicly.

1. Register a Strava API app at https://www.strava.com/settings/api.
2. Follow https://developers.strava.com/docs/authentication/ to authorize your account with `activity:read` (or `activity:read_all` if you need private activities). Exchange the authorization code server-side using your client ID and secret to obtain a refresh token. The API settings page's default token may not have the activity scope you need. The full in-app OAuth flow is a future feature.
3. Copy the server example:

   ```powershell
   Copy-Item server/.env.example server/.env
   ```

4. Fill in `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, and `STRAVA_REFRESH_TOKEN` in `server/.env`. Do not put them in the root mobile `.env`.
5. In a separate terminal, run:

   ```powershell
   npm run server
   ```

6. Find your computer's Wi-Fi IPv4 address with `ipconfig`. Copy the mobile example and edit it:

   ```powershell
   Copy-Item .env.example .env
   ```

   Uncomment the URL and replace the example IP:

   ```dotenv
   EXPO_PUBLIC_API_URL=http://192.168.1.100:3001
   ```

   `localhost` on your phone means the phone itself, so use the computer's IP. Allow port 3001 on the private network if needed. Opening `http://YOUR_IP:3001/health` in your phone browser should return JSON.

7. Restart `npm start`. The dashboard now requests your latest 30 Strava activities. Pull down or tap Refresh to fetch again. Failed requests show an error and do not silently switch to demo data.

Access tokens are refreshed automatically. Rotated tokens are saved in ignored `server/.data/tokens.json` and reused across restarts. To switch Strava accounts, stop the backend, remove that local token file, replace the credentials in `server/.env`, and restart. Never share this token file.

Root `.env` values prefixed `EXPO_PUBLIC_` are public app configuration. Git ignores `.env` files and token storage; only credential-free `.env.example` files are tracked.

## Commands

| Command | Purpose |
| --- | --- |
| `npm start` | Expo QR code for a physical phone |
| `npm run android` | Launch a configured Android emulator/device |
| `npm run server` | Optional local Strava API, port 3001 |
| `npm run typecheck` | Check app TypeScript |
| `npm test` | Test token refresh, rotation, concurrent requests, and rejected credentials |
| `npx expo export --platform ios --platform android` | Verify both native bundles |

## Layout and next steps

- `App.tsx`: dashboard, loading/error states, refresh, and demo/backend selection.
- `src/activities.ts`: normalized activity shape and sample data.
- `server/index.mjs`: local HTTP API and persistent token cache.
- `server/strava.mjs`: Strava token refresh and activity mapping.

## Product and design documentation

The product direction and design decisions live in [`docs/`](docs/). The browser prototype is in [`mockups/`](mockups/); its README explains the current flows and review criteria.

Start with [`docs/product-vision.md`](docs/product-vision.md), [`docs/core-game-model.md`](docs/core-game-model.md), and [`docs/decision-log.md`](docs/decision-log.md).

Next: add a Connect Strava flow, app-user sessions, a database with tokens per user, caching/rate-limit handling, and development builds for OAuth/deep-link testing. Check Strava's current API access limits and data-use rules before adding more users or shared activity views.

No remote GitHub repository is created by this setup. Share this local repo by adding your preferred Git remote, then push and invite your friend. Each developer keeps their own ignored environment files.

## Verification notes

TypeScript checks, backend unit tests, and iOS/Android production bundle exports passed during setup. Actual Expo Go display and real Strava access still need testing on your phones with your credentials.

The SDK 58 dependency tree currently reports five high-severity npm audit entries, stemming from node-forge and zod in Expo tooling. `npm audit fix` has no compatible fix; its forced fix downgrades Expo to SDK 44. Do not run that forced downgrade. Recheck advisories when updating Expo.

