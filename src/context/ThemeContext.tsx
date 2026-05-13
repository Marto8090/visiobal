import { createContext, ReactNode, useContext, useState } from 'react';

export type ThemeColors = {
  bg: string;
  bgDeep: string;
  card: string;
  cardAlt: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  border: string;
  borderStrong: string;
  borderAccent: string;
  separator: string;
  gradStart: string;
  gradMid: string;
  gradEnd: string;
  handleBar: string;
  tickInactive: string;
  tickLabel: string;
  statusBarStyle: 'light-content' | 'dark-content';
};

const dark: ThemeColors = {
  bg: '#080F1E',
  bgDeep: '#091121',
  card: '#0F1220',
  cardAlt: '#0D1628',
  text: '#F4F7FF',
  textMuted: '#7A8CAE',
  textSubtle: '#4A5268',
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.11)',
  borderAccent: 'rgba(244,114,182,0.22)',
  separator: 'rgba(255,255,255,0.06)',
  gradStart: '#142240',
  gradMid: '#0F1A30',
  gradEnd: '#091121',
  handleBar: 'rgba(255,255,255,0.18)',
  tickInactive: '#1E2740',
  tickLabel: '#2A3050',
  statusBarStyle: 'light-content',
};

const light: ThemeColors = {
  bg: '#EEF1FD',
  bgDeep: '#E2E8FA',
  card: '#FFFFFF',
  cardAlt: '#F5F8FE',
  text: '#16213E',
  textMuted: '#4A567A',
  textSubtle: '#8A96B5',
  border: 'rgba(80,100,200,0.10)',
  borderStrong: 'rgba(80,100,200,0.18)',
  borderAccent: 'rgba(168,85,247,0.28)',
  separator: 'rgba(80,100,200,0.08)',
  gradStart: '#AABFFF',
  gradMid: '#C2D4FF',
  gradEnd: '#E0E8FF',
  handleBar: 'rgba(80,100,200,0.20)',
  tickInactive: '#BFC9E8',
  tickLabel: '#8A96B5',
  statusBarStyle: 'dark-content',
};

type ThemeContextType = {
  isDark: boolean;
  theme: ThemeColors;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  isDark: true,
  theme: dark,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  return (
    <ThemeContext.Provider value={{ isDark, theme: isDark ? dark : light, toggleTheme: () => setIsDark(v => !v) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
