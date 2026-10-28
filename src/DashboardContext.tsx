import { createContext, useContext, useEffect, useState, type Dispatch, type SetStateAction, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { Dashboard, demoDashboard } from './dashboard';
import { api, apiUrl, SessionExpiredError } from './api';
const DashboardContext = createContext<{ data: Dashboard | null; setData: Dispatch<SetStateAction<Dashboard | null>> } | null>(null);
export function DashboardProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Dashboard | null>(apiUrl ? null : demoDashboard);
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
  return <DashboardContext.Provider value={{ data, setData }}>{children}</DashboardContext.Provider>;
}
export function useDashboard() {
  const value = useContext(DashboardContext);
  if (!value) throw new Error('DashboardProvider is required.');
  return value;
}
