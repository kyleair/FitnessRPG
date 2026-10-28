import { Activity, demoActivities } from './activities';
export type ClassKey = 'running' | 'strength' | 'cycling';
export interface Skill {
  key: string; name: string; distanceMeters: number | null; subclass: string;
  best: { timeMs: number; activityId: number; activityName: string; achievedAt: string; source: string; method: string } | null;
}
export interface FitnessClass {
  key: ClassKey; name: string; skills: Skill[]; xp: number; level: number; currentXp: number;
  nextLevelXp: number; progress: number; activityCount: number; distanceKm: number; minutes: number; formula: string; xpUnavailable?: boolean;
}
export interface Dashboard {
  syncInProgress?: boolean; syncRetryAt?: string | null;
  skillsUnavailable?: number; skillsPending?: number; skillsStale?: boolean; source: string; syncedAt: string | null; stale: boolean; historyComplete: boolean; importedCount: number;
  month: string; monthlyDistanceKm: number; classes: FitnessClass[];
  recentActivities: (Activity & { classKey: ClassKey | null; xp: number })[];
}
const emptySkills = (classKey: ClassKey, skills: [string, string, string][]): Skill[] => skills.map(([key, name, subclass]) => ({ key: `${classKey}_${key}`, name, distanceMeters: null, subclass, best: null }));
export const demoDashboard: Dashboard = {
  source: 'demo', syncedAt: null, stale: false, historyComplete: false, importedCount: 3,
  month: '2026-10', monthlyDistanceKm: 33.8,
  classes: [
    { key: 'running', name: 'Running', skills: emptySkills('running', [['1k', '1K', 'speed'], ['5k', '5K', 'speed'], ['10k', '10K', 'endurance'], ['half_marathon', 'Half marathon', 'endurance'], ['marathon', 'Marathon', 'endurance'], ['100m', '100M', 'speed']]), xp: 6.2, level: 1, currentXp: 1.2, nextLevelXp: 7, progress: 1.2 / 7, activityCount: 1, distanceKm: 6.2, minutes: 34, formula: '1 km = 1 XP' },
    { key: 'strength', name: 'Strength', skills: emptySkills('strength', [['bench_press', 'Bench press', 'push'], ['deadlift', 'Deadlift', 'pull'], ['squat', 'Squat', 'legs']]), xp: 0, level: 0, currentXp: 0, nextLevelXp: 5, progress: 0, activityCount: 0, distanceKm: 0, minutes: 0, xpUnavailable: true, formula: 'Based on total pounds lifted; lifting volume is not available from Strava summaries yet' },
    { key: 'cycling', name: 'Cycling', skills: emptySkills('cycling', [['5k', '5K', 'speed'], ['20k', '20K', 'endurance'], ['50k', '50K', 'endurance'], ['75k', '75K', 'climbing'], ['100k', '100K', 'climbing']]), xp: 24.5 / 3, level: 1, currentXp: 24.5 / 3 - 5, nextLevelXp: 7, progress: (24.5 / 3 - 5) / 7, activityCount: 1, distanceKm: 24.5, minutes: 62, formula: '3 km = 1 XP' },
  ],
  recentActivities: demoActivities.map((activity, index) => ({ ...activity, classKey: index === 0 ? 'running' : index === 1 ? 'cycling' : null, xp: index === 0 ? 6.2 : index === 1 ? 24.5 / 3 : 0 })),
};
