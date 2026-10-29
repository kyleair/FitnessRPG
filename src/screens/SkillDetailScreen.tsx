import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { api, apiUrl } from '../api';
import { useDashboard } from '../DashboardContext';
import { type ClassKey, type Dashboard, type Skill } from '../dashboard';
import { SkillIcon, type SkillIconKind } from '../components/SkillIcon';
import { formatTime } from '../format';

const themes = {
  running: { accent: '#78a878', border: '#596c50', panel: '#302820', banner: '#244b36' },
  cycling: { accent: '#a482d2', border: '#665481', panel: '#2c2933', banner: '#3d3157' },
  strength: { accent: '#c85b55', border: '#76504f', panel: '#302423', banner: '#5a2d2b' },
} as const;

function iconKind(skill: Skill): SkillIconKind {
  return (skill.subclass === 'speed' || skill.subclass === 'endurance' || skill.subclass === 'climbing' || skill.subclass === 'push' || skill.subclass === 'pull' || skill.subclass === 'legs' || skill.subclass === 'volume') ? skill.subclass : 'volume';
}

function findSkill(data: Dashboard | null, classKey: ClassKey | null, skillKey: string | null) {
  return data?.classes.find(item => item.key === classKey)?.skills.find(item => item.key === skillKey);
}

export default function SkillDetailScreen({ mode }: { mode: 'ranks' | 'history' }) {
  const params = useLocalSearchParams<{ classKey: string; skillKey: string }>();
  const classKey = params.classKey === 'running' || params.classKey === 'cycling' || params.classKey === 'strength' ? params.classKey : null;
  const skillKey = typeof params.skillKey === 'string' ? params.skillKey : null;
  const { data, setData } = useDashboard();
  const [loading, setLoading] = useState(false);
  const skill = findSkill(data, classKey, skillKey);
  const theme = classKey ? themes[classKey] : themes.running;

  useEffect(() => {
    if (data || !apiUrl || !classKey) return;
    let cancelled = false;
    const initial = setTimeout(() => {
      setLoading(true);
      void api<Dashboard>('/api/dashboard').then(next => { if (!cancelled) setData(next); }).finally(() => { if (!cancelled) setLoading(false); });
    }, 0);
    return () => { cancelled = true; clearTimeout(initial); };
  }, [classKey, data, setData]);

  const title = skill?.name ?? 'Skill';
  const value = skill?.best ? formatTime(skill.best.timeMs) : '—';
  const subclass = skill?.subclass.toUpperCase() ?? 'SKILL';
  const history = useMemo(() => skill?.best ? [{ label: new Date(skill.best.achievedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }), value, source: skill.best.activityName }] : [], [skill, value]);

  return <LinearGradient colors={['#3b2a22', '#211b18', '#191513']} style={styles.screen}>
    <StatusBar style="light" />
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹  Back to skill</Text></Pressable>
        {loading && !skill ? <ActivityIndicator color="#e8c765" /> : <>
          <View style={[styles.hero, { borderColor: theme.border, backgroundColor: theme.banner }]}>
            <View style={[styles.iconFrame, { borderColor: theme.accent }]}><SkillIcon kind={skill ? iconKind(skill) : 'volume'} color={theme.accent} size={46} /></View>
            <View style={styles.heroCopy}><Text style={styles.eyebrow}>{classKey?.toUpperCase() ?? 'FITNESS'} · {subclass}</Text><Text style={styles.title}>{title}</Text><Text style={styles.meta}>{mode === 'ranks' ? 'Ranks and milestones' : 'Recorded attempts'}</Text></View>
          </View>
          {mode === 'ranks' ? <>
            <View style={styles.panel}><Text style={styles.panelTitle}>Your best</Text><Text style={[styles.best, { color: theme.accent }]}>{value}</Text><Text style={styles.body}>{skill?.best ? `${skill.best.activityName} · ${skill.best.source}` : skill?.processing ? 'Result is still processing.' : 'No recorded result yet.'}</Text></View>
            <View style={styles.panel}><Text style={styles.panelTitle}>Milestones</Text><RankRow label="Unlocked" value={skill?.best ? 'Complete' : 'Locked'} accent={theme.accent} /><RankRow label="Next personal best" value={skill?.best ? 'Improve your time' : 'Record an effort'} accent={theme.accent} /><Text style={styles.note}>Rank tiers are a visual preview while the progression rules are being finalized.</Text></View>
          </> : <View style={styles.panel}><Text style={styles.panelTitle}>History</Text>{history.length ? history.map(item => <View key={item.label} style={styles.historyRow}><View><Text style={styles.historyDate}>{item.label}</Text><Text style={styles.body}>{item.source}</Text></View><Text style={[styles.historyValue, { color: theme.accent }]}>{item.value}</Text></View>) : <Text style={styles.body}>{skill?.processing ? 'Activity recorded. The result is still processing.' : 'No attempts recorded for this skill yet.'}</Text>}</View>}
        </>}
      </ScrollView>
    </SafeAreaView>
  </LinearGradient>;
}

function RankRow({ label, value, accent }: { label: string; value: string; accent: string }) {
  return <View style={styles.rankRow}><Text style={styles.body}>{label}</Text><Text style={[styles.rankValue, { color: accent }]}>{value}</Text></View>;
}

const serif = 'Georgia';
const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { width: '100%', maxWidth: 470, alignSelf: 'center', padding: 16, paddingBottom: 48 },
  back: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingRight: 16 }, backText: { color: '#e8c765', fontFamily: serif, fontSize: 14 },
  hero: { minHeight: 104, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderWidth: 1, marginBottom: 18 }, iconFrame: { width: 68, height: 68, alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: '#211b18' }, heroCopy: { flex: 1 }, eyebrow: { color: '#c0ae83', fontFamily: serif, fontSize: 10, letterSpacing: 1 }, title: { color: '#f3e3bb', fontFamily: serif, fontSize: 28, marginTop: 4 }, meta: { color: '#cbbb99', fontSize: 12, marginTop: 4 },
  panel: { padding: 16, borderWidth: 1, borderColor: '#876035', backgroundColor: '#302720', marginBottom: 14, gap: 10 }, panelTitle: { color: '#f3e3bb', fontFamily: serif, fontSize: 20 }, best: { fontFamily: serif, fontSize: 34 }, body: { color: '#d9c89e', fontSize: 14, lineHeight: 21 }, rankRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#514331' }, rankValue: { fontFamily: serif, fontSize: 16 }, note: { color: '#a9946d', fontSize: 12, lineHeight: 18, marginTop: 6 }, historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#514331' }, historyDate: { color: '#f3e3bb', fontFamily: serif, fontSize: 16 }, historyValue: { fontFamily: serif, fontSize: 22 },
});
