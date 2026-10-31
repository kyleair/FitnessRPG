import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { stripTypeScriptTypes } from 'node:module';

// Explicit stripping also supports Node 22.13, before automatic TS loading.
const loadTypeScript = async path => import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(readFileSync(new URL(path, import.meta.url), 'utf8'))).toString('base64')}`);
const { formatSkillResult, skillAttribution } = await loadTypeScript('../src/format.ts');
const { progressionTable, skillRank } = await loadTypeScript('../src/skill-progression.ts');

const result = extra => ({ timeMs: 300000, activityId: 1, activityName: 'Morning run', achievedAt: '2026-10-20T12:00:00Z', source: 'strava', method: 'strava_best_efforts', ...extra });

test('skill displays keep duration, distance, and elevation units separate and explain calculated efforts', () => {
  assert.equal(formatSkillResult(result({})), '5:00');
  assert.equal(formatSkillResult(result({ kind: 'duration', value: 4000000, timeMs: 4000000, unit: 'ms' })), '1:06:40');
  assert.equal(formatSkillResult(result({ kind: 'distance', value: 12.5, unit: 'km' })), '12.5 km');
  assert.equal(formatSkillResult(result({ kind: 'elevation', value: 120, unit: 'm' })), '120 m');
  assert.match(skillAttribution({ best: result({}) }), /Strava best effort/);
  assert.match(skillAttribution({ best: result({ method: 'distance_time_stream_v1' }) }), /Strava stream estimate/);
  const window = { start: '2026-10-03T00:00:00Z', end: '2026-10-31T00:00:00Z' };
  assert.match(skillAttribution({ best: result({ window, activityName: '2 Strava runs', partial: true }) }), /UTC.*2 Strava runs.*Missing elevation for some activities/);
});

test('Longest Run level references use increasing duration rather than kilometers', () => {
  const table = progressionTable('longest_run', 'men', '18-34');
  assert.equal(table.unit, 'duration');
  assert.equal(table.direction, 'higher');
  assert.equal(table.levels[0].value, 1800);
  assert.equal(table.levels[99].value, 43200);
});

test('skill ranks use material tiers and reserve ornate styling for the endgame', () => {
  assert.equal(skillRank(1).name, 'Iron');
  assert.equal(skillRank(1).division, 1);
  assert.equal(skillRank(20).name, 'Bronze');
  assert.equal(skillRank(25).name, 'Silver');
  assert.equal(skillRank(25).division, 2);
  assert.equal(skillRank(60).name, 'Diamond');
  assert.equal(skillRank(61).name, 'Diamond');
  assert.equal(skillRank(71).name, 'Champ');
  assert.equal(skillRank(100).name, 'Master');
  assert.equal(skillRank(100).division, 5);
  assert.equal(skillRank(100).ornate, true);
});
