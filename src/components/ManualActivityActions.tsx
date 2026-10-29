import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '../api';
import { type ManualActivity } from '../activities';
import { type ActivityRecord, type Dashboard } from '../dashboard';
import { useDashboard } from '../DashboardContext';
import { FormButton, formStyles as s } from './ActivityForm';

export function ManualActivityActions({ activity, onChanged, disabled }: { activity: ActivityRecord; onChanged?: () => void; disabled?: boolean }) {
  const { setData } = useDashboard();
  const [target, setTarget] = useState<ManualActivity | null>(null);
  const [error, setError] = useState(''), [loading, setLoading] = useState(false);
  const busy = useRef(false);
  async function confirmDelete() {
    if (busy.current) return;
    busy.current = true; setLoading(true); setError('');
    try {
      const result = await api<{ activity: ManualActivity }>(`/api/activities/${activity.id}`);
      setTarget(result.activity);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load this manual entry.'); }
    finally { busy.current = false; setLoading(false); }
  }
  async function remove() {
    if (!target || busy.current) return;
    busy.current = true; setLoading(true); setError('');
    try {
      const result = await api<{ dashboard: Dashboard }>(`/api/activities/${target.id}`, 'DELETE', { expectedRevision: target.revision });
      setTarget(null); setData(result.dashboard); onChanged?.();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not delete. It is safe to retry.'); }
    finally { busy.current = false; setLoading(false); }
  }
  return <>
    <View style={styles.actions}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${activity.name}`} disabled={loading || disabled} onPress={() => router.push({ pathname: '/activities/[id]/edit', params: { id: String(activity.id) } })} style={styles.action}><Text style={s.link}>Edit</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${activity.name}`} disabled={loading || disabled} onPress={confirmDelete} style={styles.action}><Text style={styles.delete}>{loading ? 'Please wait…' : 'Delete'}</Text></Pressable>
    </View>
    {!!error && !target && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    <Modal visible={!!target} transparent animationType="fade" onRequestClose={() => { if (!loading) setTarget(null); }}>
      <View style={styles.overlay}><View style={[s.panel, styles.sheet]} accessibilityViewIsModal>
        <Text style={s.heading}>Delete manual entry?</Text><Text style={s.body}>{target?.name}</Text>
        <Text style={s.body}>This removes the entry from your history and recalculates class XP. It cannot be undone in the app.</Text>
        {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
        <FormButton secondary title="Keep activity" disabled={loading} onPress={() => { setTarget(null); setError(''); }} />
        <FormButton title={loading ? 'Deleting…' : 'Delete activity'} disabled={loading || disabled} onPress={remove} />
      </View></View>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginTop: 4 },
  action: { minHeight: 44, minWidth: 44, justifyContent: 'center' },
  delete: { color: '#ffb9a2', fontSize: 13 },
  overlay: { flex: 1, backgroundColor: '#000b', padding: 24, alignItems: 'center', justifyContent: 'center' },
  sheet: { maxWidth: 430, width: '100%' },
});
