import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { Locale, LOCALES, translations } from '../i18n/translations';
import { STORAGE_KEYS } from '../utils/storage';

type I18nContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.LOCALE).then(saved => {
      if (saved && LOCALES.some(l => l.code === saved)) {
        setLocaleState(saved as Locale);
      }
    });
  }, []);

  const setLocale = (next: Locale) => {
    void AsyncStorage.setItem(STORAGE_KEYS.LOCALE, next);
    setLocaleState(next);
  };

  const t = (key: string): string =>
    translations[locale]?.[key] ?? translations.en[key] ?? key;

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
