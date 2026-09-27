'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import vi from './vi.json';
import en from './en.json';
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  type Locale,
} from './config';

const DICTIONARIES: Record<Locale, Record<string, string>> = {
  vi: vi as Record<string, string>,
  en: en as Record<string, string>,
};

type Dictionary = Record<string, string>;

interface I18nContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: string, fallback?: string) => string;
  dictionary: Dictionary;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function readInitialLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
    if (stored && (SUPPORTED_LOCALES as readonly string[]).includes(stored)) {
      return stored;
    }
  } catch {
    /* ignore storage failures */
  }
  return DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLocaleState(readInitialLocale());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      document.documentElement.lang = locale;
    } catch {
      /* ignore */
    }
  }, [locale, hydrated]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
  }, []);

  const t = useCallback(
    (key: string, fallback?: string) => {
      const dict = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
      const value = dict[key];
      if (value !== undefined) return value;
      // Try fallback locale
      const fallbackDict = DICTIONARIES[DEFAULT_LOCALE];
      if (fallbackDict && fallbackDict[key] !== undefined) {
        return fallbackDict[key];
      }
      return fallback ?? key;
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      dictionary: DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE],
    }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}

export function useT(): (key: string, fallback?: string) => string {
  return useI18n().t;
}
