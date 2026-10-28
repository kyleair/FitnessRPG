import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export function ActivityForm({ eyebrow, title, children, saving = false }: { eyebrow: string; title: string; children: ReactNode; saving?: boolean }) {
  return <LinearGradient colors={['#3b2a22', '#211b18', '#191513']} style={formStyles.screen}>
    <StatusBar style="light" /><SafeAreaView style={formStyles.screen} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={formStyles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={formStyles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <Pressable accessibilityRole="button" disabled={saving} onPress={() => router.dismissTo('/activities')} style={formStyles.textButton}><Text style={formStyles.link}>‹  Back to activities</Text></Pressable>
          <Text style={formStyles.eyebrow}>{eyebrow}</Text><Text style={formStyles.title}>{title}</Text>{children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </LinearGradient>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={formStyles.field}><Text style={formStyles.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor="#927f68" selectionColor="#e8c765" {...props} style={[formStyles.input, props.style]} /></View>;
}
export function FormButton({ title, onPress, disabled, secondary = false }: { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} style={[formStyles.button, secondary && formStyles.secondary, disabled && { opacity: 0.55 }]}><Text style={secondary ? formStyles.link : formStyles.buttonText}>{title}</Text></Pressable>;
}
export function Choices<T extends string>({ label, value, options, onChange, disabled }: { label: string; value: T; options: readonly T[]; onChange: (value: T) => void; disabled?: boolean }) {
  return <View style={formStyles.field}><Text style={formStyles.label}>{label}</Text><View style={formStyles.choices}>{options.map(option => <Pressable key={option} accessibilityRole="radio" accessibilityState={{ checked: value === option, disabled: !!disabled }} disabled={disabled} onPress={() => onChange(option)} style={[formStyles.choice, value === option && formStyles.selected]}><Text style={value === option ? formStyles.selectedText : formStyles.link}>{option}</Text></Pressable>)}</View></View>;
}
const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
export const formStyles = StyleSheet.create({
  screen: { flex: 1 },
  content: { width: '100%', maxWidth: 470, alignSelf: 'center', padding: 16, paddingBottom: 48, gap: 16 },
  title: { color: '#f3e3bb', fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }), fontSize: 34, fontWeight: '700', lineHeight: 40 },
  eyebrow: { color: '#e8c765', fontSize: 10, letterSpacing: 1.5, marginTop: 8 },
  body: { color: '#c0ae83', fontFamily: serif, fontSize: 13, lineHeight: 21 },
  panel: { padding: 16, borderWidth: 1, borderColor: '#876035', borderRadius: 4, backgroundColor: '#302720', gap: 16 },
  field: { gap: 8, flexShrink: 1 },
  label: { color: '#c0ae83', fontFamily: serif, fontSize: 11, lineHeight: 16 },
  input: { color: '#f3e3bb', fontFamily: serif, backgroundColor: '#1e1814', borderWidth: 1, borderColor: '#876035', borderRadius: 3, minHeight: 46, padding: 12, fontSize: 15 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minHeight: 44, paddingHorizontal: 13, paddingVertical: 10, borderWidth: 1, borderColor: '#876035', borderRadius: 20, justifyContent: 'center' },
  selected: { backgroundColor: '#d6af62' },
  selectedText: { color: '#2e2116', fontFamily: serif, fontSize: 13 },
  button: { minHeight: 46, padding: 13, borderRadius: 3, borderWidth: 1, borderColor: '#d1a34f', backgroundColor: '#d6af62', alignItems: 'center', justifyContent: 'center' },
  secondary: { backgroundColor: '#302720', borderColor: '#876035' },
  buttonText: { color: '#2e2116', fontFamily: serif, fontWeight: '700', fontSize: 15 },
  link: { color: '#e8c765', fontFamily: serif, fontSize: 13, lineHeight: 20 },
  textButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  error: { color: '#ffb9a2', fontSize: 13, lineHeight: 21 },
  heading: { color: '#f3e3bb', fontFamily: serif, fontSize: 19, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
});
