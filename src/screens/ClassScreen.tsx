import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { api, apiUrl, SessionExpiredError } from '../api';
import { useDashboard } from '../DashboardContext';
import { type Dashboard, type ClassKey, type Skill } from '../dashboard';
import { Emblem } from '../components/Emblem';
import { formatTime } from '../format';

const accents = { running: '#d99638', cycling: '#63a9c6', strength: '#d56d55' };
const number = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 1 });
function back() { if (router.canGoBack()) router.back(); else router.replace('/'); }
function SkillTile({ skill, classKey }: { skill: Skill; classKey: ClassKey }) {
  const locked = !skill.best;
  const title = classKey === 'strength' ? skill.name : `Fastest ${skill.name}`;
  return <View style={[styles.tile, locked && styles.lockedTile]} accessible accessibilityLabel={`${title}. ${locked ? 'Locked. No recorded result yet.' : `Best time ${formatTime(skill.best!.timeMs)}. ${skill.best!.activityName}. ${new Date(skill.best!.achievedAt).toLocaleDateString()}. Strava.`}`}>
    <View style={styles.tileHead}>
      <View style={[styles.emblem, { borderColor: locked ? '#9b8b72' : accents[classKey] }]}><Emblem name={classKey} size={28} color={locked ? '#b9aa90' : accents[classKey]} /></View>
      <View style={styles.tileHeading}><Text style={styles.eyebrow}>{classKey === 'strength' ? 'POWER' : 'DISTANCE'}</Text><Text style={styles.tileTitle}>{title}</Text></View>
    </View>
    <Text style={[styles.value, locked && styles.lockedValue]}>{locked ? 'Locked' : formatTime(skill.best!.timeMs)}</Text>
    {skill.best ? <>
      <Text style={styles.caption}>BEST ELAPSED TIME</Text>
      <Text style={styles.source}>{skill.best.activityName}</Text>
      <Text style={styles.source}>{new Date(skill.best.achievedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · Strava</Text>
    </> : <Text style={styles.source}>{classKey === 'strength' ? 'Record a one-rep max to unlock. Strength entry is coming later.' : `Complete a ${skill.name} effort to unlock once its activity data is processed.`}</Text>}
  </View>;
}

export default function ClassScreen() {
  const { classKey: param } = useLocalSearchParams<{ classKey: string }>();
  const classKey = typeof param === 'string' && Object.hasOwn(accents, param) ? param as ClassKey : null;
  const { data, setData } = useDashboard();
  const [loading, setLoading] = useState(false), [error, setError] = useState('');
  const busy = useRef(false);
  const refresh = useCallback(async () => {
    if (!apiUrl || busy.current) return;
    busy.current = true; setLoading(true); setError('');
    try { setData(await api<Dashboard>('/api/dashboard')); }
    catch (err) {
      if (err instanceof SessionExpiredError) setData(null);
      setError(err instanceof Error ? err.message : 'Unable to refresh.');
    } finally { busy.current = false; setLoading(false); }
  }, [setData]);
  useEffect(() => {
    if (data || !classKey) return;
    const initial = setTimeout(() => { void refresh(); }, 0);
    return () => clearTimeout(initial);
  }, [classKey, data, refresh]); // Load direct links as well as dashboard navigation.
  const fitnessClass = data?.classes.find(item => item.key === classKey);
  const unlocked = fitnessClass?.skills.filter(skill => skill.best) || [];
  const locked = fitnessClass?.skills.filter(skill => !skill.best) || [];
  return <LinearGradient colors={['#3b2a22', '#211b18', '#191513']} style={styles.screen}>
    <StatusBar style="light" />
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#e8c765" />}>
        <Pressable accessibilityRole="button" onPress={back} style={styles.back}><Text style={styles.backText}>‹  Back to dashboard</Text></Pressable>
        <Text style={styles.title}>{fitnessClass ? `${fitnessClass.name} Class` : classKey ? 'Class skills' : 'Class not found'}</Text>
        {!!error && <View style={styles.notice}><Text style={styles.body} accessibilityRole="alert">{error}{data ? ' Showing saved data.' : ''}</Text><Pressable accessibilityRole="button" style={styles.back} onPress={refresh}><Text style={styles.backText}>Try again</Text></Pressable></View>}
        {!fitnessClass && loading && <ActivityIndicator color="#e8c765" />}
        {!fitnessClass && !loading && <Text style={styles.body}>{classKey ? 'Return to the dashboard to connect Strava, or pull down to retry.' : 'Choose Running, Cycling, or Strength from the dashboard.'}</Text>}
        {fitnessClass && classKey && <>
          <View style={styles.summaryRow}>
            <View style={styles.summary}><Text style={styles.eyebrow}>CUMULATIVE LEVEL</Text><Text style={styles.summaryValue}>Level {fitnessClass.level}</Text><Text style={styles.source}>{number(fitnessClass.xp)} total XP</Text><View style={styles.meter}><View style={[styles.fill, { width: `${fitnessClass.progress * 100}%`, backgroundColor: accents[classKey] }]} /></View><Text style={styles.source}>{number(fitnessClass.currentXp)} / {fitnessClass.nextLevelXp} XP</Text></View>
            <View style={styles.summary}><Text style={styles.eyebrow}>RECORDED SKILLS</Text><Text style={styles.summaryValue}>{unlocked.length} / {fitnessClass.skills.length}</Text><Text style={styles.source}>Personal bests</Text><Text style={styles.source}>Independent of class XP</Text></View>
          </View>
          <View style={styles.section}><Text style={styles.eyebrow}>UNLOCKED SKILLS</Text><Text style={styles.sectionTitle}>Your personal bests</Text></View>
          {unlocked.length ? <View style={styles.grid}>{unlocked.map(skill => <SkillTile key={skill.key} skill={skill} classKey={classKey} />)}</View> : <Text style={styles.body}>No recorded skills yet. Your first tracked result will appear here.</Text>}
          <View style={styles.section}><Text style={styles.eyebrow}>LOCKED SKILLS</Text><Text style={styles.sectionTitle}>Milestones still ahead</Text></View>
          {locked.length ? <View style={styles.grid}>{locked.map(skill => <SkillTile key={skill.key} skill={skill} classKey={classKey} />)}</View> : <Text style={styles.body}>All skills have a recorded result.</Text>}
          <View style={styles.notice}>
            {data?.source === 'demo' && <Text style={styles.eyebrow}>SAMPLE DATA</Text>}
            <Text style={styles.source}>{fitnessClass.formula}. Class XP grows independently of personal bests.</Text>
            {classKey !== 'strength' && <Text style={styles.source}>{classKey === 'running' ? 'Times are supplied by Strava best efforts, using elapsed time. No result is calculated when Strava omits an effort.' : 'Times use elapsed distance/time samples, including stops, and may differ from Strava best efforts.'} Locked means no result is recorded yet; an activity may still be waiting for processing.</Text>}
            {!!data?.skillsPending && classKey !== 'strength' && <Text style={styles.source}>{data.skillsPending} activities awaiting processing. Pull to sync after a minute to continue.</Text>}
            {!!data?.skillsUnavailable && classKey !== 'strength' && <Text style={styles.source}>{data.skillsUnavailable} activities have unavailable or invalid skill data.</Text>}
            {(data?.skillsStale || data?.stale) && <Text style={styles.body}>Some data could not be refreshed. Saved results are shown.</Text>}
            <Text style={styles.source}>{data?.historyComplete ? 'All accessible history imported.' : 'Totals and bests cover imported history so far.'}</Text>
          </View>
        </>}
      </ScrollView>
    </SafeAreaView>
  </LinearGradient>;
}
const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { width: '100%', maxWidth: 470, alignSelf: 'center', padding: 16, paddingBottom: 48 },
  back: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingRight: 16 },
  backText: { color: '#e8c765', fontFamily: serif, fontSize: 14 },
  title: { color: '#f3e3bb', fontFamily: serif, fontSize: 30, marginTop: 12, marginBottom: 22 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summary: { flex: 1, minWidth: 0, borderWidth: 1, borderColor: '#876035', borderRadius: 4, padding: 14, backgroundColor: '#302720', gap: 8 },
  eyebrow: { color: '#c0ae83', fontFamily: serif, fontSize: 10, letterSpacing: 1.3 },
  summaryValue: { color: '#e8c765', fontFamily: serif, fontSize: 25 },
  source: { color: '#cbbb99', fontSize: 12, lineHeight: 19, flexShrink: 1 },
  body: { color: '#d9c89e', fontSize: 14, lineHeight: 22 },
  meter: { height: 7, overflow: 'hidden', backgroundColor: '#171411', borderRadius: 2 },
  fill: { height: '100%' },
  section: { marginTop: 28, marginBottom: 14, gap: 6 },
  sectionTitle: { color: '#f3e3bb', fontFamily: serif, fontSize: 21 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'stretch' },
  tile: { width: '47%', flexBasis: '47%', flexGrow: 0, minWidth: 0, padding: 12, borderWidth: 3, borderStyle: 'solid', borderColor: '#876035', borderRadius: 4, backgroundColor: '#302720', gap: 8 },
  lockedTile: { backgroundColor: '#26231f', borderColor: '#6c604e' },
  tileHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  emblem: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 19, backgroundColor: '#211b18' },
  tileHeading: { flex: 1, minWidth: 0, gap: 5 },
  tileTitle: { color: '#f3e3bb', fontFamily: serif, fontSize: 15, lineHeight: 21, flexShrink: 1 },
  value: { color: '#e8c765', fontFamily: serif, fontSize: 26, marginTop: 4 },
  lockedValue: { color: '#c0ae83', fontSize: 19 },
  caption: { color: '#c0ae83', fontSize: 9, letterSpacing: 0.8 },
  notice: { marginTop: 24, padding: 14, borderWidth: 1, borderColor: '#876035', backgroundColor: '#28221c', gap: 10 },
});
