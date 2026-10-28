import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
const key = 'fitness-session-' + Array.from(String(apiUrl || ''), char => char.charCodeAt(0).toString(16).padStart(4, '0')).join('');
export class SessionExpiredError extends Error {}
export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
let pendingSession: Promise<string> | undefined;
const storage = {
  get: (storageKey = key) => Platform.OS === 'web' ? Promise.resolve(sessionStorage.getItem(storageKey)) : SecureStore.getItemAsync(storageKey),
  set: (value: string, storageKey = key) => Platform.OS === 'web' ? Promise.resolve(sessionStorage.setItem(storageKey, value)) : SecureStore.setItemAsync(storageKey, value),
  remove: (storageKey = key) => Platform.OS === 'web' ? Promise.resolve(sessionStorage.removeItem(storageKey)) : SecureStore.deleteItemAsync(storageKey),
};
async function session() {
  if (!pendingSession) pendingSession = (async () => {
    const saved = await storage.get();
    if (saved) return saved;
    const response = await fetch(`${apiUrl}/api/session`, { method: 'POST', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('Could not start a session. Check your backend and try again.');
    const { token } = await response.json();
    await storage.set(token);
    return token as string;
  })().finally(() => { pendingSession = undefined; });
  return pendingSession;
}
export async function api<T>(path: string, method = 'GET', payload?: unknown): Promise<T> {
  const token = await session();
  const response = await fetch(`${apiUrl}${path}`, { method, headers: { Authorization: `Bearer ${token}`, ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }), signal: AbortSignal.timeout(45000) });
  if (response.status === 401) {
    await storage.remove();
    await storage.remove(key + '-account');
    throw new SessionExpiredError('Your session expired. Tap Try again to reconnect.');
  }
  const body = await response.json();
  if (!response.ok) throw new ApiError(body.error || 'Unable to reach the backend. Try again.', response.status);
  if (path === '/api/session' && method === 'GET') {
    if (body.connected && body.accountKey) await storage.set(body.accountKey, key + '-account');
    else await storage.remove(key + '-account');
  }
  return body;
}
export async function activityDraftScope() {
  if (!apiUrl) return 'demo';
  let account = await storage.get(key + '-account');
  if (!account) {
    const status = await api<{ accountKey: string | null }>('/api/session');
    account = status.accountKey;
  }
  if (!account) throw new Error('Connect Strava from the dashboard to save activities to your account.');
  return `${apiUrl}:${account}`;
}
export async function signOut() {
  await api('/api/logout', 'POST');
  await storage.remove();
  await storage.remove(key + '-account');
}
