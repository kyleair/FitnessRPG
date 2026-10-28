import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ActivityRow } from '../components/ActivityRow';
import { Emblem } from '../components/Emblem';
import { useDashboard } from '../DashboardContext';
import { type ActivityPage, type ActivityRecord, type Dashboard } from '../dashboard';
import { api, apiUrl, SessionExpiredError } from '../api';

function back() { if (router.canGoBack()) router.back(); else router.replace('/'); }
export default function ActivitiesScreen() {
  const { data, setData } = useDashboard();
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState<ActivityPage | null>(null);
  const [records, setRecords] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPage, setLoadingPage] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [preview, setPreview] = useState<'workout' | 'manual' | null>(null);
  const busy = useRef(false), mounted = useRef(true);
  const list = useRef<FlatList<ActivityRecord>>(null);
  // History can grow while the import queue is running. A previous last page
  // may now have older records after it, without needing to restart the list.
  const nextCursor = page?.nextCursor ?? (page && records.length && (data?.importedCount || 0) > page.total ? String(records[records.length - 1].id) : null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const refresh = useCallback(async () => {
    if (!apiUrl) { setStatus('Sample activities only. Connect Strava from the dashboard to import your history.'); return; }
    if (busy.current) return;
    busy.current = true; setLoading(true); setError('');
    try {
      const next = await api<Dashboard>('/api/dashboard');
      const history = expanded ? await api<ActivityPage>('/api/activities') : null;
      if (!mounted.current) return;
      setData(next);
      if (history) { setPage(history); setRecords(history.items); }
      setStatus(next.stale ? 'Strava could not be checked. Saved activities are shown; the server will retry automatically.' : next.syncRetryAt ? `Sync will resume at ${new Date(next.syncRetryAt).toLocaleTimeString()}.` : next.syncInProgress
        ? 'Your history is syncing. New results appear as they are processed.'
        : 'Saved activities are up to date with the latest check. New activity checks run once per day.');
    } catch (err) {
      if (!mounted.current) return;
      if (err instanceof SessionExpiredError) { setData(null); setRecords([]); setPage(null); }
      setError(err instanceof Error ? err.message : 'Unable to load activities.');
    } finally { busy.current = false; if (mounted.current) setLoading(false); }
  }, [expanded, setData]);
  useEffect(() => {
    if (data || !apiUrl) return;
    const timer = setTimeout(() => { void refresh(); }, 0);
    return () => clearTimeout(timer);
  }, [data, refresh]);

  async function loadHistory(append = false) {
    if (!apiUrl || busy.current || (append && !nextCursor)) return;
    busy.current = true; setLoadingPage(true); setError('');
    try {
      const next = await api<ActivityPage>(`/api/activities${append ? `?cursor=${encodeURIComponent(nextCursor!)}` : ''}`);
      if (!mounted.current) return;
      setPage(next);
      setRecords(current => append ? [...new Map([...current, ...next.items].map(activity => [activity.id, activity])).values()] : next.items);
    } catch (err) {
      if (!mounted.current) return;
      if (err instanceof SessionExpiredError) { setData(null); setRecords([]); setPage(null); }
      setError(err instanceof Error ? err.message : 'Unable to load older activities.');
    } finally { busy.current = false; if (mounted.current) setLoadingPage(false); }
  }
  function toggleHistory() {
    if (expanded) { setExpanded(false); list.current?.scrollToOffset({ offset: 0, animated: true }); }
    else { setExpanded(true); if (apiUrl && !page) void loadHistory(); }
  }
  const items = !data ? [] : expanded && apiUrl && page ? records : expanded && !apiUrl ? data.recentActivities : data.recentActivities.slice(0, 3);
  const total = Math.max(page?.total ?? 0, data?.importedCount ?? 0);
  const waiting = loading || loadingPage;
  return <LinearGradient colors={['#3b2a22', '#211b18', '#191513']} style={styles.screen}>
    <StatusBar style="light" />
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <FlatList ref={list} data={items} keyExtractor={activity => String(activity.id)}
        contentContainerStyle={styles.content} refreshing={loading} onRefresh={refresh}
        initialNumToRender={8} maxToRenderPerBatch={10} windowSize={7}
        onEndReached={() => { if (expanded && nextCursor && !error) void loadHistory(true); }} onEndReachedThreshold={0.3}
        ListHeaderComponent={<>
          <Pressable accessibilityRole="button" onPress={back} style={styles.back}><Text style={styles.backText}>‹  Back to dashboard</Text></Pressable>
          <Text style={styles.eyebrow}>RECENT ACTIVITIES</Text>
          <Text style={styles.title}>Keep your{ '\n' }adventure moving.</Text>
          <Text style={styles.body}>Imported activity records show their source, contribution, and any limits on the current XP rules.</Text>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Start workout, coming soon" onPress={() => setPreview('workout')} style={[styles.action, styles.primaryAction]}>
              <Emblem name="strength" size={26} /><Text style={styles.actionTitle}>Start workout</Text><Text style={styles.actionCopy}>Track exercises, sets, and reps.</Text><Text style={styles.coming}>COMING SOON</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Log activity, coming soon" onPress={() => setPreview('manual')} style={styles.action}>
              <Emblem name="cycling" size={26} /><Text style={styles.actionTitle}>Log activity</Text><Text style={styles.actionCopy}>Enter something you already finished.</Text><Text style={styles.coming}>COMING SOON</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={waiting} accessibilityState={{ disabled: waiting, busy: loading }} onPress={refresh} style={[styles.action, waiting && styles.disabled]}>
              <Text style={styles.syncIcon}>↻</Text><Text style={styles.actionTitle}>{loading ? 'Checking…' : 'Sync Strava'}</Text><Text style={styles.actionCopy}>Check for newly imported activities.</Text>
            </Pressable>
          </View>
          {!!status && <Text accessibilityLiveRegion="polite" style={styles.status}>{status}</Text>}
          {!!error && <View style={styles.notice}><Text accessibilityRole="alert" style={styles.error}>{error}{data ? ' Saved activities are still shown.' : ''}</Text>
            <Pressable accessibilityRole="button" onPress={() => expanded && apiUrl && data ? loadHistory() : refresh()} style={styles.textButton}><Text style={styles.link}>Try again</Text></Pressable></View>}
          {data?.syncInProgress && <Text style={styles.status}>{data.importedCount} activities imported · {data.skillsPending || 0} awaiting skill processing.{data.syncRetryAt ? ` Sync resumes at ${new Date(data.syncRetryAt).toLocaleTimeString()}.` : ' Processing continues while the server runs.'}</Text>}
          <View style={[styles.panel, styles.panelHeader]}>
            <View style={styles.heading}><View style={styles.headingCopy}><Text style={styles.eyebrow}>ACTIVITY HISTORY</Text><Text style={styles.sectionTitle}>{expanded ? 'All activities' : 'Recent activities'}</Text></View><Text style={styles.source}>{data?.source === 'demo' ? 'DEMO' : 'STRAVA'}</Text></View>
            {expanded && <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={toggleHistory} style={styles.textButton}><Text style={styles.link}>Show recent activities</Text></Pressable>}
          </View>
        </>}
        renderItem={({ item }) => <View style={[styles.panel, styles.row]}><ActivityRow activity={item} /></View>}
        ListEmptyComponent={<View style={[styles.panel, styles.row]}>{waiting ? <ActivityIndicator color="#e8c765" style={styles.spinner} /> : <Text style={styles.empty}>{!data ? 'Connect Strava from the dashboard to see your activity history.' : 'No activities imported yet. Your next adventure starts here.'}</Text>}</View>}
        ListFooterComponent={<>
          <View style={[styles.panel, styles.panelFooter]}>
            {loadingPage && !!items.length && <ActivityIndicator color="#e8c765" style={styles.spinner} />}
            {expanded && !!nextCursor && <Pressable accessibilityRole="button" disabled={waiting} onPress={() => loadHistory(true)} style={styles.outlineButton}><Text style={styles.link}>{loadingPage ? 'Loading…' : 'Load older activities'}</Text></Pressable>}
            {!!data && <Text style={styles.count}>Showing {items.length} of {total} {data.source === 'demo' ? 'sample' : 'imported'} activities{data.source !== 'demo' && !data.historyComplete ? ' · History import in progress' : ''}</Text>}
            {!!data && total > 0 && <Pressable accessibilityRole="button" accessibilityState={{ expanded }} disabled={waiting} onPress={toggleHistory} style={styles.outlineButton}><Text style={styles.link}>{expanded ? 'Show recent activities' : 'Show all activities'}</Text></Pressable>}
            <Pressable accessibilityRole="button" onPress={back}><LinearGradient colors={['#e6be68', '#b68b49']} style={styles.backButton}><Text style={styles.buttonText}>Back to dashboard</Text></LinearGradient></Pressable>
          </View>
          <Text style={styles.footer}>{data?.source === 'demo' ? 'Demo data only. Connect Strava from the dashboard to see your own adventures.' : 'Imported from Strava and visible only to the connected athlete. XP rules are experimental; unsupported activities are kept in your history.'}</Text>
        </>} />
    </SafeAreaView>
    <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
      <View style={styles.overlay}><View style={styles.sheet} accessibilityViewIsModal><Text style={styles.eyebrow}>COMING SOON</Text><Text style={styles.sectionTitle}>{preview === 'workout' ? 'Start a workout' : 'Log an activity'}</Text>
        <Text style={styles.body}>{preview === 'workout' ? 'Exercise, set, and rep tracking is planned. For now, record your workout in Strava to include it in your imported history.' : 'Manual activity entry is planned. For now, activities come from your connected Strava account.'}</Text>
        <Pressable accessibilityRole="button" onPress={() => setPreview(null)} style={styles.backButton}><Text style={styles.buttonText}>Back to activities</Text></Pressable>
      </View></View>
    </Modal>
  </LinearGradient>;
}
const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { width: '100%', maxWidth: 470, alignSelf: 'center', padding: 16, paddingBottom: 48 },
  back: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingRight: 16, marginBottom: 22 },
  backText: { color: '#e8c765', fontFamily: serif, fontSize: 14 },
  eyebrow: { color: '#e8c765', fontFamily: serif, fontSize: 10, letterSpacing: 1.6, lineHeight: 16 },
  title: { color: '#f3e3bb', fontFamily: serif, fontSize: 36, lineHeight: 41, fontWeight: '700', marginTop: 8, marginBottom: 16 },
  body: { color: '#c0ae83', fontFamily: serif, fontSize: 13, lineHeight: 21 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 24, marginBottom: 22 },
  action: { flex: 1, minWidth: 0, padding: 10, borderWidth: 1, borderColor: '#876035', borderRadius: 4, backgroundColor: '#302720', gap: 8 },
  primaryAction: { backgroundColor: '#694523', borderColor: '#d99638' },
  actionTitle: { color: '#f3e3bb', fontFamily: serif, fontWeight: '700', fontSize: 14, lineHeight: 19 },
  actionCopy: { color: '#c0ae83', fontFamily: serif, fontSize: 10, lineHeight: 15 },
  coming: { color: '#d6ba7d', fontSize: 8, lineHeight: 12, letterSpacing: 0.5 },
  syncIcon: { color: '#e8c765', fontSize: 27, lineHeight: 26 },
  disabled: { opacity: 0.6 },
  status: { color: '#c0ae83', fontFamily: serif, fontSize: 11, lineHeight: 18, marginBottom: 16 },
  panel: { backgroundColor: '#302720', borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#876035', paddingHorizontal: 16 },
  panelHeader: { borderTopWidth: 1, borderTopLeftRadius: 3, borderTopRightRadius: 3, paddingTop: 16, marginTop: 4 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  headingCopy: { flex: 1, minWidth: 0 },
  sectionTitle: { color: '#f3e3bb', fontFamily: serif, fontSize: 22, fontWeight: '700', lineHeight: 29, marginTop: 4 },
  source: { color: '#b8d47e', fontSize: 8, letterSpacing: 1, borderColor: '#6e8749', borderWidth: 1, paddingHorizontal: 7, paddingVertical: 5 },
  row: { paddingTop: 0 },
  panelFooter: { borderBottomWidth: 1, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, paddingBottom: 16, gap: 12 },
  count: { color: '#ad997d', fontFamily: serif, fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: 14 },
  outlineButton: { minHeight: 44, padding: 10, borderColor: '#876035', borderWidth: 1, borderRadius: 3, justifyContent: 'center', alignItems: 'center' },
  textButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  link: { color: '#e8c765', fontFamily: serif, fontSize: 13, lineHeight: 19 },
  backButton: { minHeight: 46, padding: 12, borderWidth: 1, borderColor: '#d1a34f', backgroundColor: '#d6af62', borderRadius: 3, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#2e2116', fontFamily: serif, fontSize: 14, fontWeight: '700' },
  footer: { color: '#a18d72', fontFamily: serif, fontSize: 11, lineHeight: 19, marginTop: 18 },
  empty: { color: '#c0ae83', fontFamily: serif, fontSize: 13, lineHeight: 21, paddingVertical: 24 },
  spinner: { marginVertical: 20 },
  notice: { padding: 14, borderWidth: 1, borderColor: '#8f5541', marginBottom: 18 },
  error: { color: '#ffb9a2', fontSize: 12, lineHeight: 20 },
  overlay: { flex: 1, backgroundColor: '#000b', justifyContent: 'center', alignItems: 'center', padding: 24 },
  sheet: { maxWidth: 430, width: '100%', borderWidth: 2, borderColor: '#876035', backgroundColor: '#302720', padding: 24, borderRadius: 4, gap: 16 },
});
