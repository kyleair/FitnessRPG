export interface Activity {
  id: number;
  name: string;
  sportType: string;
  distance: number;
  movingTime: number;
  elevationGain: number;
  startDate: string;
  source?: 'strava' | 'manual';
  revision?: number;
  recordingMethod?: 'manual' | 'workout';
  volumeLb?: number;
  weightUnit?: 'lb' | 'kg';
  exercises?: { name: string; sets: { weight: number; reps: number; completed: boolean }[] }[];
}
export type ManualActivity = Activity & { source: 'manual'; revision: number };
export const demoActivities: Activity[] = [
  { id: 1, name: 'Morning river run', sportType: 'Run', distance: 6200, movingTime: 2040, elevationGain: 42, startDate: '2026-10-24T08:00:00-06:00' },
  { id: 2, name: 'Evening spin', sportType: 'Ride', distance: 24500, movingTime: 3720, elevationGain: 180, startDate: '2026-10-23T17:30:00-06:00' },
  { id: 3, name: 'Lunch break reset', sportType: 'Walk', distance: 3100, movingTime: 2160, elevationGain: 15, startDate: '2026-10-22T12:00:00-06:00' },
];
