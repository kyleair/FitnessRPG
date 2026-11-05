import type { ClassKey, Dashboard } from './dashboard';
import { skillMilestones } from './skill-display';
import type { AgeBand, SkillGender } from './skill-progression';

export type SkillLevelUp = { key: string; skillName: string; classKey: ClassKey; className: string; subclass: string; previousLevel: number; newLevel: number; activityName?: string };

export function findSkillLevelUps(previous: Dashboard, next: Dashboard, gender: SkillGender, ageBand: AgeBand): SkillLevelUp[] {
  const oldSkills = new Map(previous.classes.flatMap(fitnessClass => fitnessClass.skills.map(skill => [`${fitnessClass.key}:${skill.key}`, skill] as const)));
  return next.classes.flatMap(fitnessClass => fitnessClass.skills.flatMap(skill => {
    const old = oldSkills.get(`${fitnessClass.key}:${skill.key}`);
    if (!old?.best || !skill.best || skill.processing) return [];
    const before = skillMilestones(old, fitnessClass.key, gender, ageBand);
    const after = skillMilestones(skill, fitnessClass.key, gender, ageBand);
    if (!before || !after || after.level <= before.level) return [];
    return [{ key: `${fitnessClass.key}:${skill.key}:${after.level}`, skillName: skill.name, classKey: fitnessClass.key, className: fitnessClass.name, subclass: skill.subclass, previousLevel: before.level, newLevel: after.level, activityName: skill.best.activityName || undefined }];
  }));
}
