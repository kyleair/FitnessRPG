import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './database.mjs';
import { createApp } from './app.mjs';

const db = openDatabase(fileURLToPath(new URL('./.data/fitness.sqlite', import.meta.url)));
const app = createApp({ db, env: process.env });
const server = createServer(app);
let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  server.close();
  await app.close();
  db.close();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
server.listen(Number(process.env.PORT || 3001), '0.0.0.0', () => {
  console.log(`FitnessRPG API listening on port ${process.env.PORT || 3001}. Connect Strava from Expo Go.`);
  console.log(`Computer authorization: http://127.0.0.1:${process.env.PORT || 3001}/connect`);
  if (!process.env.PUBLIC_BACKEND_URL) console.log('Set PUBLIC_BACKEND_URL in server/.env to your phone-reachable backend URL.');
});
