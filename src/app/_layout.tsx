import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DashboardProvider, useDashboard } from '../DashboardContext';
import { SkillLevelUpModal } from '../components/SkillLevelUpModal';
function LevelUpNotice() { const { levelUps, dismissLevelUps } = useDashboard(); return <SkillLevelUpModal items={levelUps} onDismiss={dismissLevelUps} />; }
export default function RootLayout() {
  return <SafeAreaProvider><DashboardProvider><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#211b18' } }} /><LevelUpNotice /></DashboardProvider></SafeAreaProvider>;
}
