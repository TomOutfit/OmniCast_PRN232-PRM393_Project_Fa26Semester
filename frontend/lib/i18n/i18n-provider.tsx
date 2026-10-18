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
      const lookup = (d?: Record<string, unknown>): string | undefined => {
        if (!d) return undefined;
        const segments = key.split('.');
        let val: unknown = d;
        for (const seg of segments) {
          if (val == null || typeof val !== 'object') return undefined;
          val = (val as Record<string, unknown>)[seg];
        }
        return typeof val === 'string' ? val : undefined;
      };

      const primary = lookup(DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE]);
      if (primary !== undefined) return primary;

      if (locale !== DEFAULT_LOCALE) {
        const def = lookup(DICTIONARIES[DEFAULT_LOCALE]);
        if (def !== undefined) return def;
      }

      if (locale !== 'en' && DEFAULT_LOCALE !== 'en') {
        const enFallback = lookup(DICTIONARIES['en']);
        if (enFallback !== undefined) return enFallback;
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
