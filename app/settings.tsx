import { Ionicons } from '@expo/vector-icons';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from '@/src/context/I18nContext';
import { ThemeColors, useTheme } from '@/src/context/ThemeContext';
import { LOCALES, Locale } from '@/src/i18n/translations';

const DEFAULT_SETTINGS = {
  batteryWarnings: true,
  connectionAlerts: false,
  pushNotifications: true,
};

function makeStyles(theme: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.bg,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
    },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      paddingBottom: 14,
      paddingHorizontal: 8,
      paddingTop: 8,
    },
    backButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
    headerTitle: { color: theme.text, flex: 1, fontSize: 18, fontWeight: '800', textAlign: 'center' },
    headerSpacer: { width: 44 },
    content: { paddingBottom: 32, paddingHorizontal: 16 },
    section: { marginBottom: 22 },
    sectionTitle: {
      color: theme.textSubtle,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
      marginBottom: 8,
      marginHorizontal: 4,
    },
    card: {
      backgroundColor: theme.card,
      borderColor: theme.borderAccent,
      borderRadius: 18,
      borderWidth: 1,
      overflow: 'hidden',
    },
    row: {
      alignItems: 'center',
      flexDirection: 'row',
      minHeight: 56,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    dangerRow: { backgroundColor: 'rgba(244,114,182,0.08)' },
    rowText: { flex: 1, paddingRight: 12 },
    rowLabel: { color: theme.text, fontSize: 15, fontWeight: '600' },
    rowSubtitle: { color: theme.textMuted, fontSize: 12, fontWeight: '500', marginTop: 3 },
    separator: { backgroundColor: theme.separator, height: 1, marginLeft: 16 },
    dangerText: { color: '#F472B6' },
    langRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    langPill: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.bgDeep,
    },
    langPillActive: {
      borderColor: '#A855F7',
      backgroundColor: 'rgba(168,85,247,0.14)',
    },
    langPillText: { color: theme.textMuted, fontSize: 13, fontWeight: '700' },
    langPillTextActive: { color: '#A855F7' },
    pressed: { opacity: 0.72 },
  });
}

type SectionProps = { children: ReactNode; title: string; styles: ReturnType<typeof makeStyles> };
function Section({ children, styles, title }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Separator({ styles }: { styles: ReturnType<typeof makeStyles> }) {
  return <View style={styles.separator} />;
}

type ToggleRowProps = {
  label: string;
  onValueChange: (value: boolean) => void;
  styles: ReturnType<typeof makeStyles>;
  subtitle: string;
  value: boolean;
};
function ToggleRow({ label, onValueChange, styles, subtitle, value }: ToggleRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        ios_backgroundColor="rgba(128,128,128,0.2)"
        onValueChange={onValueChange}
        thumbColor="#FFFFFF"
        trackColor={{ false: 'rgba(128,128,128,0.2)', true: '#A855F7' }}
        value={value}
      />
    </View>
  );
}

type MenuRowProps = {
  danger?: boolean;
  hideChevron?: boolean;
  label: string;
  onPress?: () => void;
  styles: ReturnType<typeof makeStyles>;
  subtitle?: string;
};
function MenuRow({ danger = false, hideChevron = false, label, onPress, styles, subtitle }: MenuRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, danger && styles.dangerRow, pressed && styles.pressed]}
    >
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && styles.dangerText]}>{label}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {!hideChevron && <Ionicons color="#7A8CAE" name="chevron-forward" size={18} />}
    </Pressable>
  );
}

type StaticRowProps = { label: string; styles: ReturnType<typeof makeStyles>; subtitle?: string };
function StaticRow({ label, styles, subtitle }: StaticRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { isDark, theme, toggleTheme } = useTheme();
  const { locale, setLocale, t } = useI18n();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const appVersion = '1.4.0';

  const [pushNotifications, setPushNotifications] = useState(DEFAULT_SETTINGS.pushNotifications);
  const [connectionAlerts, setConnectionAlerts] = useState(DEFAULT_SETTINGS.connectionAlerts);
  const [batteryWarnings, setBatteryWarnings] = useState(DEFAULT_SETTINGS.batteryWarnings);

  const resetToDefaults = () => {
    setPushNotifications(DEFAULT_SETTINGS.pushNotifications);
    setConnectionAlerts(DEFAULT_SETTINGS.connectionAlerts);
    setBatteryWarnings(DEFAULT_SETTINGS.batteryWarnings);
    Alert.alert(t('factoryResetDoneTitle'), t('factoryResetDoneMessage'));
  };

  const confirmFactoryReset = () => {
    Alert.alert(
      t('factoryResetTitle'),
      t('factoryResetMessage'),
      [
        { style: 'cancel', text: t('cancel') },
        { onPress: resetToDefaults, style: 'destructive', text: t('reset') },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={theme.statusBarStyle} />

      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons color="#A855F7" name="chevron-back" size={26} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('appSettings')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <Section styles={styles} title={t('appearance')}>
          <ToggleRow
            label={t('darkMode')}
            onValueChange={toggleTheme}
            styles={styles}
            subtitle={t('darkModeDesc')}
            value={isDark}
          />
        </Section>

        <Section styles={styles} title={t('language')}>
          <View style={styles.langRow}>
            {LOCALES.map((loc) => (
              <Pressable
                key={loc.code}
                onPress={() => setLocale(loc.code as Locale)}
                style={({ pressed }) => [
                  styles.langPill,
                  locale === loc.code && styles.langPillActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={{ fontSize: 16 }}>{loc.flag}</Text>
                <Text style={[styles.langPillText, locale === loc.code && styles.langPillTextActive]}>
                  {loc.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Section>

        <Section styles={styles} title={t('notifications')}>
          <ToggleRow
            label={t('pushNotifications')}
            onValueChange={setPushNotifications}
            styles={styles}
            subtitle={t('pushNotificationsDesc')}
            value={pushNotifications}
          />
          <Separator styles={styles} />
          <ToggleRow
            label={t('connectionAlerts')}
            onValueChange={setConnectionAlerts}
            styles={styles}
            subtitle={t('connectionAlertsDesc')}
            value={connectionAlerts}
          />
          <Separator styles={styles} />
          <ToggleRow
            label={t('batteryWarnings')}
            onValueChange={setBatteryWarnings}
            styles={styles}
            subtitle={t('batteryWarningsDesc')}
            value={batteryWarnings}
          />
        </Section>

        <Section styles={styles} title={t('device')}>
          <StaticRow label={t('deviceName')} styles={styles} subtitle="VisioBall · Device A4" />
          <Separator styles={styles} />
          <MenuRow
            label={t('firmware')}
            onPress={() => router.push('/firmware-history' as Href)}
            styles={styles}
            subtitle={t('firmwareUpToDate')}
          />
          <Separator styles={styles} />
          <MenuRow
            danger
            label={t('factoryReset')}
            onPress={confirmFactoryReset}
            styles={styles}
            subtitle={t('factoryResetDesc')}
          />
        </Section>

        <Section styles={styles} title={t('about')}>
          <MenuRow label={t('privacyPolicy')} onPress={() => router.push('/privacy' as Href)} styles={styles} />
          <Separator styles={styles} />
          <MenuRow label={t('termsOfService')} onPress={() => router.push('/terms' as Href)} styles={styles} />
          <Separator styles={styles} />
          <MenuRow hideChevron label={t('appVersion')} styles={styles} subtitle={appVersion} />
        </Section>

      </ScrollView>
    </SafeAreaView>
  );
}
