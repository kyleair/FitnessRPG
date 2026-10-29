import { useEffect, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api } from '../api';
import { type ManualActivity } from '../activities';
import { ActivityForm, FormButton, formStyles as s } from '../components/ActivityForm';
import LogActivityScreen from './LogActivityScreen';
import WorkoutScreen from './WorkoutScreen';

export default function EditActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activity, setActivity] = useState<ManualActivity | null>(null);
  const [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    if (!/^-\d+$/.test(id || '')) {
      const timer = setTimeout(() => { if (active) setError('Only manual entries can be edited.'); }, 0);
      return () => { active = false; clearTimeout(timer); };
    }
    void api<{ activity: ManualActivity }>(`/api/activities/${id}`).then(result => {
      if (active) setActivity(result.activity);
    }).catch(err => { if (active) setError(err instanceof Error ? err.message : 'Unable to load this activity.'); });
    return () => { active = false; };
  }, [id, attempt]);
  if (activity && String(activity.id) === id) return activity.recordingMethod === 'workout'
    ? <WorkoutScreen key={`${activity.id}-${activity.revision}`} activity={activity} />
    : <LogActivityScreen key={`${activity.id}-${activity.revision}`} activity={activity} />;
  return <ActivityForm eyebrow="MANUAL ENTRY" title="Edit activity">
    {error ? <><Text accessibilityRole="alert" style={s.error}>{error}</Text><FormButton title="Try again" onPress={() => { setError(''); setAttempt(value => value + 1); }} /></> : <ActivityIndicator color="#e8c765" />}
  </ActivityForm>;
}
