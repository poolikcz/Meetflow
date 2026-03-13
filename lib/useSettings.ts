import { useEffect, useState } from 'react';

export type DateFormat = 'eu' | 'us';
export type TimeFormat = '24h' | '12h';
export type Language = 'cs' | 'en' | 'de' | 'es';

export interface AppSettings {
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  language: Language;
  showWeekends: boolean;
}

const COOKIE_KEY = 'hubcal_settings';
const COOKIE_DAYS = 365;

const DEFAULTS: AppSettings = {
  dateFormat: 'eu',
  timeFormat: '24h',
  language: 'cs',
  showWeekends: true,
};

function readCookie(): AppSettings {
  if (typeof document === 'undefined') return DEFAULTS;
  const match = document.cookie.match(new RegExp('(?:^|; )' + COOKIE_KEY + '=([^;]*)'));
  if (!match) return DEFAULTS;
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1]));
    return {
      dateFormat: parsed.dateFormat === 'us' ? 'us' : 'eu',
      timeFormat: parsed.timeFormat === '12h' ? '12h' : '24h',
      language: ['cs', 'en', 'de', 'es'].includes(parsed.language) ? parsed.language : 'cs',
      showWeekends: parsed.showWeekends !== false,
    };
  } catch {
    return DEFAULTS;
  }
}

function writeCookie(settings: AppSettings) {
  const expires = new Date();
  expires.setDate(expires.getDate() + COOKIE_DAYS);
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(JSON.stringify(settings))}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSettings(readCookie());
    setMounted(true);
  }, []);

  const updateSettings = (updates: Partial<AppSettings>) => {
    const next: AppSettings = { ...settings, ...updates };
    setSettings(next);
    writeCookie(next);
  };

  return { settings, updateSettings, mounted };
}
