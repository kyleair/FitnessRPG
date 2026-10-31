export type SkillGender = 'men' | 'women';
export type AgeBand = '18-34' | '35-39' | '40-44' | '45-49' | '50-54' | '55-59' | '60-64' | '65-69' | '70-74' | '75-79' | '80+';
export type ProgressionUnit = 'duration' | 'kilometers' | 'meters' | 'kilograms' | 'pounds' | 'reps';
export type ProgressionDirection = 'lower' | 'higher';
export type SkillRank = {
  name: 'Iron' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Champ' | 'Grand Champ' | 'Master';
  division: 1 | 2 | 3 | 4 | 5;
  color: string;
  borderWidth: number;
  borderRadius: number;
  ornate: boolean;
};

export const skillRankTiers = [
  { name: 'Iron', color: '#8d9296', borderWidth: 1, borderRadius: 4, ornate: false },
  { name: 'Bronze', color: '#b87333', borderWidth: 1, borderRadius: 4, ornate: false },
  { name: 'Silver', color: '#c8d0d8', borderWidth: 1, borderRadius: 4, ornate: false },
  { name: 'Gold', color: '#e6bd57', borderWidth: 1, borderRadius: 4, ornate: false },
  { name: 'Platinum', color: '#72d4c4', borderWidth: 1, borderRadius: 5, ornate: false },
  { name: 'Diamond', color: '#72baff', borderWidth: 1, borderRadius: 5, ornate: false },
  { name: 'Champ', color: '#f07b9b', borderWidth: 2, borderRadius: 8, ornate: true },
  { name: 'Grand Champ', color: '#c99bff', borderWidth: 2, borderRadius: 10, ornate: true },
  { name: 'Master', color: '#f5d477', borderWidth: 2, borderRadius: 12, ornate: true },
] as const;
export const skillRankCount = skillRankTiers.length * 5;

export function skillRank(level: number): SkillRank {
  const safeLevel = Math.max(1, Math.min(100, Math.round(level)));
  const rankNumber = Math.ceil(safeLevel * 45 / 100);
  const tier = skillRankTiers[Math.floor((rankNumber - 1) / 5)];
  return { ...tier, division: ((rankNumber - 1) % 5 + 1) as 1 | 2 | 3 | 4 | 5 };
}

export function skillRankScore(rankNumber: number) {
  const safeRank = Math.max(1, Math.min(skillRankCount, Math.round(rankNumber)));
  return Math.max(1, Math.min(100, Math.ceil((safeRank - 1) * 100 / skillRankCount) + 1));
}

export const ageBands: AgeBand[] = ['18-34', '35-39', '40-44', '45-49', '50-54', '55-59', '60-64', '65-69', '70-74', '75-79', '80+'];
export const genders: { key: SkillGender; label: string }[] = [{ key: 'men', label: 'Men' }, { key: 'women', label: 'Women' }];

type Anchor = { unit: ProgressionUnit; direction: ProgressionDirection; men: [number, number]; women: [number, number]; ageEffect?: number[] };

