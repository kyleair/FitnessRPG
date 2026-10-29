import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Adventurer, Emblem } from '../components/Emblem';
import { Dashboard, FitnessClass } from '../dashboard';
import { router } from 'expo-router';
import { useDashboard } from '../DashboardContext';
import { formatTime } from '../format';
import { ActivityRow } from '../components/ActivityRow';

import { api, apiUrl, SessionExpiredError, signOut } from '../api';
const colors = { ink: '#f3e3bb', muted: '#c0ae83', gold: '#e8c765', border: '#876035', dark: '#211b18' };
const classColors = { running: '#78a878', strength: '#c85b55', cycling: '#a482d2' };
const classBackgrounds = { running: '#244b36', strength: '#5a2d2b', cycling: '#3d3157' };
const classCardBackgrounds = { running: '#2a3027', strength: '#302423', cycling: '#2a2732' };
const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const number = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 1 });
function Meter({ value, color = '#d58a36' }: { value: number; color?: string }) {
  return <View style={styles.meter} accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}><View style={[styles.fill, { backgroundColor: color, width: `${Math.max(0, Math.min(1, value)) * 100}%` }]} /></View>;
}
function Label({ children }: { children: React.ReactNode }) { return <Text style={styles.label}>{children}</Text>; }
export default function HomeScreen() {
  const { data, setData } = useDashboard();
  const [loading, setLoading] = useState(!!apiUrl);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connection, setConnection] = useState<{ code: string; computerUrl: string } | null>(null);
  const refreshing = useRef(false);
  const [detail, setDetail] = useState<{ title: string; body: string } | null>(null);
  const refresh = useCallback(async () => {
    if (!apiUrl || refreshing.current) return;
    refreshing.current = true;
    setLoading(true); setError('');
    try {
      const status = await api<{ connected: boolean }>('/api/session');
      setConnected(status.connected);
      if (status.connected) { setConnection(null); setData(await api<Dashboard>('/api/dashboard')); }
      else setData(null);
    }
    catch (err) {
      if (err instanceof SessionExpiredError) { setData(null); setConnected(false); }
      setError(err instanceof Error ? err.message : 'Unable to connect.');
    }
    finally { refreshing.current = false; setLoading(false); }
  }, [setData]);
  useEffect(() => {
    const initial = setTimeout(() => { void refresh(); }, 0);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    const onFocus = () => { void refresh(); };
    if (Platform.OS === 'web') window.addEventListener('focus', onFocus);
    return () => { clearTimeout(initial); subscription.remove(); if (Platform.OS === 'web') window.removeEventListener('focus', onFocus); };
  }, [refresh]);
  async function connect() {
    setConnecting(true); setError('');
    try {
      const result = await api<{ code: string; computerUrl: string }>('/api/strava/connect', 'POST');
      setConnection(result);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not start the connection.'); }
    finally { setConnecting(false); }
  }
  async function logout() {
    if (refreshing.current) return;
    refreshing.current = true;
    setConnecting(true); setError('');
    try { await signOut(); setData(null); setConnected(false); setConnection(null); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not sign out.'); }
    finally { refreshing.current = false; setConnecting(false); }
  }
  function inspectClass(fitnessClass: FitnessClass) {
    router.push({ pathname: '/classes/[classKey]', params: { classKey: fitnessClass.key } });
  }
  const best5k = data?.classes.find(item => item.key === 'running')?.skills.find(skill => skill.key === 'running_5k')?.best;
  return <LinearGradient colors={['#3b2a22', '#211b18', '#191513']} style={styles.screen}>
    <StatusBar style="light" />
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.gold} />}>
        <View style={styles.topbar}><Text style={styles.wordmark}>FITNESS <Text style={{ color: colors.gold }}>RPG</Text></Text><Pressable accessibilityRole="button" accessibilityLabel="Refresh Strava activities" disabled={loading} onPress={refresh} style={styles.refresh}><Text style={styles.refreshText}>{loading ? 'Syncing…' : '↻  Sync Strava'}</Text></Pressable></View>
        {!!error && <View style={styles.notice}><Text style={styles.error} accessibilityRole="alert">{error}{data ? ' Showing the last loaded data.' : ''}</Text><Pressable accessibilityRole="button" onPress={refresh}><Text style={styles.link}>Try again</Text></Pressable></View>}
        {!!apiUrl && !connected && !loading && <View style={styles.notice}>
          <Label>YOUR ADVENTURE STARTS HERE</Label><Text style={styles.sectionTitle}>Connect your Strava</Text>
          <Text style={styles.body}>Basic access imports activities visible to Everyone or Followers. If you grant broader access, private activities are included too. Authorize on your computer, then check the connection here.</Text>
          {connection && <>
            <Text style={styles.body}>1. On your computer, open:</Text><Text selectable style={styles.link}>{connection.computerUrl}</Text>
            <Text style={styles.body}>2. Enter this code from your phone:</Text><Text selectable style={styles.sectionTitle}>{connection.code}</Text>
            <Text style={styles.small}>Expires after 10 minutes. Sign into your own Strava account, then tap Check connection. Generate a new code if you cancel or it expires.</Text>
            <Pressable accessibilityRole="button" disabled={connecting} onPress={refresh}><Text style={styles.link}>Check connection</Text></Pressable>
          </>}
          <Pressable accessibilityRole="button" disabled={connecting} onPress={connect} style={styles.close}><Text style={styles.buttonText}>{connecting ? 'Creating code…' : connection ? 'Generate new code' : 'Connect Strava'}</Text></Pressable>
        </View>}
        {!!apiUrl && connected && <View style={styles.connection}><Text style={styles.small}>Strava connected</Text><Pressable accessibilityRole="button" disabled={loading || connecting} onPress={logout}><Text style={styles.link}>Sign out</Text></Pressable></View>}
        {loading && !data && <View style={styles.loading}><ActivityIndicator color={colors.gold} /><Text style={styles.body}>Gathering your adventure…</Text></View>}
        {data && <>
          <View style={styles.heroFrame}><LinearGradient colors={['#3b291d', '#1e1917']} style={styles.hero}>
            <View style={styles.heroTop}><View style={styles.heroCopy}><Text style={styles.heroTitle}>Wrecking Ball</Text><Text style={styles.heroDescription}>A nimble runner with the power to move mountains.</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel="Preview avatar and cosmetics" onPress={() => setDetail({ title: 'Your adventurer', body: 'This is a placeholder avatar from the Classic RPG design. Equipment, cosmetic drops, and class discovery are not connected yet. Your actual Strava data powers the class cards below.' })} style={styles.avatar}><Adventurer /><Text style={styles.star}>✦</Text></Pressable></View>
            <View style={styles.pinnedRow}>
              <View style={styles.pinned}><Text style={styles.pinnedLabel}>Fastest 5K</Text><Text style={styles.pinnedValue}>{best5k ? formatTime(best5k.timeMs) : '—'}</Text><Text style={styles.pinnedNote}>Best tracked time</Text></View>
              <View style={styles.pinned}><Text style={styles.pinnedLabel}>Bench Press</Text><Text style={styles.pinnedValue}>—</Text><Text style={styles.pinnedNote}>Not available</Text></View>
              <View style={styles.pinned}><Text style={styles.pinnedLabel}>Monthly Distance</Text><Text style={styles.pinnedValue}>{number(data.monthlyDistanceKm)} <Text style={{ fontSize: 11 }}>km</Text></Text><Text style={styles.pinnedNote}>Recorded · UTC</Text></View>
            </View>
          </LinearGradient></View>
          <View style={styles.section}><Text style={[styles.sectionTitle, styles.homeSectionTitle]}>Your Classes</Text></View>
          <View style={styles.grid}>{data.classes.map(fitnessClass => <Pressable key={fitnessClass.key} accessibilityRole="button" accessibilityLabel={`${fitnessClass.name}, level ${fitnessClass.level}. View progress`} onPress={() => inspectClass(fitnessClass)} style={({ pressed }) => [styles.classCard, { backgroundColor: classCardBackgrounds[fitnessClass.key], borderColor: classColors[fitnessClass.key] }, pressed && styles.pressed]}>
            <View style={[styles.emblemOuter, { borderColor: classColors[fitnessClass.key], backgroundColor: classCardBackgrounds[fitnessClass.key] }]}><View style={[styles.emblemInner, { backgroundColor: classBackgrounds[fitnessClass.key] }]}><Emblem name={fitnessClass.key} color={classColors[fitnessClass.key]} size={31} /></View></View>
            <Text style={[styles.classLabel, { color: classColors[fitnessClass.key] }]}>{fitnessClass.name.toUpperCase()}</Text><Text style={styles.level}>Level {fitnessClass.level}</Text>
            <Meter value={fitnessClass.progress} color={classColors[fitnessClass.key]} />
            <Text style={[styles.xp, styles.classXp]}>{number(fitnessClass.currentXp)} / {fitnessClass.nextLevelXp} XP</Text>{fitnessClass.xpUnavailable && <Text style={styles.small}>Lifting volume unavailable. Strength XP needs weight and reps.</Text>}<Text style={styles.cardLink}>View skills & progress  ›</Text>
          </Pressable>)}</View>
          <View style={styles.section}><Text style={[styles.sectionTitle, styles.homeSectionTitle]}>Quests and Activities</Text></View>
          <View style={styles.scope}><Text style={styles.scopeText}>{data.source === 'demo' ? 'SAMPLE DATA' : `${data.importedCount} ACTIVITIES IMPORTED${data.manualCount ? ` · ${data.manualCount} MANUAL` : ''}`}{!data.historyComplete && data.source !== 'demo' ? ' · HISTORY IN PROGRESS' : ''}</Text><Text style={styles.small}>Experimental XP rules. History depends on your granted Strava permissions. {data.historyComplete ? 'All accessible history imported.' : 'Totals cover imported activities, not your full lifetime.'}</Text>{data.syncInProgress && <Text style={styles.small}>{data.skillsPending || 0} activities awaiting skill processing · {data.syncRetryAt ? `Sync paused until ${new Date(data.syncRetryAt).toLocaleTimeString()}.` : 'Sync continues automatically while the server runs.'}</Text>}{data.stale && <Text style={styles.error}>Some data could not be synced. Showing saved data.</Text>}</View>
          <Pressable accessibilityRole="button" onPress={() => setDetail({ title: 'Adventure board', body: 'Daily, weekly, and monthly quests are coming soon.\n\nPreview: complete three activities in a week, or explore a new fitness class. Quest targets, rewards, and completion tracking are not active yet.' })} style={({ pressed }) => [styles.questFrame, pressed && styles.pressed]}><LinearGradient colors={['#49331f', '#30231b']} style={styles.quest}><View style={styles.questEmblem}><Emblem name="quest" color="#e8c765" /></View><View style={styles.questCopy}><Label>ADVENTURE BOARD</Label><Text style={styles.questTitle}>Quests</Text><Text style={styles.body}>Daily, weekly, and monthly challenges.</Text><Text style={styles.preview}>COMING SOON</Text></View><Text style={styles.arrow}>›</Text></LinearGradient></Pressable>
          <View style={styles.recent}><View style={styles.recentHeading}><Label>RECENT ACTIVITIES</Label><Text style={styles.strava}>{data.source === 'demo' ? 'DEMO' : data.manualCount ? 'HISTORY' : 'STRAVA'}</Text></View>
            {!data.recentActivities.length && <Text style={[styles.body, { marginVertical: 20 }]}>Your next adventure starts here. No activities imported yet.</Text>}
            {data.recentActivities.slice(0, 1).map(activity => <ActivityRow key={activity.id} activity={activity} disabled={loading} />)}
            <Pressable accessibilityRole="button" onPress={() => router.push('/activities')}><LinearGradient colors={['#e6be68', '#b68b49']} style={styles.activitiesButton}><Text style={styles.buttonText}>See more activities  ›</Text></LinearGradient></Pressable>
          </View>
          <Text style={styles.footer}>{data.source === 'demo' ? 'Demo mode · connect your backend to begin.' : `Last synced ${data.syncedAt ? new Date(data.syncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'just now'} · Pull down to refresh.`}</Text>
        </>}
      </ScrollView>
      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={() => setDetail(null)}><View style={styles.overlay}><View style={styles.sheet} accessibilityViewIsModal><ScrollView><Label>FITNESS RPG</Label><Text style={styles.sectionTitle}>{detail?.title}</Text><Text style={[styles.body, { marginVertical: 20 }]}>{detail?.body}</Text>
        </ScrollView><Pressable accessibilityRole="button" onPress={() => setDetail(null)} style={styles.close}><Text style={styles.buttonText}>Back to dashboard</Text></Pressable></View></View></Modal>
    </SafeAreaView>
  </LinearGradient>;
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  connection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  content: { width: '100%', maxWidth: 470, alignSelf: 'center', padding: 16, paddingBottom: 48 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: colors.border, paddingBottom: 14, marginBottom: 18, gap: 12 },
  wordmark: { color: colors.muted, fontFamily: serif, fontSize: 13, letterSpacing: 2 },
  refresh: { paddingHorizontal: 12, minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 3 },
  refreshText: { color: colors.gold, fontFamily: serif, fontSize: 12 },
  heroFrame: { borderWidth: 1, borderColor: '#a7773e', padding: 3, borderRadius: 5 },
  hero: { padding: 16, borderWidth: 1, borderColor: '#a7773e', gap: 20 },
  heroTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  heroCopy: { flex: 1, minWidth: 0 },
  label: { color: colors.gold, fontFamily: serif, fontSize: 10, letterSpacing: 1.6, lineHeight: 16 },
  heroTitle: { color: colors.ink, fontFamily: serif, fontSize: 31, lineHeight: 36, fontWeight: '700', marginVertical: 7 },
  heroDescription: { color: '#c3b89f', fontFamily: serif, fontSize: 13, lineHeight: 19 },
  preview: { color: '#b9a16b', fontSize: 8, letterSpacing: 1.1, marginTop: 10, lineHeight: 13 },
  avatar: { width: 92, height: 112, borderWidth: 2, borderColor: '#b88949', borderRadius: 4, backgroundColor: '#34261e', alignItems: 'center', justifyContent: 'center' },
  star: { position: 'absolute', top: 3, right: 5, color: colors.gold, fontSize: 15 },
  pinnedRow: { flexDirection: 'row', gap: 6 },
  pinned: { flex: 1, minWidth: 0, padding: 8, borderWidth: 1, borderColor: '#7b5a37', borderRadius: 3, backgroundColor: '#261d18' },
  pinnedLabel: { color: '#bfb3a0', fontFamily: serif, fontSize: 10, lineHeight: 14, minHeight: 28 },
  pinnedValue: { color: colors.gold, fontFamily: serif, fontSize: 18, marginTop: 5 },
  pinnedNote: { color: '#b3a18b', fontSize: 8, marginTop: 5 },
  section: { marginTop: 28, marginBottom: 14, gap: 5 },
  sectionTitle: { color: colors.ink, fontFamily: serif, fontSize: 19, fontWeight: '700', lineHeight: 26 },
  homeSectionTitle: { fontSize: 21 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  classCard: { width: '48%', flexGrow: 1, flexBasis: '46%', padding: 13, backgroundColor: '#302720', borderWidth: 1, borderColor: colors.border, borderRadius: 4 },
  pressed: { opacity: 0.72 },
  emblemOuter: { width: 54, height: 54, borderWidth: 2, borderRadius: 27, padding: 4, backgroundColor: '#201914', marginBottom: 12 },
  emblemInner: { flex: 1, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  classLabel: { fontFamily: serif, fontSize: 10, letterSpacing: 1.8 },
  level: { color: colors.ink, fontFamily: serif, fontSize: 21, fontWeight: '700', marginVertical: 8 },
  meter: { height: 10, borderWidth: 1, borderColor: '#79552e', backgroundColor: '#1a1412', padding: 1 },
  fill: { height: '100%' },
  xp: { color: colors.muted, fontFamily: serif, fontSize: 11, lineHeight: 17, marginTop: 9 },
  classXp: { textAlign: 'center' },
  small: { color: '#b7a58a', fontFamily: serif, fontSize: 10, lineHeight: 16 },
  cardLink: { color: colors.gold, fontFamily: serif, fontSize: 11, marginTop: 12 },
  scope: { marginTop: 14, paddingLeft: 10, borderLeftWidth: 2, borderColor: '#634b33', gap: 4 },
  scopeText: { color: '#c5ad7b', fontSize: 8, letterSpacing: 1, lineHeight: 14 },
  questFrame: { borderColor: colors.border, borderWidth: 1, padding: 3, borderRadius: 3 },
  quest: { borderWidth: 1, borderColor: '#634b33', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15 },
  questEmblem: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#a47a3d', borderRadius: 23, backgroundColor: '#65472a' },
  questCopy: { flex: 1, minWidth: 0 },
  questTitle: { color: colors.ink, fontFamily: serif, fontSize: 26, marginVertical: 3 },
  body: { color: colors.muted, fontFamily: serif, fontSize: 13, lineHeight: 21 },
  arrow: { color: colors.gold, fontSize: 28 },
  recent: { marginTop: 14, backgroundColor: '#302720', borderWidth: 1, borderColor: colors.border, padding: 16, borderRadius: 3 },
  recentHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  strava: { color: '#b8d47e', fontSize: 8, letterSpacing: 1, borderColor: '#6e8749', borderWidth: 1, paddingHorizontal: 7, paddingVertical: 4 },
  activitiesButton: { borderWidth: 1, borderColor: '#d1a34f', alignItems: 'center', justifyContent: 'center', minHeight: 46, marginTop: 16, borderRadius: 3 },
  buttonText: { color: '#2e2116', fontFamily: serif, fontWeight: '700', fontSize: 14 },
  footer: { color: '#a18d72', fontFamily: serif, fontSize: 11, textAlign: 'center', lineHeight: 19, marginTop: 24 },
  notice: { borderColor: '#8f5541', borderWidth: 1, padding: 14, marginBottom: 18, gap: 10 },
  error: { color: '#ffb9a2', fontSize: 12, lineHeight: 20 },
  link: { color: colors.gold, paddingVertical: 8, fontSize: 13 },
  loading: { alignItems: 'center', padding: 32, gap: 16 },
  overlay: { flex: 1, backgroundColor: '#000b', justifyContent: 'center', alignItems: 'center', padding: 24 },
  sheet: { maxWidth: 430, width: '100%', maxHeight: '80%', borderWidth: 2, borderColor: colors.border, backgroundColor: '#302720', padding: 24, borderRadius: 4 },
  close: { backgroundColor: '#d6af62', padding: 15, alignItems: 'center', marginTop: 10 },
});
