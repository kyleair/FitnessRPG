import type { Skill } from './dashboard';

export function formatTime(ms: number) {
  const total = Math.round(ms / 1000), hours = Math.floor(total / 3600);
  const minutes = Math.floor(total / 60) % 60, seconds = String(total % 60).padStart(2, '0');
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}

export function formatSkillResult(best: Skill['best']) {
  if (!best) return '—';
  if (best.unit === 'km') return `${(best.value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} km`;
  if (best.unit === 'm') return `${Math.round(best.value ?? 0).toLocaleString()} m`;
  return formatTime(best.timeMs ?? best.value ?? 0);
}

export function skillAttribution(skill: Skill) {
  const best = skill.best;
  if (!best) return skill.explanation ?? 'No recorded result yet.';
  if (best.window) {
    const date = (value: string) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
    return `${date(best.window.start)} – ${date(best.window.end)} (end exclusive, UTC) · ${best.activityName}${best.partial ? ' · Missing elevation for some activities' : ''}`;
  }
  const method = best.method === 'strava_best_efforts' ? 'Strava best effort' : best.method.includes('stream') ? 'Strava stream estimate' : 'Strava';
  return `${best.activityName} · ${new Date(best.achievedAt).toLocaleDateString()} · ${method}`;
}
