import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import rules from '../../shared/activity-rules.json';
import { ActivityForm, Choices, Field, FormButton, formStyles as s } from '../components/ActivityForm';
import { newRequestId, useActivityDraft } from '../hooks/useActivityDraft';
import { activityDate, today, localDate, entryNumber, workoutVolume, xpPreview, displayNumber, type ManualPayload } from '../activity-entry';
import { type ManualActivity } from '../activities';
import { api, apiUrl, ApiError } from '../api';
import { useDashboard } from '../DashboardContext';
import { type Dashboard } from '../dashboard';

type SetEntry = { id: string; weight: string; reps: string; completed: boolean };
type Exercise = { id: string; name: string; sets: SetEntry[] };
type Draft = { requestId: string; name: string; date: string; duration: string; startedAt: number; weightUnit: 'lb' | 'kg'; exercises: Exercise[]; template?: typeof templates[number]; submitted?: ManualPayload };
const blankSet = (): SetEntry => ({ id: newRequestId(), weight: '', reps: '', completed: false });
const exercise = (name: string): Exercise => ({ id: newRequestId(), name, sets: [blankSet(), blankSet(), blankSet()] });
const templates = ['Blank workout', 'Upper body', 'Lower body'] as const;
export default function WorkoutScreen({ activity }: { activity?: ManualActivity } = {}) {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const past = !!activity || mode === 'log';
  const { draft, setDraft, clear, retain, storageError } = useActivityDraft<Draft>(activity ? `edit-workout-${activity.id}-v${activity.revision}` : past ? 'past-strength' : 'workout', () => ({ requestId: newRequestId(),
    name: activity?.name || (past ? 'Strength workout' : 'Today’s session'), date: activity ? localDate(activity.startDate) : today(), duration: activity ? String(activity.movingTime / 60) : '', startedAt: activity ? Date.parse(activity.startDate) : Date.now(), weightUnit: activity?.weightUnit || 'lb',
    exercises: activity?.exercises?.map(item => ({ id: newRequestId(), name: item.name, sets: item.sets.map(set => ({ id: newRequestId(), weight: String(set.weight), reps: String(set.reps), completed: true })) })) || [] }));
  const { setData } = useDashboard();
  const [picker, setPicker] = useState(false), [search, setSearch] = useState('');
  const [template, setTemplate] = useState<typeof templates[number] | null>(null);
  const [discard, setDiscard] = useState(false);
  const [review, setReview] = useState<ManualPayload | null>(null);
  const [error, setError] = useState(''), [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const locked = saving || !!draft?.submitted;
  function edit(patch: Partial<Draft>) { setReview(null); setError(''); setDraft(current => current ? { ...current, ...patch } : current); }
  function updateExercise(id: string, update: (item: Exercise) => Exercise) {
    if (!draft) return;
    edit({ exercises: draft.exercises.map(item => item.id === id ? update(item) : item) });
  }
  function updateSet(exerciseId: string, setId: string, patch: Partial<SetEntry>) {
    updateExercise(exerciseId, item => ({ ...item, sets: item.sets.map(set => set.id === setId ? { ...set, ...patch, completed: activity ? set.completed : false } : set) }));
  }
  function toggleSet(exerciseId: string, set: SetEntry) {
    try {
      if (!set.completed) {
        const weight = entryNumber(set.weight, 'weight', true), reps = entryNumber(set.reps, 'reps');
        if (weight > 2000 || !Number.isInteger(reps) || reps > 1000) throw new Error('Use a weight up to 2,000 and 1-1,000 whole reps.');
      }
      updateExercise(exerciseId, item => ({ ...item, sets: item.sets.map(entry => entry.id === set.id ? { ...entry, completed: !entry.completed } : entry) }));
    } catch (err) { setError(err instanceof Error ? err.message : 'Check this set.'); }
  }
  function applyTemplate(value: typeof templates[number]) {
    edit({ template: value, exercises: value === 'Upper body' ? ['Bench press', 'Overhead press', 'Barbell row'].map(exercise) : value === 'Lower body' ? ['Back squat', 'Romanian deadlift', 'Walking lunge'].map(exercise) : [] });
    setTemplate(null);
  }
  function weightUnit(unit: 'lb' | 'kg') {
    if (!draft || unit === draft.weightUnit) return;
    const factor = unit === 'kg' ? 1 / rules.kgToLb : rules.kgToLb;
    edit({ weightUnit: unit, exercises: draft.exercises.map(item => ({ ...item, sets: item.sets.map(set => ({ ...set,
      weight: set.weight.trim() && Number.isFinite(Number(set.weight.replace(',', '.'))) ? String(Math.round(Number(set.weight.replace(',', '.')) * factor * 100) / 100) : set.weight })) })) });
  }
  function prepare() {
    if (!draft) return;
    try {
      if (!draft.name.trim() || draft.name.trim().length > 120) throw new Error('Enter a workout name (up to 120 characters).');
      const exercises = draft.exercises.map(item => ({ name: item.name, sets: item.sets.filter(set => set.completed).map(set => {
        const weight = entryNumber(set.weight, 'weight', true), reps = entryNumber(set.reps, 'reps');
        if (weight > 2000 || !Number.isInteger(reps) || reps > 1000) throw new Error('Use a weight up to 2,000 and 1-1,000 whole reps.');
        return { weight, reps, completed: true as const };
      }) })).filter(item => item.sets.length);
      if (!exercises.length) throw new Error('Mark at least one set complete using its circle before finishing.');
      const movingTime = past ? Math.round(entryNumber(draft.duration, 'duration in minutes') * 60) : Math.max(1, Math.floor((Date.now() - draft.startedAt) / 1000));
      if (movingTime < 1 || movingTime > 604800) throw new Error('Workout duration must be between one second and seven days.');
      setReview({ requestId: draft.requestId, kind: 'workout', name: draft.name.trim(), sportType: 'WeightTraining',
        startDate: activity && draft.date === localDate(activity.startDate) ? activity.startDate : past ? activityDate(draft.date) : new Date(draft.startedAt).toISOString(), movingTime, distance: 0, weightUnit: draft.weightUnit, exercises });
      setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Check the completed sets.'); }
  }
  async function save() {
    const payload = draft?.submitted || review;
    if (!draft || !payload || busy.current) return;
    if (!apiUrl) { setError('Connect your backend and Strava account from the dashboard to save. Your draft remains on this device.'); return; }
    busy.current = true; setSaving(true); setError('');
    try {
      await retain({ ...draft, submitted: payload });
      const result = await api<{ dashboard: Dashboard }>(activity ? `/api/activities/${activity.id}` : '/api/activities', activity ? 'PUT' : 'POST', { ...payload, ...(activity ? { expectedRevision: activity.revision } : {}) });
      setData(result.dashboard); await clear(); router.dismissTo('/activities');
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) { await retain({ ...draft, submitted: undefined }); setReview(null); }
      setError(err instanceof Error ? err.message : 'Could not save. Retry to confirm this workout without duplicate XP.');
    }
    finally { busy.current = false; setSaving(false); }
  }
  const result = draft?.submitted || review;
  const matches = rules.exercises.filter(name => name.toLowerCase().includes(search.trim().toLowerCase()) && !draft?.exercises.some(item => item.name === name));
  const completed = draft?.exercises.reduce((sum, item) => sum + item.sets.filter(set => set.completed).length, 0) || 0;
  return <ActivityForm eyebrow={past ? 'MANUAL STRENGTH ENTRY' : 'WORKOUT IN PROGRESS'} title={activity ? 'Edit Strength workout' : past ? 'Log a Strength workout' : 'Start a workout'} saving={saving}>
    <Text style={s.body}>{activity ? 'Correct the workout’s details and completed sets. Saving replaces its previous Strength XP contribution.' : 'Choose exercises, record each set, and save the session when you are done. Your draft is kept on this device until you finish.'}</Text>
    {!draft ? <ActivityIndicator color="#e8c765" /> : <>
      {!!storageError && <Text accessibilityRole="alert" style={s.error}>{storageError}</Text>}
      {!result ? <>
        <Choices label="Workout template" value={draft.template || 'Blank workout'} options={templates} disabled={locked} onChange={value => draft.exercises.length ? setTemplate(value) : applyTemplate(value)} />
        <View style={s.panel}>
          <Text style={s.eyebrow}>EXERCISES · {completed} SETS COMPLETE</Text>
          <Field label="Workout name" value={draft.name} onChangeText={name => edit({ name })} maxLength={120} editable={!locked} />
          {past ? <><Field label="Date (YYYY-MM-DD)" value={draft.date} onChangeText={date => edit({ date })} maxLength={10} editable={!locked} /><Field label="Duration (minutes)" value={draft.duration} onChangeText={duration => edit({ duration })} keyboardType="decimal-pad" editable={!locked} /></> : <Text style={s.body}>Started {new Date(draft.startedAt).toLocaleString()}. Duration is recorded when you complete the workout.</Text>}
          <Choices label="Weight unit (changing units converts entered weights)" value={draft.weightUnit} options={['lb', 'kg']} disabled={locked} onChange={weightUnit} />
          {!draft.exercises.length && <Text style={s.body}>Your session is blank. Add your first exercise below.</Text>}
          {draft.exercises.map(item => <View key={item.id} style={styles.exercise}>
            <View style={styles.exerciseHead}><Text style={[s.heading, { flex: 1 }]}>{item.name}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.name}`} disabled={locked} onPress={() => edit({ exercises: draft.exercises.filter(entry => entry.id !== item.id) })} style={s.textButton}><Text style={s.link}>Remove</Text></Pressable></View>
            <Text style={s.label}>SET     WEIGHT ({draft.weightUnit})             REPS</Text>
            {item.sets.map((set, index) => <View key={set.id} style={styles.setRow}>
              <Text style={styles.setNumber}>{index + 1}</Text>
              <TextInput accessibilityLabel={`${item.name} set ${index + 1} weight`} value={set.weight} onChangeText={weight => updateSet(item.id, set.id, { weight })} editable={!locked} keyboardType="decimal-pad" placeholder={draft.weightUnit} placeholderTextColor="#927f68" style={[s.input, styles.setInput]} />
              <TextInput accessibilityLabel={`${item.name} set ${index + 1} reps`} value={set.reps} onChangeText={reps => updateSet(item.id, set.id, { reps })} editable={!locked} keyboardType="number-pad" placeholder="reps" placeholderTextColor="#927f68" style={[s.input, styles.setInput]} />
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: set.completed, disabled: locked }} accessibilityLabel={`Complete ${item.name} set ${index + 1}`} disabled={locked} onPress={() => toggleSet(item.id, set)} style={styles.check}><Text style={styles.checkText}>{set.completed ? '✓' : '○'}</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${item.name} set ${index + 1}`} disabled={locked} onPress={() => updateExercise(item.id, entry => ({ ...entry, sets: entry.sets.filter(row => row.id !== set.id) }))} style={styles.removeSet}><Text style={s.link}>×</Text></Pressable>
            </View>)}
            <FormButton secondary title="+ Add set" disabled={locked || item.sets.length >= 30} onPress={() => updateExercise(item.id, entry => ({ ...entry, sets: [...entry.sets, blankSet()] }))} />
          </View>)}
          <FormButton secondary title="+ Add exercise" disabled={locked || draft.exercises.length >= 40} onPress={() => { setSearch(''); setPicker(true); }} />
          <FormButton title="Complete workout" onPress={prepare} disabled={locked} />
          {!activity && <FormButton secondary title="Discard workout draft" disabled={locked} onPress={() => setDiscard(true)} />}
        </View>
      </> : <View style={s.panel}>
        <Text style={s.eyebrow}>REVIEW WORKOUT</Text><Text style={s.heading}>{result.name}</Text>
        {result.exercises?.map(item => <View key={item.name}><Text style={s.link}>{item.name}</Text><Text style={s.body}>{item.sets.map(set => `${set.weight} ${result.weightUnit} × ${set.reps}`).join(' · ')}</Text></View>)}
        <Text style={s.heading}>{displayNumber(workoutVolume(result))} lb lifted{ '\n' }+{displayNumber(xpPreview(result))} Strength XP</Text>
        <Text style={s.body}>Completed-set weight × reps, converted to pounds ÷ {rules.strengthPoundsPerXp}. Incomplete sets are not saved or counted.</Text>
        {draft.submitted && <Text style={s.body}>This save is awaiting confirmation. Retry Save to confirm it without adding duplicate XP.</Text>}
        {!draft.submitted && <FormButton secondary title="Keep working out" disabled={saving} onPress={() => setReview(null)} />}
        <FormButton title={saving ? 'Saving…' : activity ? 'Save changes' : 'Save workout'} disabled={saving} onPress={save} />
      </View>}
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      <Text style={s.body}>Only completed sets earn XP: {rules.strengthPoundsPerXp} lb lifted = 1 Strength XP. Use 0 for unweighted sets; body weight is not inferred. Strength skill records are not updated by this entry.</Text>
    </>}
    <Modal visible={picker} transparent animationType="slide" onRequestClose={() => setPicker(false)}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><View style={styles.sheet} accessibilityViewIsModal>
        <View style={s.row}><Text style={[s.heading, { flex: 1 }]}>Add an exercise</Text><Pressable accessibilityRole="button" accessibilityLabel="Close exercise picker" onPress={() => setPicker(false)} style={styles.check}><Text style={styles.checkText}>×</Text></Pressable></View>
        <Field label="Search exercises" value={search} onChangeText={setSearch} placeholder="Search exercises" autoFocus />
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8 }}>
          {matches.map(name => <Pressable key={name} accessibilityRole="button" onPress={() => { if (draft) edit({ exercises: [...draft.exercises, exercise(name)] }); setPicker(false); }} style={styles.exerciseOption}><Text style={s.heading}>+  {name}</Text><Text style={s.body}>Strength exercise · Add to today’s session</Text></Pressable>)}
          {!matches.length && <Text style={s.body}>No exercises found. Try another search. Exercises already in your session are hidden.</Text>}
        </ScrollView>
      </View></KeyboardAvoidingView>
    </Modal>
    <Modal visible={template !== null || discard} transparent animationType="fade" onRequestClose={() => { setTemplate(null); setDiscard(false); }}><View style={styles.overlay}><View style={styles.sheet} accessibilityViewIsModal>
      <Text style={s.heading}>{discard ? 'Discard this workout draft?' : 'Replace current exercises?'}</Text><Text style={s.body}>{discard ? 'This removes the draft’s exercises and sets from this device and starts a fresh workout. Completed activities are kept.' : `Applying ${template} removes your current exercises and sets from this draft.`}</Text>
      <FormButton secondary title="Keep current workout" onPress={() => { setTemplate(null); setDiscard(false); }} /><FormButton title={discard ? 'Discard draft' : 'Replace exercises'} onPress={() => {
        if (discard) {
          void retain({ requestId: newRequestId(), name: past ? 'Strength workout' : 'Today’s session', date: today(), duration: '', startedAt: Date.now(), weightUnit: 'lb', exercises: [] })
            .then(() => { setDiscard(false); setReview(null); setError(''); }).catch(err => { setDiscard(false); setError(err instanceof Error ? err.message : 'Unable to reset the draft.'); });
        } else if (template) applyTemplate(template);
      }} />
    </View></View></Modal>
  </ActivityForm>;
}
const styles = StyleSheet.create({
  exercise: { gap: 12, borderTopWidth: 1, borderColor: '#59432d', paddingTop: 12 },
  exerciseHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  setInput: { flex: 1, minWidth: 0, paddingHorizontal: 8 },
  setNumber: { color: '#c0ae83', width: 16, fontSize: 12 },
  check: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  checkText: { color: '#e8c765', fontSize: 24 },
  removeSet: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, backgroundColor: '#000b', justifyContent: 'flex-end', alignItems: 'center', padding: 16 },
  sheet: { maxWidth: 470, width: '100%', maxHeight: '85%', padding: 18, borderWidth: 2, borderColor: '#876035', borderRadius: 5, backgroundColor: '#302720', gap: 14, paddingBottom: 24 },
  exerciseOption: { minHeight: 64, padding: 14, gap: 5, borderWidth: 1, borderColor: '#876035', borderRadius: 4, backgroundColor: '#38291e' },
});
