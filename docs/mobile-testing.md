# Mobile Testing Guide

Use this guide when testing FitnessRPG on a physical Android or iPhone. The app currently targets Expo SDK 58.

## Choose a test mode

Start with demo mode when checking layout and interactions. It needs no Strava account or backend:

- Do not create a root `.env` file, or leave `EXPO_PUBLIC_API_URL` unset.
- The app should open with sample activities and a Classic RPG dashboard.

Use backend mode when testing real imports, sessions, refresh behavior, or the Strava connection:

- Configure the root `.env` with the computer's LAN address as `EXPO_PUBLIC_API_URL`.
- Configure `server/.env` with the same reachable address as `PUBLIC_BACKEND_URL` and the server-only Strava credentials.
- Start the backend in one terminal and Expo in another.

## Physical Android: Expo Go

1. Install the Expo Go build compatible with SDK 58. If the store version is not compatible, use the Android build from [expo.dev/go](https://expo.dev/go).
2. Connect the phone and computer to the same Wi-Fi network. Avoid guest Wi-Fi, which often blocks device-to-device traffic.
3. In PowerShell, open the repository:

   ```powershell
   # Run from your local FitnessRPG repository folder
   npm ci
   npx expo start --clear
   ```

4. Open Expo Go on Android and choose **Scan QR code**.
5. Scan the QR code shown by Expo, then wait for the dashboard to load.
6. In demo mode, confirm the sample dashboard appears. In backend mode, confirm the connection state and imported data appear.

Android does not require the Expo CLI and Expo Go accounts to match, but signing in consistently can make shared projects easier to manage.

## Physical iPhone: Expo Go

1. Check [Expo Go compatibility](https://expo.dev/go) for SDK 58 on a physical iPhone and install the indicated build. If no compatible iPhone build is available, use a development build; changing the JavaScript entry cannot fix an SDK mismatch.
2. Sign into the same Expo account in both the computer's Expo CLI and Expo Go:

   ```powershell
   npx expo login
   ```

3. Connect the iPhone and computer to the same Wi-Fi network.
4. Start Expo from the repository:

   ```powershell
   # Run from your local FitnessRPG repository folder
   npm ci
   npx expo start --clear
   ```

5. Scan the terminal QR code with the iPhone Camera app and open it in Expo Go.
6. Confirm the demo dashboard, then test the interactions listed below.

## Backend and Strava test

Use two PowerShell windows. Complete the one-time environment setup described in the README, then run:

```powershell
# Terminal 1: backend
# Run from your local FitnessRPG repository folder
npm run server

# Terminal 2: Expo
# Run from your local FitnessRPG repository folder
npx expo start --clear
```

On the phone:

1. Tap **Connect Strava**.
2. On the computer running the backend, open `http://127.0.0.1:3001/connect`.
3. Enter the code shown on the phone and complete Strava authorization in that same computer browser.
4. Return to the phone and tap **Check connection**.
5. Confirm that the dashboard identifies Strava as the source, shows imported counts, and displays a sync time.
6. Leave the server running and observe imported counts and pending skill counts progress automatically. Pull to refresh or tap **Sync Strava** to read the latest saved state. Once complete, repeat visits on the same UTC day should not trigger more Strava calls. Restart both server and app to verify saved results remain available and pending work resumes. Budget pauses should show a retry time and resume automatically.

Do not use `127.0.0.1` as the phone's API address. The phone must use the computer's LAN IPv4 address, such as `http://192.168.1.100:3001`.

## Interaction checklist

- Dashboard opens without clipped content at the phone's portrait width.
- Current Class avatar opens its preview modal, and the modal can be dismissed.
- Each Running, Cycling, and Strength class card opens its matching class page. The back control returns to the dashboard.
- Class pages show recorded skills above locked skills in two-column grids. Demo skills and unsupported strength metrics remain empty; recorded skills show their activity, date, and source.
- Pull-to-refresh on a class page updates the shared dashboard data; a direct class URL also loads the matching class.
- Progress meters do not overflow their cards.
- **See more activities** opens a dedicated page with the current native styling. Verify the three action cards, three recent rows, and back navigation (including Android system back).
- **Show all activities** expands the history. With more than 50 imported records, scroll or tap **Load older activities** to reach records beyond the first page; **Show recent activities** collapses it. Confirm the imported count, source, XP, loading, empty, and retry states.
- Open `/activities` directly in web preview, then verify it loads the dashboard/session and that **Back to dashboard** works. Start workout and Log activity should explain their coming-soon status; Sync Strava should report the current daily-check/queue state.
- Pull-to-refresh shows a loading state and does not create duplicate requests.
- A backend failure shows an error or stale-data notice; it does not silently replace real data with demo data.
- An empty Strava account shows an empty state rather than fabricated activity.
- On Android, the system back action returns from a class page and closes preview modals where applicable.
- Text remains readable with the device's normal accessibility font settings.

## Before reporting a failure

Run the checks that do not require a phone:

```powershell
npm test
npm run typecheck
npm run lint
npx expo-doctor
```

Record these details for the next debugging session:

- Android or iPhone model and OS version.
- Expo Go version and the project's Expo SDK version.
- Demo mode or backend mode.
- LAN or tunnel connection mode.
- The exact command used to start Expo and the exact error text.
- Whether the computer can open `http://127.0.0.1:3001/health` and whether the phone can open `http://YOUR_COMPUTER_LAN_IP:3001/health`.
- Whether the problem occurs before the QR scan, during bundle loading, or after the dashboard appears.

## Common fixes

- **QR code does not connect:** verify both devices are on the same private Wi-Fi, allow Node.js through Windows Firewall, then try `npx expo start --tunnel`. Tunnel mode is for Metro only; it does not expose the backend.
- **Development-server 404 / `Unable to resolve module ./index`:** pull the latest PR #5 changes, verify root `index.ts` imports `expo-router/entry` and `package.json` points `main` at `index.ts`, stop the previous Metro process, then run `npx expo start --clear` and scan its new QR code. The root entry delegates registration to Expo Router; do not restore the old App registration. A successful production export alone does not validate the development bundle path.
- **Stale or broken bundle:** stop Expo and restart with `npx expo start --clear`.
- **Expo Go version mismatch:** use the SDK 58 build listed at [expo.dev/go](https://expo.dev/go), or use a compatible development build. `npx expo-doctor` diagnoses project dependencies; `npx expo install --fix` aligns them with the configured SDK and does not upgrade Expo Go on the phone.
- **iPhone account error:** sign into the same account in Expo CLI and Expo Go, then reload the project.
- **Backend works on the computer but not the phone:** replace `localhost`/`127.0.0.1` in the phone's API configuration with the computer's LAN IPv4 address, confirm the Windows firewall allows port 3001, and restart Expo after changing `.env`.
- **Strava connection is stuck:** keep the same computer browser throughout the pairing flow, generate a new code, and make sure the browser is opening the loopback URL on the computer rather than on the phone.

## Future testing prompt

When asked to “guide me through testing this on mobile on Android,” first ask or infer whether the goal is demo mode, backend mode, or Strava mode. Then use the Android steps above, followed by the interaction checklist and the failure details checklist. If the user reports an error, ask for the device model, Expo Go version, connection mode, exact error, and the last terminal output before changing code.
