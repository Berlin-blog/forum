import { createContext, useContext, useEffect, useState } from 'react';

export type Preferences = {
  autoExpandReplies: boolean;
  nightMode: boolean;
  reduceMotion: boolean;
  notificationPolling: boolean;
};

const STORAGE_KEY = 'forum_preferences';

const defaults: Preferences = {
  autoExpandReplies: false,
  nightMode: false,
  reduceMotion: false,
  notificationPolling: true,
};

function readPreferences(): Preferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

type PreferencesContextValue = {
  preferences: Preferences;
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  resetPreferences: () => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(readPreferences);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // ignore storage errors
    }
    document.documentElement.dataset.theme = preferences.nightMode ? 'night' : 'day';
    document.documentElement.dataset.reduceMotion = preferences.reduceMotion ? 'true' : 'false';
  }, [preferences]);

  function setPreference<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  function resetPreferences() {
    setPreferences(defaults);
  }

  return (
    <PreferencesContext.Provider value={{ preferences, setPreference, resetPreferences }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('usePreferences must be used inside PreferencesProvider');
  return value;
}
