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

const DICTIONARIES: Record<Locale, Record<string, unknown>> = {
  vi: vi,
  en: en,
};

type Dictionary = Record<string, unknown>;

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
      // Support dot-notation for nested sections (e.g. 'curator.pageTitle').
      const segments = key.split('.');
      let value: unknown = dict;
      for (const seg of segments) {
        if (value == null || typeof value !== 'object') {
          value = undefined;
          break;
        }
        value = (value as Record<string, unknown>)[seg];
      }
      if (value !== undefined) return value as string;
      // Try DEFAULT_LOCALE as fallback
      const fallbackDict = DICTIONARIES[DEFAULT_LOCALE];
      let fb: unknown = fallbackDict;
      for (const seg of segments) {
        if (fb == null || typeof fb !== 'object') {
          fb = undefined;
          break;
        }
        fb = (fb as Record<string, unknown>)[seg];
      }
      if (fb !== undefined) return fb as string;
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
