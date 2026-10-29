import { useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ActivityForm, Choices, Field, FormButton, formStyles as s } from '../components/ActivityForm';
import { newRequestId, useActivityDraft } from '../hooks/useActivityDraft';
import { activityDate, today, localDate, entryNumber, xpPreview, displayNumber, type ManualPayload } from '../activity-entry';
import { type ManualActivity } from '../activities';
import { api, apiUrl, ApiError } from '../api';
import { useDashboard } from '../DashboardContext';
import { type Dashboard } from '../dashboard';

const types = ['Run', 'Ride', 'Walk', 'Swim', 'Other'] as const;
type Draft = { requestId: string; type: typeof types[number]; name: string; distance: string; distanceUnit: 'km' | 'mi'; duration: string; durationUnit: 'minutes' | 'hours'; date: string; submitted?: ManualPayload };
export default function LogActivityScreen({ activity }: { activity?: ManualActivity } = {}) {
  const { draft, setDraft, clear, retain, storageError } = useActivityDraft<Draft>(activity ? `edit-log-${activity.id}-v${activity.revision}` : 'log', () => ({ requestId: newRequestId(),
    type: activity && types.includes(activity.sportType as typeof types[number]) ? activity.sportType as typeof types[number] : activity ? 'Other' : 'Ride',
    name: activity?.name || '', distance: activity ? String(activity.distance / 1000) : '', distanceUnit: 'km', duration: activity ? String(activity.movingTime / 60) : '', durationUnit: 'minutes', date: activity ? localDate(activity.startDate) : today() }));
  const { setData } = useDashboard();
  const [review, setReview] = useState<ManualPayload | null>(null);
  const [error, setError] = useState(''), [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const locked = saving || !!draft?.submitted;
  function edit(patch: Partial<Draft>) { setReview(null); setError(''); setDraft(current => current ? { ...current, ...patch } : current); }
  function prepare() {
    if (!draft) return;
    try {
      if (!draft.name.trim() || draft.name.trim().length > 120) throw new Error('Enter an activity name (up to 120 characters).');
      const distance = entryNumber(draft.distance || (draft.type === 'Other' ? '0' : ''), 'distance', draft.type === 'Other') * (draft.distanceUnit === 'mi' ? 1609.344 : 1000);
      const movingTime = Math.round(entryNumber(draft.duration, 'duration') * (draft.durationUnit === 'hours' ? 3600 : 60));
      if (distance > 2000000 || movingTime < 1 || movingTime > 604800) throw new Error('Use a distance up to 2,000 km and a duration between one second and seven days.');
      setReview({ requestId: draft.requestId, kind: 'manual', name: draft.name.trim(), sportType: draft.type === 'Other' ? 'Workout' : draft.type, distance, movingTime, startDate: activity && draft.date === localDate(activity.startDate) ? activity.startDate : activityDate(draft.date) });
      setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Check the activity details.'); }
  }
  async function save() {
    const payload = draft?.submitted || review;
    if (!draft || !payload || busy.current) return;
    if (!apiUrl) { setError('Connect your backend and Strava account from the dashboard to save. Demo entries are not written to your database.'); return; }
    busy.current = true; setSaving(true); setError('');
    try {
      await retain({ ...draft, submitted: payload });
      const result = await api<{ dashboard: Dashboard }>(activity ? `/api/activities/${activity.id}` : '/api/activities', activity ? 'PUT' : 'POST', { ...payload, ...(activity ? { expectedRevision: activity.revision } : {}) });
      setData(result.dashboard); await clear(); router.dismissTo('/activities');
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) { await retain({ ...draft, submitted: undefined }); setReview(null); }
      setError(err instanceof Error ? err.message : 'Could not save. Retry to confirm this activity without creating a duplicate.');
    }
    finally { busy.current = false; setSaving(false); }
  }
  const result = draft?.submitted || review;
  return <ActivityForm eyebrow="MANUAL ENTRY" title={activity ? 'Edit activity' : 'Log an activity'} saving={saving}>
    <Text style={s.body}>{activity ? 'Correct this manual entry. Saving replaces its previous XP contribution.' : 'Record something you already completed. It stays clearly labeled as a manual entry.'}</Text>
    {!draft ? <ActivityIndicator color="#e8c765" /> : <>
      {!!storageError && <Text accessibilityRole="alert" style={s.error}>{storageError}</Text>}
      {!result ? <View style={s.panel}>
        <Choices label="Activity type" value={draft.type} options={types} onChange={type => edit({ type })} disabled={locked} />
        {!activity && <FormButton secondary title="Log a past Strength workout instead" onPress={() => router.push({ pathname: '/workout', params: { mode: 'log' } })} />}
        <Field label="Activity name" value={draft.name} onChangeText={name => edit({ name })} maxLength={120} editable={!locked} placeholder="Evening bike ride" />
        <Field label="Distance" value={draft.distance} onChangeText={distance => edit({ distance })} keyboardType="decimal-pad" editable={!locked} placeholder={draft.type === 'Other' ? 'Optional' : '0'} />
        <Choices label="Distance unit" value={draft.distanceUnit} options={['km', 'mi']} onChange={distanceUnit => edit({ distanceUnit })} disabled={locked} />
        <Field label="Duration" value={draft.duration} onChangeText={duration => edit({ duration })} keyboardType="decimal-pad" editable={!locked} placeholder="0" />
        <Choices label="Duration unit" value={draft.durationUnit} options={['minutes', 'hours']} onChange={durationUnit => edit({ durationUnit })} disabled={locked} />
        <Field label="Date (YYYY-MM-DD)" value={draft.date} onChangeText={date => edit({ date })} autoCapitalize="none" maxLength={10} editable={!locked} />
        <FormButton title="Review activity" onPress={prepare} disabled={locked} />
      </View> : <View style={s.panel}>
        <Text style={s.eyebrow}>REVIEW ACTIVITY</Text><Text style={s.heading}>{result.name}</Text>
        <Text style={s.body}>{result.sportType} · {new Date(result.startDate).toLocaleDateString()}{'\n'}{displayNumber(result.distance / 1000)} km · {displayNumber(result.movingTime / 60)} min</Text>
        <Text style={s.heading}>+{displayNumber(xpPreview(result))} {result.sportType === 'Run' ? 'Running' : result.sportType === 'Ride' ? 'Cycling' : ''} XP</Text>
        <Text style={s.body}>{result.sportType === 'Run' ? '1 km = 1 Running XP.' : result.sportType === 'Ride' ? '3 km = 1 Cycling XP.' : 'This activity is recorded in history but has no XP rule yet.'}</Text>
        {draft.submitted && <Text style={s.body}>This save is awaiting confirmation. Retry Save to confirm it; it will not add duplicate XP.</Text>}
        {!draft.submitted && <FormButton secondary title="Edit activity" onPress={() => setReview(null)} disabled={saving} />}
        <FormButton title={saving ? 'Saving…' : activity ? 'Save changes' : 'Save activity'} onPress={save} disabled={saving} />
      </View>}
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      <Text style={s.body}>Manual entries earn class XP when a rule is available. They never change running or cycling fastest times. If you also recorded this activity in Strava, logging it here will count it twice.</Text>
    </>}
  </ActivityForm>;
}
