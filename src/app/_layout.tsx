import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DashboardProvider } from '../DashboardContext';
export default function RootLayout() {
  return <SafeAreaProvider><DashboardProvider><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#211b18' } }} /></DashboardProvider></SafeAreaProvider>;
}
