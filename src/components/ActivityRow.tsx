import { memo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { type ActivityRecord } from '../dashboard';
import { Emblem } from './Emblem';
import { ManualActivityActions } from './ManualActivityActions';

const number = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 1 });
const accents = { running: '#d99638', cycling: '#63a9c6', strength: '#d56d55' };
export const ActivityRow = memo(function ActivityRow({ activity, onChanged, disabled }: { activity: ActivityRecord; onChanged?: () => void; disabled?: boolean }) {
  return <View style={styles.row}>
    <View style={styles.mark}><Emblem name={activity.classKey || 'quest'} color={activity.classKey ? accents[activity.classKey] : '#c0ae83'} size={25} /></View>
    <View style={styles.copy}>
      <Text style={styles.name}>{activity.name}</Text>
      <Text style={styles.meta}>{activity.volumeLb === undefined ? `${number(activity.distance / 1000)} km` : `${number(activity.volumeLb)} lb lifted`} · {Math.round(activity.movingTime / 60)} min</Text>
      <Text style={styles.date}>{new Date(activity.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · {activity.sportType}{activity.source === 'manual' ? ' · Manual' : ' · Strava'}</Text>
      {activity.source === 'manual' && <ManualActivityActions activity={activity} onChanged={onChanged} disabled={disabled} />}
    </View>
    <Text style={[styles.xp, !activity.classKey && styles.muted]}>{activity.classKey === 'strength' && activity.volumeLb === undefined ? 'Volume needed' : activity.classKey ? `+${number(activity.xp)} XP` : 'No XP rule'}</Text>
  </View>;
});
const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderColor: '#4c3b2b' },
  mark: { width: 34, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#493522', borderRadius: 3 },
  copy: { flex: 1, minWidth: 0 },
  name: { color: '#f3e3bb', fontFamily: serif, fontSize: 15, fontWeight: '700', lineHeight: 21 },
  meta: { color: '#c0ae83', fontFamily: serif, fontSize: 11, marginTop: 4, lineHeight: 16 },
  date: { color: '#ad997d', fontFamily: serif, fontSize: 10, marginTop: 4, lineHeight: 15 },
  xp: { color: '#e8c765', fontFamily: serif, fontSize: 13, lineHeight: 18, flexShrink: 1, maxWidth: 65, textAlign: 'right' },
  muted: { color: '#c0ae83' },
});
