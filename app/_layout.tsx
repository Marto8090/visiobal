import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { I18nProvider } from '@/src/context/I18nContext';
import { ThemeProvider } from '@/src/context/ThemeContext';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <SafeAreaProvider>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="scan" options={{ headerShown: false }} />
            <Stack.Screen name="control" options={{ headerShown: false }} />
            <Stack.Screen name="landing" options={{ headerShown: false }} />
            <Stack.Screen name="radar" options={{ headerShown: false }} />
            <Stack.Screen name="sound" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            <Stack.Screen name="privacy" options={{ headerShown: false }} />
            <Stack.Screen name="terms" options={{ headerShown: false }} />
            <Stack.Screen name="firmware-history" options={{ headerShown: false }} />
          </Stack>
        </SafeAreaProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
