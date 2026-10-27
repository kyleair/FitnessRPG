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
   cd E:\Art\Websites\FitnessRPG
   npm ci
   npx expo start
   ```

4. Open Expo Go on Android and choose **Scan QR code**.
5. Scan the QR code shown by Expo, then wait for the dashboard to load.
6. In demo mode, confirm the sample dashboard appears. In backend mode, confirm the connection state and imported data appear.

Android does not require the Expo CLI and Expo Go accounts to match, but signing in consistently can make shared projects easier to manage.

## Physical iPhone: Expo Go

1. Install an Expo Go build compatible with SDK 58. Physical iOS devices may require an SDK 58 Expo Go build distributed through EAS/TestFlight rather than the App Store.
2. Sign into the same Expo account in both the computer's Expo CLI and Expo Go:

   ```powershell
   npx expo login
   ```

3. Connect the iPhone and computer to the same Wi-Fi network.
4. Start Expo from the repository:

   ```powershell
   cd E:\Art\Websites\FitnessRPG
   npm ci
   npx expo start
   ```

5. Scan the terminal QR code with the iPhone Camera app and open it in Expo Go.
6. Confirm the demo dashboard, then test the interactions listed below.

## Backend and Strava test

Use two PowerShell windows. Complete the one-time environment setup described in the README, then run:

```powershell
# Terminal 1: backend
cd E:\Art\Websites\FitnessRPG
npm run server

# Terminal 2: Expo
cd E:\Art\Websites\FitnessRPG
npx expo start --clear
```

On the phone:

1. Tap **Connect Strava**.
2. On the computer running the backend, open `http://127.0.0.1:3001/connect`.
3. Enter the code shown on the phone and complete Strava authorization in that same computer browser.
4. Return to the phone and tap **Check connection**.
5. Confirm that the dashboard identifies Strava as the source, shows imported counts, and displays a sync time.
6. Pull to refresh or tap **Sync Strava**. Within the one-minute cache window, the result should remain stable; later refreshes should continue history import when more pages exist.

Do not use `127.0.0.1` as the phone's API address. The phone must use the computer's LAN IPv4 address, such as `http://192.168.1.100:3001`.

## Interaction checklist

- Dashboard opens without clipped content at the phone's portrait width.
- Current Class avatar opens its preview modal, and the modal can be dismissed.
- Each domain card opens its progress details.
- Progress meters do not overflow their cards.
- **See activities** expands and collapses the recent activity list.
- Pull-to-refresh shows a loading state and does not create duplicate requests.
- A backend failure shows an error or stale-data notice; it does not silently replace real data with demo data.
- An empty Strava account shows an empty state rather than fabricated activity.
- On Android, the system back action closes the modal where applicable.
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
- **Stale or broken bundle:** stop Expo and restart with `npx expo start --clear`.
- **Expo Go version mismatch:** install the Expo Go build matching SDK 58, or run `npx expo-doctor` and `npx expo install --fix` after reviewing the proposed changes.
- **iPhone account error:** sign into the same account in Expo CLI and Expo Go, then reload the project.
- **Backend works on the computer but not the phone:** replace `localhost`/`127.0.0.1` in the phone's API configuration with the computer's LAN IPv4 address, confirm the Windows firewall allows port 3001, and restart Expo after changing `.env`.
- **Strava connection is stuck:** keep the same computer browser throughout the pairing flow, generate a new code, and make sure the browser is opening the loopback URL on the computer rather than on the phone.

## Future testing prompt

When asked to “guide me through testing this on mobile on Android,” first ask or infer whether the goal is demo mode, backend mode, or Strava mode. Then use the Android steps above, followed by the interaction checklist and the failure details checklist. If the user reports an error, ask for the device model, Expo Go version, connection mode, exact error, and the last terminal output before changing code.
