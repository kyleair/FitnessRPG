import type { ClassKey, Dashboard, Skill } from './dashboard';
import { progressionTable, skillRank, type AgeBand, type ProgressionUnit, type SkillGender, type SkillRank } from './skill-progression';

export type SkillMilestones = {
  level: number;
  currentLevel: number;
  nextLevel: number;
  progress: number;
  unit: ProgressionUnit;
  decimalPlaces: number;
};

export type RankedSkill = {
  classKey: ClassKey;
  skill: Skill;
  milestones: SkillMilestones;
  rank: SkillRank;
};

export function skillMilestones(skill: Skill, classKey: ClassKey, gender: SkillGender, ageBand: AgeBand): SkillMilestones | null {
  if (!skill.best) return null;
  const progression = progressionTable(skill.key.replace(`${classKey}_`, ''), gender, ageBand);
  if (!progression) return null;
  const rawValue = skill.best.value ?? skill.best.timeMs;
  if (rawValue === undefined) return null;
  const value = skill.measurement === 'duration' ? rawValue / 1000 : rawValue;
  const level = progression.direction === 'lower'
    ? progression.levels.reduce((result, row) => value <= row.value ? row.level : result, 1)
    : progression.levels.reduce((result, row) => value >= row.value ? row.level : result, 1);
  const safeLevel = Math.max(1, Math.min(100, level));
  const currentLevel = progression.levels[safeLevel - 1].value;
  const nextLevel = progression.levels[Math.min(99, safeLevel)].value;
  const span = Math.abs(currentLevel - nextLevel);
  const progress = safeLevel === 100 || span === 0 ? 1 : progression.direction === 'lower'
    ? Math.max(0, Math.min(1, (currentLevel - value) / span))
    : Math.max(0, Math.min(1, (value - currentLevel) / span));
  return { level: safeLevel, currentLevel, nextLevel, progress, unit: progression.unit, decimalPlaces: progression.decimalPlaces ?? 0 };
}

export function topRankedSkills(data: Dashboard, gender: SkillGender, ageBand: AgeBand, count = 3): RankedSkill[] {
  return data.classes.flatMap(fitnessClass => fitnessClass.skills.flatMap(skill => {
    const milestones = skillMilestones(skill, fitnessClass.key, gender, ageBand);
    return milestones ? [{ classKey: fitnessClass.key, skill, milestones, rank: skillRank(milestones.level) }] : [];
  })).sort((left, right) => right.milestones.level - left.milestones.level || left.skill.name.localeCompare(right.skill.name)).slice(0, count);
}
