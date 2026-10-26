import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
const key = 'fitness-session-' + Array.from(String(apiUrl || ''), char => char.charCodeAt(0).toString(16).padStart(4, '0')).join('');
export class SessionExpiredError extends Error {}
let pendingSession: Promise<string> | undefined;
const storage = {
  get: () => Platform.OS === 'web' ? Promise.resolve(sessionStorage.getItem(key)) : SecureStore.getItemAsync(key),
  set: (value: string) => Platform.OS === 'web' ? Promise.resolve(sessionStorage.setItem(key, value)) : SecureStore.setItemAsync(key, value),
  remove: () => Platform.OS === 'web' ? Promise.resolve(sessionStorage.removeItem(key)) : SecureStore.deleteItemAsync(key),
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
export async function api<T>(path: string, method = 'GET'): Promise<T> {
  const token = await session();
  const response = await fetch(`${apiUrl}${path}`, { method, headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(45000) });
  if (response.status === 401) {
    await storage.remove();
    throw new SessionExpiredError('Your session expired. Tap Try again to reconnect.');
  }
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Unable to reach the backend. Try again.');
  return body;
}
export async function signOut() {
  await api('/api/logout', 'POST');
  await storage.remove();
}
