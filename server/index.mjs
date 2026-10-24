import { createServer } from 'node:http';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createStravaClient } from './strava.mjs';

const tokenFile = new URL('./.data/tokens.json', import.meta.url);
let initialTokens = { refresh_token: process.env.STRAVA_REFRESH_TOKEN };
try { initialTokens = JSON.parse(await readFile(tokenFile, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const configured = !!(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET && initialTokens.refresh_token);
const strava = createStravaClient({
  clientId: process.env.STRAVA_CLIENT_ID,
  clientSecret: process.env.STRAVA_CLIENT_SECRET,
  initialTokens,
  async saveTokens(tokens) {
    await mkdir(new URL('./.data/', import.meta.url), { recursive: true });
    const temporary = new URL('./.data/tokens.tmp', import.meta.url);
    await writeFile(temporary, JSON.stringify(tokens), { mode: 0o600 });
    await rename(temporary, tokenFile);
  },
});
const server = createServer(async (request, response) => {
  response.setHeader('Content-Type', 'application/json');
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') { response.writeHead(405); response.end(JSON.stringify({ error: 'Method not allowed' })); return; }
  if (request.url === '/health') { response.end(JSON.stringify({ ok: true, stravaConfigured: configured })); return; }
  if (request.url !== '/api/activities') { response.writeHead(404); response.end(JSON.stringify({ error: 'Not found' })); return; }
  if (!configured) { response.writeHead(503); response.end(JSON.stringify({ error: 'Add Strava credentials to server/.env first.' })); return; }
  try { response.end(JSON.stringify(await strava.activities())); }
  catch (error) { console.error(error.message); response.writeHead(502); response.end(JSON.stringify({ error: 'Unable to fetch Strava activities. Check the backend terminal.' })); }
});
server.listen(Number(process.env.PORT || 3001), '0.0.0.0', () => console.log(`Local development API listening on port ${process.env.PORT || 3001}. Strava configured: ${configured}`));
