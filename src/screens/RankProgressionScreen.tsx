import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { type ClassKey } from '../dashboard';
import { skillRankTiers } from '../skill-progression';

const classThemes = {
  running: { accent: '#78a878', border: '#596c50', banner: '#244b36', name: 'Running' },
  cycling: { accent: '#a482d2', border: '#665481', banner: '#3d3157', name: 'Cycling' },
  strength: { accent: '#c85b55', border: '#76504f', banner: '#5a2d2b', name: 'Strength' },
} as const;

export default function RankProgressionScreen() {
  const { classKey: param } = useLocalSearchParams<{ classKey: string }>();
  const classKey = param === 'running' || param === 'cycling' || param === 'strength' ? param as ClassKey : null;
  const theme = classKey ? classThemes[classKey] : classThemes.running;
  const className = classKey ? theme.name : 'FitnessRPG';

  return <LinearGradient colors={['#3b2a22', '#211b18', '#191513']} style={styles.screen}>
    <StatusBar style="light" />
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹  Back to {className.toLowerCase()}</Text></Pressable>
        <View style={[styles.hero, { borderColor: theme.border, backgroundColor: theme.banner }]}>
          <Text style={styles.eyebrow}>{className.toUpperCase()} · SKILL PROGRESSION</Text>
          <Text style={styles.title}>Rank ladder</Text>
          <Text style={styles.body}>Every skill climbs through nine tiers. Each tier has five divisions, from rank 1 through rank 5.</Text>
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>From Iron to Master</Text>
          <Text style={styles.note}>Your skill card shows the tier and division for its current performance score. Colors match the border around that skill.</Text>
          <View style={styles.ladder}>{skillRankTiers.map((tier, index) => <View key={tier.name} style={[styles.tierRow, tier.ornate && { borderColor: tier.color, shadowColor: tier.color, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 2 }]}>
            <View style={styles.tierLabel}><View style={[styles.tierSwatch, { borderColor: tier.color, backgroundColor: `${tier.color}22` }]} /><Text style={[styles.tierName, { color: tier.color }]}>{tier.name}</Text><Text style={styles.tierNumber}>{String(index + 1).padStart(2, '0')}</Text></View>
            <View style={styles.divisions}>{[1, 2, 3, 4, 5].map(division => <View key={division} style={[styles.division, { borderColor: tier.color, backgroundColor: `${tier.color}14` }]}><Text style={[styles.divisionNumber, { color: tier.color }]}>{division}</Text></View>)}</View>
          </View>)}</View>
        </View>
        <View style={styles.notice}><Text style={styles.note}>A score of 25 maps to Silver 2. Improving your measured performance moves the skill toward higher divisions and eventually the next tier.</Text></View>
      </ScrollView>
    </SafeAreaView>
  </LinearGradient>;
}

const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { width: '100%', maxWidth: 470, alignSelf: 'center', padding: 16, paddingBottom: 48 }, back: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingRight: 16 }, backText: { color: '#e8c765', fontFamily: serif, fontSize: 14 }, hero: { padding: 16, borderWidth: 1, marginBottom: 16, gap: 8 }, eyebrow: { color: '#c0ae83', fontFamily: serif, fontSize: 10, letterSpacing: 1.1 }, title: { color: '#f3e3bb', fontFamily: serif, fontSize: 30 }, body: { color: '#d9c89e', fontSize: 14, lineHeight: 21 }, panel: { padding: 14, borderWidth: 1, borderColor: '#876035', backgroundColor: '#302720', gap: 10 }, panelTitle: { color: '#f3e3bb', fontFamily: serif, fontSize: 21 }, note: { color: '#a9946d', fontSize: 12, lineHeight: 18 }, ladder: { gap: 8, marginTop: 4 }, tierRow: { padding: 9, borderWidth: 1, borderColor: '#514331', backgroundColor: '#211b18', gap: 8 }, tierLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 }, tierSwatch: { width: 14, height: 14, borderWidth: 1 }, tierName: { flex: 1, fontFamily: serif, fontSize: 17 }, tierNumber: { color: '#6f604b', fontFamily: serif, fontSize: 10 }, divisions: { flexDirection: 'row', gap: 6 }, division: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 1 }, divisionNumber: { fontFamily: serif, fontSize: 16 }, notice: { marginTop: 16, padding: 14, borderWidth: 1, borderColor: '#876035', backgroundColor: '#28221c' },
});
