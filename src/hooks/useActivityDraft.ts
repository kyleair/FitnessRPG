import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { activityDraftScope } from '../api';

export const newRequestId = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
export function useActivityDraft<T extends { requestId: string }>(kind: string, create: () => T) {
  const createRef = useRef(create);
  const [draft, setDraft] = useState<T | null>(null);
  const [key, setKey] = useState<string | null>(null);
  const [storageError, setStorageError] = useState('');
  const writes = useRef<Promise<void>>(Promise.resolve());
  const complete = useRef(false);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const scope = await activityDraftScope();
        const storageKey = `fitness-draft-v1:${kind}:${scope}`;
        const raw = await AsyncStorage.getItem(storageKey);
        const saved = raw ? JSON.parse(raw) as T : null;
        if (active) { setKey(storageKey); setDraft(saved?.requestId ? saved : createRef.current()); }
      } catch (error) {
        if (active) { setStorageError(error instanceof Error ? error.message : 'Draft storage is unavailable.'); setDraft(createRef.current()); }
      }
    })();
    return () => { active = false; };
  }, [kind]);
  useEffect(() => {
    if (!key || !draft || complete.current) return;
    const serialized = JSON.stringify(draft);
    writes.current = writes.current.catch(() => {}).then(() => AsyncStorage.setItem(key, serialized));
    void writes.current.catch(() => setStorageError('Changes could not be saved on this device. Keep this screen open and try again.'));
  }, [draft, key]);
  async function clear() {
    complete.current = true;
    await writes.current.catch(() => {});
    if (key) await AsyncStorage.removeItem(key);
  }
  async function retain(next: T) {
    if (!key) throw new Error('Draft storage is unavailable. Reopen this screen after connecting your account before saving.');
    setDraft(next);
    if (key) {
      writes.current = writes.current.catch(() => {}).then(() => AsyncStorage.setItem(key, JSON.stringify(next)));
      await writes.current;
    }
  }
  return { draft, setDraft, storageError, clear, retain };
}
