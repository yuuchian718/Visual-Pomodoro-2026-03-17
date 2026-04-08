import React from 'react';
import {DEFAULT_LOCALE, LOCALE_STORAGE_KEY, localeOptions, messages, type Locale} from './i18n';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  options: typeof localeOptions;
  messages: typeof messages.en;
}

const LocaleContext = React.createContext<LocaleContextValue | null>(null);

const isLocale = (value: string | null): value is Locale =>
  value === 'en' || value === 'ja' || value === 'zh';

const readInitialLocale = (): Locale => {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE;
  }

  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return isLocale(stored) ? stored : DEFAULT_LOCALE;
};

export const LocaleProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [locale, setLocaleState] = React.useState<Locale>(readInitialLocale);

  const setLocale = React.useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
  }, []);

  const value = React.useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale,
    options: localeOptions,
    messages: messages[locale],
  }), [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => {
  const context = React.useContext(LocaleContext);

  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }

  return context;
};
