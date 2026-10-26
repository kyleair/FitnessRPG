import { Activity, demoActivities } from './activities';
export type ClassKey = 'running' | 'strength' | 'cycling';
export interface Skill {
  key: string; name: string; distanceMeters: number | null;
  best: { timeMs: number; activityId: number; activityName: string; achievedAt: string; source: string; method: string } | null;
}
export interface FitnessClass {
  key: ClassKey; name: string; skills: Skill[]; xp: number; level: number; currentXp: number;
  nextLevelXp: number; progress: number; activityCount: number; distanceKm: number; minutes: number; formula: string; xpUnavailable?: boolean;
}
export interface Dashboard {
  skillsUnavailable?: number; skillsPending?: number; skillsStale?: boolean; source: string; syncedAt: string | null; stale: boolean; historyComplete: boolean; importedCount: number;
  month: string; monthlyDistanceKm: number; classes: FitnessClass[];
  recentActivities: (Activity & { classKey: ClassKey | null; xp: number })[];
}
const emptySkills = (classKey: ClassKey, names: string[]): Skill[] => names.map(name => ({ key: `${classKey}_${name}`, name, distanceMeters: null, best: null }));
export const demoDashboard: Dashboard = {
  source: 'demo', syncedAt: null, stale: false, historyComplete: false, importedCount: 3,
  month: '2026-10', monthlyDistanceKm: 33.8,
  classes: [
    { key: 'running', name: 'Running', skills: emptySkills('running', ['1K', '5K', '10K', 'Half marathon', 'Marathon']), xp: 6.2, level: 1, currentXp: 1.2, nextLevelXp: 7, progress: 1.2 / 7, activityCount: 1, distanceKm: 6.2, minutes: 34, formula: '1 km = 1 XP' },
    { key: 'strength', name: 'Strength', skills: emptySkills('strength', ['Deadlift', 'Squat', 'Bench press']), xp: 0, level: 0, currentXp: 0, nextLevelXp: 5, progress: 0, activityCount: 0, distanceKm: 0, minutes: 0, xpUnavailable: true, formula: 'Based on total pounds lifted; lifting volume is not available from Strava summaries yet' },
    { key: 'cycling', name: 'Cycling', skills: emptySkills('cycling', ['5K', '20K', '50K', '75K', '100K']), xp: 4.9, level: 0, currentXp: 4.9, nextLevelXp: 5, progress: 0.98, activityCount: 1, distanceKm: 24.5, minutes: 62, formula: '5 km = 1 XP' },
  ],
  recentActivities: demoActivities.map((activity, index) => ({ ...activity, classKey: index === 0 ? 'running' : index === 1 ? 'cycling' : null, xp: index === 0 ? 6.2 : index === 1 ? 4.9 : 0 })),
};
