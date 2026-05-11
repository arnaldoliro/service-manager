"use client";

import { useState, useEffect } from "react";

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) setStoredValue(JSON.parse(item));
    } catch {
      // ignore
    }
  }, [key]);

  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      const next = value instanceof Function ? value(storedValue) : value;
      setStoredValue(next);
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const removeValue = () => {
    try {
      setStoredValue(initialValue);
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  };

  return [storedValue, setValue, removeValue];
}