// Anchors are intentionally readable and conservative. Each pair is level 1 ->
// level 100 for ages 18-34; the app linearly interpolates the 99 levels between.
// They are a first-pass reference scale, not medical or competitive standards.
const anchors: Record<string, Anchor> = {
  '100m': { unit: 'duration', direction: 'lower', men: [25, 9.58], women: [30, 10.49] },
  '200m': { unit: 'duration', direction: 'lower', men: [55, 19.19], women: [65, 21.34] },
  '400m': { unit: 'duration', direction: 'lower', men: [125, 43.03], women: [145, 47.60] },
  '800m': { unit: 'duration', direction: 'lower', men: [300, 100], women: [340, 113] },
  '5k': { unit: 'duration', direction: 'lower', men: [2100, 765], women: [2400, 840] },
  '10k': { unit: 'duration', direction: 'lower', men: [4500, 1590], women: [5100, 1740] },
  'half_marathon': { unit: 'duration', direction: 'lower', men: [9000, 3600], women: [10200, 3900] },
  // The requested example: men 18-34 run from 6:00:00 to 2:00:00 linearly.
  'marathon': { unit: 'duration', direction: 'lower', men: [21600, 7200], women: [23400, 7800] },
  '1k': { unit: 'duration', direction: 'lower', men: [330, 130], women: [390, 145] },
  '20k': { unit: 'duration', direction: 'lower', men: [4200, 1800], women: [4800, 1980] },
  '50k': { unit: 'duration', direction: 'lower', men: [12000, 5700], women: [13800, 6300] },
  '75k': { unit: 'duration', direction: 'lower', men: [21000, 9000], women: [24000, 10200] },
  '100k': { unit: 'duration', direction: 'lower', men: [27000, 12600], women: [30000, 13800] },
  '160k': { unit: 'duration', direction: 'lower', men: [54000, 21600], women: [60000, 24000] },
  'longest_run': { unit: 'duration', direction: 'higher', men: [1800, 43200], women: [1800, 36000] },
  'longest_ride': { unit: 'kilometers', direction: 'higher', men: [20, 300], women: [15, 260] },
  'monthly_distance': { unit: 'kilometers', direction: 'higher', men: [15, 1000], women: [15, 850] },
  'monthly_elevation_run': { unit: 'meters', direction: 'higher', men: [100, 12000], women: [80, 10000] },
  'monthly_elevation_cycling': { unit: 'meters', direction: 'higher', men: [250, 30000], women: [200, 25000] },
  'total_elevation_run': { unit: 'meters', direction: 'higher', men: [50, 3000], women: [40, 2500] },
  'total_elevation_ride': { unit: 'meters', direction: 'higher', men: [100, 5000], women: [80, 4200] },
  'vertical_meters_one_hour': { unit: 'meters', direction: 'higher', men: [100, 1800], women: [80, 1500] },
  'longest_sustained_run_climb': { unit: 'duration', direction: 'higher', men: [300, 7200], women: [240, 6000] },
  'longest_sustained_cycling_climb': { unit: 'duration', direction: 'higher', men: [600, 10800], women: [480, 9000] },
  'bench_press': { unit: 'kilograms', direction: 'higher', men: [30, 220], women: [15, 140] },
  'overhead_press': { unit: 'kilograms', direction: 'higher', men: [20, 120], women: [10, 75] },
  'deadlift': { unit: 'kilograms', direction: 'higher', men: [40, 280], women: [25, 180] },
  'back_squat': { unit: 'kilograms', direction: 'higher', men: [35, 240], women: [20, 160] },
  'leg_press': { unit: 'kilograms', direction: 'higher', men: [80, 500], women: [60, 350] },
  'dips': { unit: 'reps', direction: 'higher', men: [1, 45], women: [1, 30] },
  'pull_ups': { unit: 'reps', direction: 'higher', men: [1, 35], women: [1, 22] },
  'chin_ups': { unit: 'reps', direction: 'higher', men: [1, 40], women: [1, 26] },
  'monthly_pressing_volume': { unit: 'pounds', direction: 'higher', men: [500, 250000], women: [300, 160000] },
  'monthly_pulling_volume': { unit: 'pounds', direction: 'higher', men: [500, 220000], women: [300, 140000] },
  'monthly_leg_volume': { unit: 'pounds', direction: 'higher', men: [1000, 400000], women: [700, 260000] },
};

const ageMultipliers: Record<AgeBand, number> = { '18-34': 1, '35-39': 1.03, '40-44': 1.07, '45-49': 1.12, '50-54': 1.18, '55-59': 1.25, '60-64': 1.34, '65-69': 1.44, '70-74': 1.56, '75-79': 1.70, '80+': 1.86 };

export type LevelValue = { level: number; value: number };
export type ProgressionTable = Anchor & { skillKey: string; ageBand: AgeBand; gender: SkillGender; levels: LevelValue[] };

function ageAdjusted(anchor: Anchor, gender: SkillGender, ageBand: AgeBand, level: number) {
  const [low, high] = anchor[gender];
  const fraction = (level - 1) / 99;
  const value = low + (high - low) * fraction;
  const age = ageMultipliers[ageBand];
  return anchor.direction === 'lower' ? value * age : low + (value - low) / age;
}

export function progressionTable(skillKey: string, gender: SkillGender, ageBand: AgeBand): ProgressionTable | null {
  const anchor = anchors[skillKey];
  if (!anchor) return null;
  const levels = Array.from({ length: 100 }, (_, index) => ({ level: index + 1, value: ageAdjusted(anchor, gender, ageBand, index + 1) }));
  return { ...anchor, skillKey, gender, ageBand, levels };
}

export function formatProgressionValue(value: number, unit: ProgressionUnit) {
  if (unit === 'duration') {
    const total = Math.round(value), hours = Math.floor(total / 3600), minutes = Math.floor(total / 60) % 60, seconds = total % 60;
    return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}` : `${minutes}:${String(seconds).padStart(2, '0')}`;
  }
  if (unit === 'kilometers') return `${value < 100 ? value.toFixed(1) : Math.round(value)} km`;
  if (unit === 'meters') return `${Math.round(value).toLocaleString()} m`;
  if (unit === 'kilograms') return `${Math.round(value)} kg`;
  if (unit === 'pounds') return `${Math.round(value).toLocaleString()} lb`;
  return `${Math.round(value)} reps`;
}

export function progressionUnitLabel(unit: ProgressionUnit) {
  return unit === 'duration' ? 'elapsed time' : unit;
}

export const progressionSkillCount = Object.keys(anchors).length;
