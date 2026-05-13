import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from '@/src/context/I18nContext';
import { ThemeColors, useTheme } from '@/src/context/ThemeContext';

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.bg },
    header: { alignItems: 'center', flexDirection: 'row', paddingBottom: 14, paddingHorizontal: 8, paddingTop: 8 },
    backButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
    headerTitle: { color: theme.text, flex: 1, fontSize: 18, fontWeight: '800', textAlign: 'center' },
    headerSpacer: { width: 44 },
    content: { paddingBottom: 28, paddingHorizontal: 16 },
    card: { backgroundColor: theme.card, borderColor: theme.borderAccent, borderRadius: 18, borderWidth: 1, padding: 16 },
    updated: { color: '#F472B6', fontSize: 12, fontWeight: '700', marginBottom: 12 },
    intro: { color: theme.text, fontSize: 14, fontWeight: '500', lineHeight: 21, marginBottom: 18 },
    section: { borderTopColor: theme.separator, borderTopWidth: 1, paddingTop: 16, marginTop: 16 },
    sectionTitle: { color: theme.text, fontSize: 15, fontWeight: '800', marginBottom: 8 },
    body: { color: theme.textMuted, fontSize: 13, fontWeight: '500', lineHeight: 20 },
    pressed: { opacity: 0.72 },
  });
}

function TermsSection({ body, styles, title }: { body: string; styles: ReturnType<typeof makeStyles>; title: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

export default function TermsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={theme.statusBarStyle} />
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons color="#F472B6" name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('termsOfService')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.updated}>Last updated: May 11, 2026</Text>
          <Text style={styles.intro}>
            These terms apply to the VisioBall student prototype app. The app is currently made
            for testing and demonstration, not for production use.
          </Text>

          <TermsSection styles={styles}
            title="Prototype use"
            body="VisioBall is provided as a prototype for learning, testing, and project demonstration. Features may change, be incomplete, or behave differently while development continues."
          />
          <TermsSection styles={styles}
            title="Device control"
            body="The app can send commands to a connected BLE ball device. Use it only with hardware you own or are allowed to test, and keep the device in a safe area while testing lights, sounds, or movement-related features."
          />
          <TermsSection styles={styles}
            title="No warranty"
            body="The prototype is provided as is. It may contain bugs, connection issues, or unfinished settings. The project team does not guarantee that every feature will work on every phone or ESP32 build."
          />
          <TermsSection styles={styles}
            title="User responsibility"
            body="You are responsible for how you use the app and connected hardware. Do not use the prototype in situations where a failed connection, wrong command, or unexpected behavior could cause damage or injury."
          />
          <TermsSection styles={styles}
            title="Future updates"
            body="If the app becomes a real product or adds accounts, cloud services, payments, or public distribution, these terms should be reviewed and updated before release."
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
