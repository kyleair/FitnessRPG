import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Activity, demoActivities } from './src/activities';

const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
async function loadActivities(): Promise<Activity[]> {
  const response = await fetch(`${apiUrl}/api/activities`, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('Could not load activities. Check the backend terminal and your API URL.');
  return response.json();
}
export default function App() {
  const [activities, setActivities] = useState<Activity[]>(apiUrl ? [] : demoActivities);
  const [loading, setLoading] = useState(!!apiUrl);
  const [error, setError] = useState('');
  async function refresh() {
    if (!apiUrl) return;
    setLoading(true);
    setError('');
    try {
      setActivities(await loadActivities());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect.');
    } finally { setLoading(false); }
  }
  useEffect(() => {
    if (!apiUrl) return;
    let active = true;
    loadActivities().then(data => {
      if (active) setActivities(data);
    }).catch(err => {
      if (active) setError(err instanceof Error ? err.message : 'Unable to connect.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);
  const distance = activities.reduce((total, activity) => total + activity.distance, 0) / 1000;
  const minutes = Math.round(activities.reduce((total, activity) => total + activity.movingTime, 0) / 60);
  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#bcf275" />}>
        <Text style={styles.eyebrow}>FITNESS TRACKER</Text>
        <Text style={styles.title}>Keep moving.</Text>
        <Text style={styles.subtitle}>Your training, one activity at a time.</Text>
        <View style={styles.badge}><Text style={styles.badgeText}>{apiUrl ? 'BACKEND MODE' : 'DEMO / SAMPLE ACTIVITIES'}</Text></View>
        <View style={styles.summary}>
          <Text style={styles.label}>RECENT ACTIVITY TOTALS</Text>
          <Text style={styles.distance}>{distance.toFixed(1)} <Text style={styles.unit}>km</Text></Text>
          <Text style={styles.subtitle}>{activities.length} activities / {minutes} minutes moving</Text>
        </View>
        <View style={styles.heading}><Text style={styles.sectionTitle}>Recent activities</Text>{apiUrl && <Pressable accessibilityRole="button" onPress={refresh} disabled={loading}><Text style={styles.action}>Refresh</Text></Pressable>}</View>
        {loading && <ActivityIndicator color="#bcf275" />}
        {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
        {!loading && !error && !activities.length && <Text style={styles.subtitle}>No activities yet. Your next session starts here.</Text>}
        {activities.map(activity => <View key={activity.id} style={styles.card}>
          <Text style={styles.label}>{activity.sportType} / {new Date(activity.startDate).toLocaleDateString()}</Text>
          <Text style={styles.activityTitle}>{activity.name}</Text>
          <Text style={styles.subtitle}>{(activity.distance / 1000).toFixed(1)} km / {Math.round(activity.movingTime / 60)} min / {Math.round(activity.elevationGain)} m gain</Text>
        </View>)}
        <Text style={styles.footer}>{apiUrl ? 'Showing up to 30 recent activities from your backend.' : 'Demo data is built in. No account or backend needed. Connect Strava when you are ready.'}</Text>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#101b18' },
  content: { paddingHorizontal: 24, paddingTop: 76, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' },
  eyebrow: { color: '#bcf275', fontWeight: '700', letterSpacing: 3, fontSize: 12 },
  title: { color: '#f4f7f1', fontSize: 40, fontWeight: '700', marginTop: 18, marginBottom: 8 },
  subtitle: { color: '#b4c4ba', fontSize: 15, lineHeight: 23 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#263a2e', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginVertical: 24 },
  badgeText: { color: '#bcf275', fontSize: 10, letterSpacing: 1, fontWeight: '700' },
  summary: { backgroundColor: '#20372b', borderRadius: 24, padding: 24, marginBottom: 32 },
  label: { color: '#a4bba8', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  distance: { color: '#bcf275', fontSize: 56, fontWeight: '700', marginVertical: 12 },
  unit: { fontSize: 24 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { color: '#f4f7f1', fontSize: 21, fontWeight: '600' },
  action: { color: '#bcf275', padding: 10 },
  card: { backgroundColor: '#1a2923', borderRadius: 18, padding: 20, marginBottom: 12 },
  activityTitle: { color: '#f4f7f1', fontSize: 19, fontWeight: '600', marginVertical: 10 },
  footer: { color: '#80978a', fontSize: 13, lineHeight: 20, marginTop: 20 },
  error: { color: '#ffc6b9', marginBottom: 16, lineHeight: 22 },
});
