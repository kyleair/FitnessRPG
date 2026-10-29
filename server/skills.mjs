export const skillDefinitions = {
  // The fourth tuple value is the subclass shown on the class page.
  running: [["1k", "1K", 1000, "speed"], ["5k", "5K", 5000, "speed"], ["10k", "10K", 10000, "endurance"], ["half_marathon", "Half marathon", 21097.5, "endurance"], ["marathon", "Marathon", 42195, "endurance"], ["100m", "100M", 100, "speed"]],
  cycling: [["5k", "5K", 5000, "speed"], ["20k", "20K", 20000, "endurance"], ["50k", "50K", 50000, "endurance"], ["75k", "75K", 75000, "climbing"], ["100k", "100K", 100000, "climbing"]],
  strength: [["bench_press", "Bench press", null, "push"], ["deadlift", "Deadlift", null, "pull"], ["squat", "Squat", null, "legs"]],
};
export const calculationVersion = classKey => classKey === 'running' ? 2 : 1;

export function runningBestTimes(details) {
  if (!Array.isArray(details?.best_efforts)) return null;
  const times = {};
  for (const effort of details.best_efforts) {
    if (!effort || !Number.isFinite(effort.elapsed_time) || effort.elapsed_time <= 0 || !Number.isFinite(effort.distance)) continue;
    const definition = skillDefinitions.running.find(([, , distance]) => Math.abs(effort.distance - distance) <= 1);
    if (!definition) continue;
    const key = definition[0], ms = Math.round(effort.elapsed_time * 1000);
    if (!times[key] || ms < times[key]) times[key] = ms;
  }
  return times;
}
export const fingerprint = activity => JSON.stringify([activity.sportType, activity.distance, activity.movingTime, activity.startDate]);

// Piecewise-linear distance/time trace. A minimum occurs when either endpoint
// touches a sample. Scan both endpoint sets so uneven sampling does not bias it.
export function bestTimes(streams, definitions) {
  const d = streams?.distance?.data, t = streams?.time?.data;
  if (!Array.isArray(d) || !Array.isArray(t) || d.length !== t.length || d.length < 2) return null;
  if (d.some((v, i) => !Number.isFinite(v) || v < 0 || !Number.isFinite(t[i]) || t[i] < 0 || (i && (v < d[i - 1] || t[i] <= t[i - 1])))) return null;
  const results = {};
  for (const [key, , distance] of definitions) {
    let best = Infinity, right = 1, left = 0;
    for (let i = 0; i < d.length; i++) {
      const target = d[i] + distance;
      right = Math.max(right, i + 1);
      while (right < d.length && d[right] < target) right++;
      if (right === d.length) break;
      const end = t[right - 1] + (t[right] - t[right - 1]) * (target - d[right - 1]) / (d[right] - d[right - 1]);
      best = Math.min(best, end - t[i]);
    }
    for (let i = 1; i < d.length; i++) {
      const target = d[i] - distance;
      if (target < d[0]) continue;
      while (left + 1 < i && d[left + 1] <= target) left++;
      const start = t[left] + (t[left + 1] - t[left]) * (target - d[left]) / (d[left + 1] - d[left]);
      best = Math.min(best, t[i] - start);
    }
    if (Number.isFinite(best) && best > 0) results[key] = Math.round(best * 1000);
  }
  return results;
}

export function classSkills(classKey, activities, cache) {
  return skillDefinitions[classKey].map(([key, name, distanceMeters, subclass]) => {
    let best = null;
    for (const activity of activities) {
      if (activity.source === 'manual') continue;
      const entry = cache[activity.id];
      const timeMs = entry?.times?.[key];
      if (entry?.fingerprint !== fingerprint(activity) || entry?.version !== calculationVersion(classKey) || !Number.isFinite(timeMs)) continue;
      if (!best || timeMs < best.timeMs || (timeMs === best.timeMs && activity.startDate < best.achievedAt)) {
        best = { timeMs, activityId: activity.id, activityName: activity.name, achievedAt: activity.startDate, source: 'strava', method: classKey === 'running' ? 'strava_best_efforts' : 'distance_time_stream_v1' };
      }
    }
    return { key: `${classKey}_${key}`, name, distanceMeters, subclass, best };
  });
}
