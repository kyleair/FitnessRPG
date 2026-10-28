import rules from '../shared/activity-rules.json';
export const today = () => {
  return localDate(new Date().toISOString());
};
export function localDate(value: string) {
  const now = new Date(value);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function activityDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Enter the date as YYYY-MM-DD.');
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day || year < 1900 || value > today()) throw new Error('Choose a valid date that is not in the future.');
  return date.toISOString();
}
export function entryNumber(value: string, label: string, allowZero = false) {
  const clean = value.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(clean)) throw new Error(`Enter a valid ${label}.`);
  const result = Number(clean);
  if (!Number.isFinite(result) || (allowZero ? result < 0 : result <= 0)) throw new Error(`Enter a ${allowZero ? 'non-negative' : 'positive'} ${label}.`);
  return result;
}
export interface ManualPayload {
  requestId: string; kind: 'manual' | 'workout'; name: string; sportType: string; startDate: string; movingTime: number; distance: number;
  weightUnit?: 'lb' | 'kg'; exercises?: { name: string; sets: { weight: number; reps: number; completed: true }[] }[];
}
export function xpPreview(activity: ManualPayload) {
  if (activity.sportType === 'Run') return activity.distance / rules.runningMetersPerXp;
  if (activity.sportType === 'Ride') return activity.distance / rules.cyclingMetersPerXp;
  if (activity.kind === 'workout') return workoutVolume(activity) / rules.strengthPoundsPerXp;
  return 0;
}
export function workoutVolume(activity: ManualPayload) {
  return (activity.exercises || []).reduce((sum, exercise) => sum + exercise.sets.reduce((n, set) => n + set.weight * set.reps, 0), 0) * (activity.weightUnit === 'kg' ? rules.kgToLb : 1);
}
export const displayNumber = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });
