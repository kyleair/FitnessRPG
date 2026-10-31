import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { api, apiUrl, SessionExpiredError } from '../api';
import { useDashboard } from '../DashboardContext';
import { type Dashboard, type ClassKey, type Skill } from '../dashboard';
import { Emblem } from '../components/Emblem';
import { SkillIcon, type SkillIconKind } from '../components/SkillIcon';
import { formatSkillResult, skillAttribution } from '../format';
import { formatProgressionValue, progressionTable, type AgeBand, type SkillGender } from '../skill-progression';
import { useProgressionProfile } from '../progression-profile';

const accents = { running: '#78a878', cycling: '#a482d2', strength: '#c85b55' };
const classThemes = {
  running: { accent: '#78a878', border: '#596c50', panel: '#302820', banner: '#244b36' },
  cycling: { accent: '#a482d2', border: '#665481', panel: '#2c2933', banner: '#3d3157' },
  strength: { accent: '#c85b55', border: '#76504f', panel: '#302423', banner: '#5a2d2b' },
} as const;
const subclassSections = {
  running: [['speed', 'Speed', '↯'], ['endurance', 'Endurance', '≈'], ['climbing', 'Climbing', '▲']],
  cycling: [['speed', 'Speed', '↯'], ['endurance', 'Endurance', '≈'], ['climbing', 'Climbing', '▲']],
  strength: [['push', 'Push', '↑'], ['pull', 'Pull', '↓'], ['legs', 'Legs', '◆'], ['volume', 'Volume', '▪']],
} as const;

function back() { if (router.canGoBack()) router.back(); else router.replace('/'); }
function BannerEmblem({ classKey, color }: { classKey: ClassKey; color: string }) {
  if (classKey === 'running') return <Svg width={58} height={64} viewBox="0 0 64 70" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><Path d="M32 3 55 12v19c0 15-9 27-23 36C18 58 9 46 9 31V12L32 3Z" fill="#244b36" /><Path d="M39 19a6 6 0 1 0 0-.1M31 29l11 8-7 10 12 8M35 46 22 60M42 37l13 2M28 33l-12 8" /></Svg>;
  return <View style={[styles.bannerEmblem, { borderColor: color }]}><Emblem name={classKey} size={34} color={color} /></View>;
}
function iconKind(skill: Skill): SkillIconKind { return skill.subclass as SkillIconKind; }
function skillMilestones(skill: Skill, gender: SkillGender, ageBand: AgeBand) {
  if (!skill.best) return null;
  const progression = progressionTable(skill.key.replace(`${skill.key.split('_')[0]}_`, ''), gender, ageBand);
  if (!progression) return null;
  const rawValue = skill.best.value ?? skill.best.timeMs;
  if (rawValue === undefined) return null;
  const value = skill.measurement === 'duration' ? rawValue / 1000 : rawValue;
  const level = progression.direction === 'lower'
    ? progression.levels.reduce((result, row) => value <= row.value ? row.level : result, 1)
    : progression.levels.reduce((result, row) => value >= row.value ? row.level : result, 1);
  const safeLevel = Math.max(1, Math.min(100, level));
  const currentLevel = progression.levels[safeLevel - 1].value;
  const nextLevel = progression.levels[Math.min(99, safeLevel)].value;
  const span = Math.abs(currentLevel - nextLevel);
  const progress = safeLevel === 100 || span === 0 ? 1 : progression.direction === 'lower'
    ? Math.max(0, Math.min(1, (currentLevel - value) / span))
    : Math.max(0, Math.min(1, (value - currentLevel) / span));
  return { level: safeLevel, currentLevel, nextLevel, progress, unit: progression.unit };
}
function SkillActionIcon({ kind, color }: { kind: 'ranks' | 'history'; color: string }) {
  return <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    {kind === 'ranks' ? <><Path d="M4 19V5M4 19h16" /><Path d="M8 16v-4M12 16V8M16 16v-7M20 16v-3" /></> : <><Path d="M12 7v5l3 2" /><Path d="M20 12a8 8 0 1 1-2.34-5.66" /><Path d="M20 4v5h-5" /></>}
  </Svg>;
}
function SkillTile({ skill, classKey, gender, ageBand }: { skill: Skill; classKey: ClassKey; gender: SkillGender; ageBand: AgeBand }) {
  const processing = !!skill.processing;
  const locked = !skill.best && !processing;
  const theme = classThemes[classKey];
  const milestones = skillMilestones(skill, gender, ageBand);
  const push = (mode: 'ranks' | 'history') => router.push({ pathname: `/classes/[classKey]/${mode}`, params: { classKey, skillKey: skill.key } });
  return <View style={[styles.tile, locked && styles.lockedTile]} accessible accessibilityLabel={`${skill.name}. ${locked ? 'Locked. No recorded result yet.' : skill.best ? `Best ${formatSkillResult(skill.best)}. ${skill.best.activityName}.` : 'Activity recorded. Result processing.'}`}>
    <View style={styles.tileHead}><View style={[styles.skillBadge, { borderColor: locked ? '#756954' : theme.accent }]}><SkillIcon kind={iconKind(skill)} size={38} color={locked ? '#a99a7d' : theme.accent} /></View><View style={styles.tileHeading}><Text style={styles.tileTitle}>{skill.name}</Text></View></View>
    <View style={styles.tileDivider} />
    <Text style={[styles.levelText, locked && styles.lockedLevel]}>{locked ? 'LOCKED' : skill.best ? `LEVEL ${milestones?.level ?? 1}` : 'PROCESSING'}</Text>
    <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${(milestones?.progress ?? (processing ? 0.35 : 0)) * 100}%`, backgroundColor: locked ? '#756954' : theme.accent }]} /></View>
    <View style={styles.progressMeta}><Text style={styles.progressValue}>{milestones ? formatProgressionValue(milestones.currentLevel, milestones.unit) : '—'}</Text><Text style={styles.progressValue}>{milestones ? formatProgressionValue(milestones.nextLevel, milestones.unit) : '—'}</Text></View>
    <View style={styles.tileDivider} />
    {skill.best && <><Text style={styles.progressValue}>{formatSkillResult(skill.best)}</Text><Text style={styles.source}>{skillAttribution(skill)}</Text></>}
    {!skill.best && <Text style={styles.source} numberOfLines={3}>{classKey === 'strength' ? `Tracked as ${skill.measurement}.` : processing ? 'Activity recorded. Result is still processing.' : skill.explanation ?? `Complete a ${skill.name} effort to unlock.`}</Text>}
    {!locked && <View style={styles.actions}><Pressable accessibilityRole="button" onPress={() => push('ranks')} style={styles.actionButton}><SkillActionIcon kind="ranks" color={theme.accent} /><Text style={[styles.actionText, { color: theme.accent }]}>Ranks</Text></Pressable><Pressable accessibilityRole="button" onPress={() => push('history')} style={styles.actionButton}><SkillActionIcon kind="history" color={theme.accent} /><Text style={[styles.actionText, { color: theme.accent }]}>History</Text></Pressable></View>}
  </View>;
}

export default function ClassScreen() {
  const { classKey: param } = useLocalSearchParams<{ classKey: string }>();
  const classKey = typeof param === 'string' && Object.hasOwn(accents, param) ? param as ClassKey : null;
  const { data, setData } = useDashboard();
  const { profile } = useProgressionProfile();
  const [loading, setLoading] = useState(false), [error, setError] = useState('');
  const busy = useRef(false);
  const refresh = useCallback(async () => {
    if (!apiUrl || busy.current) return;
    busy.current = true; setLoading(true); setError('');
    try { setData(await api<Dashboard>('/api/dashboard')); } catch (err) { if (err instanceof SessionExpiredError) setData(null); setError(err instanceof Error ? err.message : 'Unable to refresh.'); } finally { busy.current = false; setLoading(false); }
  }, [setData]);
  useEffect(() => { if (data || !classKey) return; const initial = setTimeout(() => { void refresh(); }, 0); return () => clearTimeout(initial); }, [classKey, data, refresh]);
  const fitnessClass = data?.classes.find(item => item.key === classKey);
  const theme = classKey ? classThemes[classKey] : classThemes.running;
  return <LinearGradient colors={['#3b2a22', '#211b18', '#191513']} style={styles.screen}><StatusBar style="light" /><SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#e8c765" />}>
    <Pressable accessibilityRole="button" onPress={back} style={styles.back}><Text style={styles.backText}>‹  Back to dashboard</Text></Pressable>
    {fitnessClass && classKey ? <View style={[styles.classBanner, { borderColor: theme.border, backgroundColor: theme.banner }]}><BannerEmblem classKey={classKey} color={theme.accent} /><View style={styles.bannerCopy}><Text style={styles.eyebrow}>CLASS</Text><Text style={styles.bannerTitle}>{fitnessClass.name}</Text></View><View style={[styles.bestSkill, { borderLeftColor: theme.border }]}><Text style={styles.bestSkillLabel}>LIFETIME {fitnessClass.name.toUpperCase()}{`\n`}SKILL</Text><Text style={[styles.bestSkillName, { color: theme.accent }]}>Level {fitnessClass.level}</Text></View></View> : <Text style={styles.title}>{classKey ? 'Class skills' : 'Class not found'}</Text>}
    {!!error && <View style={styles.notice}><Text style={styles.body} accessibilityRole="alert">{error}{data ? ' Showing saved data.' : ''}</Text><Pressable accessibilityRole="button" style={styles.back} onPress={refresh}><Text style={styles.backText}>Try again</Text></Pressable></View>}
    {!fitnessClass && loading && <ActivityIndicator color="#e8c765" />}{!fitnessClass && !loading && <Text style={styles.body}>{classKey ? 'Return to the dashboard to connect Strava, or pull down to retry.' : 'Choose Running, Cycling, or Strength from the dashboard.'}</Text>}
    {fitnessClass && classKey && <>{subclassSections[classKey].map(([key, label, glyph]) => { const skills = fitnessClass.skills.filter(skill => skill.subclass === key); return <View key={key} style={[styles.subclass, { borderColor: theme.border, backgroundColor: theme.panel }]}><View style={styles.subclassHeader}><View style={[styles.subclassGlyph, { borderColor: theme.accent }]}><Text style={[styles.subclassGlyphText, { color: theme.accent }]}>{glyph}</Text></View><Text style={styles.sectionTitle}>{label}</Text><Text style={styles.subclassCount}>{skills.length ? `${skills.length} SKILL${skills.length === 1 ? '' : 'S'}` : 'COMING SOON'}</Text></View>{skills.length ? <View style={styles.grid}>{skills.map(skill => <SkillTile key={skill.key} skill={skill} classKey={classKey} gender={profile.gender} ageBand={profile.ageBand} />)}</View> : <Text style={styles.body}>No {label.toLowerCase()} skills yet.</Text>}</View>; })}<View style={styles.notice}><Text style={styles.source}>{classKey === 'running' ? `1 km = 1 XP. Reference profile: ${profile.gender}, age ${profile.ageBand}. Times are supplied by Strava best efforts. Locked means no result is recorded yet.` : classKey === 'cycling' ? `3 km = 1 XP. Reference profile: ${profile.gender}, age ${profile.ageBand}. Times use elapsed distance/time samples. Locked means no result is recorded yet.` : 'Strength XP is based on lifting volume. Locked means no result is recorded yet.'}</Text></View></>}
  </ScrollView></SafeAreaView></LinearGradient>;
}

const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { width: '100%', maxWidth: 470, alignSelf: 'center', padding: 16, paddingBottom: 48 }, back: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingRight: 16 }, backText: { color: '#e8c765', fontFamily: serif, fontSize: 14 }, title: { color: '#f3e3bb', fontFamily: serif, fontSize: 30, marginTop: 12, marginBottom: 22 },
  classBanner: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1, marginBottom: 18 }, bannerEmblem: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderRadius: 29, backgroundColor: '#211b18' }, bannerCopy: { flex: 1, minWidth: 0 }, bannerTitle: { color: '#f3e3bb', fontFamily: serif, fontSize: 27, lineHeight: 31 }, bestSkill: { minWidth: 76, paddingLeft: 9, borderLeftWidth: 1, alignItems: 'flex-end' }, bestSkillLabel: { color: '#a9b897', fontSize: 8, lineHeight: 11, letterSpacing: 0.8, textAlign: 'right' }, bestSkillName: { fontFamily: serif, fontSize: 16, marginTop: 3 }, eyebrow: { color: '#c0ae83', fontFamily: serif, fontSize: 10, letterSpacing: 1.3 }, source: { color: '#cbbb99', fontSize: 12, lineHeight: 19, flexShrink: 1 }, body: { color: '#d9c89e', fontSize: 14, lineHeight: 22 },
  subclass: { position: 'relative', marginTop: 18, padding: 12, borderWidth: 1, borderRadius: 2, gap: 11 }, subclassHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 36 }, subclassGlyph: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: '#211b18' }, subclassGlyphText: { fontFamily: serif, fontSize: 18 }, subclassCount: { marginLeft: 'auto', color: '#a9946d', fontFamily: serif, fontSize: 9, textAlign: 'right' }, sectionTitle: { color: '#f3e3bb', fontFamily: serif, fontSize: 21 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'stretch', marginTop: 2 },
  tile: { width: '47%', flexBasis: '47%', flexGrow: 0, minWidth: 0, minHeight: 222, padding: 11, borderWidth: 1, borderColor: '#876035', borderRadius: 4, backgroundColor: '#302720', gap: 7 }, lockedTile: { backgroundColor: '#26231f', borderColor: '#6c604e' }, tileHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, skillBadge: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: '#211b18' }, tileHeading: { flex: 1, minWidth: 0, gap: 5 }, tileTitle: { color: '#f3e3bb', fontFamily: serif, fontSize: 16, lineHeight: 20, flexShrink: 1 }, levelText: { color: '#e8c765', fontFamily: serif, fontSize: 21, lineHeight: 25, letterSpacing: 0.8, textAlign: 'center', marginTop: 1 }, lockedLevel: { color: '#a99a7d', fontSize: 16 }, progressTrack: { height: 7, overflow: 'hidden', backgroundColor: '#171411', borderRadius: 2, marginTop: 0 }, progressFill: { height: '100%' }, progressMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 }, progressValue: { color: '#cbbb99', fontFamily: serif, fontSize: 13 }, tileDivider: { height: 1, backgroundColor: '#514331' }, actions: { flexDirection: 'row', gap: 7, marginTop: 2 }, actionButton: { flex: 1, minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderColor: '#69563a', backgroundColor: '#211b18' }, actionText: { fontFamily: serif, fontSize: 11 }, notice: { marginTop: 24, padding: 14, borderWidth: 1, borderColor: '#876035', backgroundColor: '#28221c', gap: 10 },
});
