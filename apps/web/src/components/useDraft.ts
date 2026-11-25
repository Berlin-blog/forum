import { useEffect, useRef, useState } from 'react';

export function useDraft(key: string, initial = '') {
  const [value, setValue] = useState(() => {
    try {
      return window.localStorage.getItem(key) ?? initial;
    } catch {
      return initial;
    }
  });
  const hadDraft = useRef(false);
  try {
    hadDraft.current = hadDraft.current || Boolean(window.localStorage.getItem(key));
  } catch {
    // localStorage may be unavailable
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        if (value.trim()) window.localStorage.setItem(key, value);
        else window.localStorage.removeItem(key);
      } catch {
        // ignore quota errors
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [key, value]);

  function clear() {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
    setValue('');
  }

  return [value, setValue, clear, hadDraft.current] as const;
}
