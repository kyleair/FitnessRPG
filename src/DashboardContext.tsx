import { createContext, useContext, useState, type Dispatch, type SetStateAction, type ReactNode } from 'react';
import { Dashboard, demoDashboard } from './dashboard';
import { apiUrl } from './api';
const DashboardContext = createContext<{ data: Dashboard | null; setData: Dispatch<SetStateAction<Dashboard | null>> } | null>(null);
export function DashboardProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Dashboard | null>(apiUrl ? null : demoDashboard);
  return <DashboardContext.Provider value={{ data, setData }}>{children}</DashboardContext.Provider>;
}
export function useDashboard() {
  const value = useContext(DashboardContext);
  if (!value) throw new Error('DashboardProvider is required.');
  return value;
}
