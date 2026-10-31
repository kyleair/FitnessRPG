import { Activity, demoActivities } from './activities';
export type ClassKey = 'running' | 'strength' | 'cycling';
export type ActivityRecord = Activity & { classKey: ClassKey | null; xp: number };
export interface ActivityPage {
  items: ActivityRecord[]; total: number; nextCursor: string | null; historyComplete: boolean; source: string;
}
export interface Skill {
  key: string; name: string; distanceMeters: number | null; subclass: string; measurement: string; unlocked?: boolean; processing?: boolean;
  explanation?: string; window?: { start: string; end: string };
  best: { timeMs?: number; kind?: 'duration' | 'distance' | 'elevation'; value?: number; unit?: 'ms' | 'km' | 'm'; window?: { start: string; end: string }; partial?: boolean; activityId: number | null; activityName: string; achievedAt: string; source: string; method: string } | null;
}
export interface FitnessClass {
  key: ClassKey; name: string; skills: Skill[]; xp: number; level: number; currentXp: number;
  nextLevelXp: number; progress: number; activityCount: number; distanceKm: number; minutes: number; formula: string; xpUnavailable?: boolean;
}
export interface Dashboard {
  activityCount?: number; manualCount?: number;
  syncInProgress?: boolean; syncRetryAt?: string | null;
  skillsUnavailable?: number; skillsPending?: number; skillsStale?: boolean; source: string; syncedAt: string | null; stale: boolean; historyComplete: boolean; importedCount: number;
  month: string; monthlyDistanceKm: number; classes: FitnessClass[];
  recentActivities: ActivityRecord[];
}
const emptySkills = (classKey: ClassKey, skills: [string, string, string, string][]): Skill[] => skills.map(([key, name, subclass, measurement]) => ({ key: `${classKey}_${key}`, name, distanceMeters: null, subclass, measurement, unlocked: false, best: null }));
export const demoDashboard: Dashboard = {
  source: 'demo', syncedAt: null, stale: false, historyComplete: false, importedCount: 3,
  month: '2026-10', monthlyDistanceKm: 33.8,
  classes: [
    { key: 'running', name: 'Running', skills: emptySkills('running', [['100m', '100M', 'speed', 'duration'], ['200m', '200M', 'speed', 'duration'], ['400m', '400M', 'speed', 'duration'], ['800m', '800M', 'speed', 'duration'], ['5k', '5K', 'endurance', 'duration'], ['10k', '10K', 'endurance', 'duration'], ['half_marathon', 'Half marathon', 'endurance', 'duration'], ['marathon', 'Full marathon', 'endurance', 'duration'], ['longest_run', 'Longest run', 'endurance', 'duration'], ['monthly_distance', 'Monthly distance', 'endurance', 'kilometers'], ['total_elevation_run', 'Total elevation in one run', 'climbing', 'elevation'], ['longest_sustained_run_climb', 'Longest sustained climb', 'climbing', 'duration'], ['monthly_elevation_run', 'Monthly elevation', 'climbing', 'elevation']]), xp: 6.2, level: 1, currentXp: 1.2, nextLevelXp: 7, progress: 1.2 / 7, activityCount: 1, distanceKm: 6.2, minutes: 34, formula: '1 km = 1 XP' },
    { key: 'strength', name: 'Strength', skills: emptySkills('strength', [['bench_press', 'Bench press', 'push', 'one-rep max'], ['overhead_press', 'Overhead press', 'push', 'one-rep max'], ['dips', 'Dips', 'push', 'reps + added weight'], ['monthly_pressing_volume', 'Monthly pressing volume', 'push', 'volume'], ['deadlift', 'Deadlift', 'pull', 'one-rep max'], ['pull_ups', 'Pull-ups', 'pull', 'reps + added weight'], ['chin_ups', 'Chin-ups', 'pull', 'reps + added weight'], ['monthly_pulling_volume', 'Monthly pulling volume', 'pull', 'volume'], ['back_squat', 'Back squat', 'legs', 'one-rep max'], ['leg_press', 'Leg press', 'legs', 'one-rep max'], ['monthly_leg_volume', 'Monthly leg volume', 'legs', 'volume']]), xp: 0, level: 0, currentXp: 0, nextLevelXp: 5, progress: 0, activityCount: 0, distanceKm: 0, minutes: 0, xpUnavailable: true, formula: 'Based on total pounds lifted; lifting volume is not available from Strava summaries yet' },
    { key: 'cycling', name: 'Cycling', skills: emptySkills('cycling', [['1k', '1K', 'speed', 'duration'], ['5k', '5K', 'speed', 'duration'], ['10k', '10K', 'speed', 'duration'], ['longest_ride', 'Longest ride', 'endurance', 'kilometers'], ['20k', '20K', 'endurance', 'duration'], ['50k', '50K', 'endurance', 'duration'], ['100k', '100K', 'endurance', 'duration'], ['160k', '160K', 'endurance', 'duration'], ['monthly_distance', 'Monthly distance', 'endurance', 'kilometers'], ['monthly_elevation_cycling', 'Monthly elevation', 'climbing', 'elevation'], ['vertical_meters_one_hour', 'Vertical meters in one hour', 'climbing', 'elevation'], ['longest_sustained_cycling_climb', 'Longest sustained climb', 'climbing', 'duration'], ['total_elevation_ride', 'Total elevation in one ride', 'climbing', 'elevation']]), xp: 24.5 / 3, level: 1, currentXp: 24.5 / 3 - 5, nextLevelXp: 7, progress: (24.5 / 3 - 5) / 7, activityCount: 1, distanceKm: 24.5, minutes: 62, formula: '3 km = 1 XP' },
  ],
  recentActivities: demoActivities.map((activity, index) => ({ ...activity, classKey: index === 0 ? 'running' : index === 1 ? 'cycling' : null, xp: index === 0 ? 6.2 : index === 1 ? 24.5 / 3 : 0 })),
};
