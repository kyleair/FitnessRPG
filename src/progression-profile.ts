import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ageBands, type AgeBand, type SkillGender } from './skill-progression';

export const progressionProfileKey = 'fitness-progression-profile';
export type ProgressionProfile = { gender: SkillGender; ageBand: AgeBand };
export const defaultProgressionProfile: ProgressionProfile = { gender: 'men', ageBand: '18-34' };
const profileListeners = new Set<(profile: ProgressionProfile) => void>();

async function readProfile(): Promise<ProgressionProfile> {
  try {
    const raw = await AsyncStorage.getItem(progressionProfileKey);
    if (!raw) return defaultProgressionProfile;
    const saved = JSON.parse(raw) as Partial<ProgressionProfile>;
    return { gender: saved.gender === 'women' ? 'women' : 'men', ageBand: saved.ageBand && ageBands.includes(saved.ageBand) ? saved.ageBand : '18-34' };
  } catch { return defaultProgressionProfile; }
}

export function useProgressionProfile() {
  const [profile, setProfile] = useState<ProgressionProfile>(defaultProgressionProfile);
  useEffect(() => {
    profileListeners.add(setProfile);
    void readProfile().then(setProfile);
    return () => { profileListeners.delete(setProfile); };
  }, []);
  const updateProfile = (next: Partial<ProgressionProfile>) => {
    const updated = { ...profile, ...next };
    profileListeners.forEach(listener => listener(updated));
    void AsyncStorage.setItem(progressionProfileKey, JSON.stringify(updated));
  };
  return { profile, updateProfile };
}
