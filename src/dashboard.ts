import { Activity, demoActivities } from './activities';
export type DomainKey = 'running' | 'strength' | 'cycling';
export interface Domain {
  key: DomainKey; name: string; xp: number; level: number; currentXp: number;
  nextLevelXp: number; progress: number; activityCount: number; distanceKm: number; minutes: number; formula: string; xpUnavailable?: boolean;
}
export interface Dashboard {
  source: string; syncedAt: string | null; stale: boolean; historyComplete: boolean; importedCount: number;
  month: string; monthlyDistanceKm: number; domains: Domain[];
  recentActivities: (Activity & { domain: DomainKey | null; xp: number })[];
}
export const demoDashboard: Dashboard = {
  source: 'demo', syncedAt: null, stale: false, historyComplete: false, importedCount: 3,
  month: '2026-10', monthlyDistanceKm: 33.8,
  domains: [
    { key: 'running', name: 'Running', xp: 6.2, level: 1, currentXp: 1.2, nextLevelXp: 7, progress: 1.2 / 7, activityCount: 1, distanceKm: 6.2, minutes: 34, formula: '1 km = 1 XP' },
    { key: 'strength', name: 'Strength', xp: 0, level: 0, currentXp: 0, nextLevelXp: 5, progress: 0, activityCount: 0, distanceKm: 0, minutes: 0, xpUnavailable: true, formula: 'Based on total pounds lifted; lifting volume is not available from Strava summaries yet' },
    { key: 'cycling', name: 'Cycling', xp: 4.9, level: 0, currentXp: 4.9, nextLevelXp: 5, progress: 0.98, activityCount: 1, distanceKm: 24.5, minutes: 62, formula: '5 km = 1 XP' },
  ],
  recentActivities: demoActivities.map((activity, index) => ({ ...activity, domain: index === 0 ? 'running' : index === 1 ? 'cycling' : null, xp: index === 0 ? 6.2 : index === 1 ? 4.9 : 0 })),
};
