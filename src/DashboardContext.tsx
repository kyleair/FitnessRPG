import { createContext, useContext, useEffect, useRef, useState, type Dispatch, type SetStateAction, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { Dashboard, demoDashboard } from './dashboard';
import { api, apiUrl, SessionExpiredError } from './api';
import { useProgressionProfile } from './progression-profile';
import { findSkillLevelUps, type SkillLevelUp } from './skill-level-ups';
const DashboardContext = createContext<{ data: Dashboard | null; setData: Dispatch<SetStateAction<Dashboard | null>>; levelUps: SkillLevelUp[]; dismissLevelUps: () => void } | null>(null);
export function DashboardProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Dashboard | null>(apiUrl ? null : demoDashboard);
  const [levelUps, setLevelUps] = useState<SkillLevelUp[]>([]);
  const previous = useRef<Dashboard | null>(null);
  const { profile } = useProgressionProfile();
  useEffect(() => {
    const before = previous.current;
    previous.current = data;
    if (!before || !data || data.source === 'demo') return;
    const found = findSkillLevelUps(before, data, profile.gender, profile.ageBand);
    if (found.length) setLevelUps(current => [...current, ...found.filter(item => !current.some(existing => existing.key === item.key))]);
  }, [data, profile]);
  useEffect(() => {
    if (!apiUrl || !data?.syncInProgress) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const delay = Math.max(5000, Math.min(60000, data.syncRetryAt ? Date.parse(data.syncRetryAt) - Date.now() : 0));
    async function poll() {
      if (cancelled) return;
      if (AppState.currentState === 'active') {
        try {
          const next = await api<Dashboard>('/api/dashboard');
          if (!cancelled) setData(current => current === data ? next : current);
        } catch (error) {
          if (!cancelled && error instanceof SessionExpiredError) setData(null);
        }
      }
      if (!cancelled) timer = setTimeout(poll, delay);
    }
    timer = setTimeout(poll, delay);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [data]);
  return <DashboardContext.Provider value={{ data, setData, levelUps, dismissLevelUps: () => setLevelUps([]) }}>{children}</DashboardContext.Provider>;
}
export function useDashboard() {
  const value = useContext(DashboardContext);
  if (!value) throw new Error('DashboardProvider is required.');
  return value;
}
