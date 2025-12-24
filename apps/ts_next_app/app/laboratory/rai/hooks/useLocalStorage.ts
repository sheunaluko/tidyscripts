// useLocalStorage Hook - LocalStorage utilities

import { useState, useEffect } from 'react';
import * as tsw from 'tidyscripts_web';

const log = tsw.common.logger.get_logger({ id: 'rai' });

/**
 * Hook for managing localStorage with type safety
 * @param key - LocalStorage key
 * @param defaultValue - Default value if key doesn't exist
 * @returns [value, setValue] tuple
 */
export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      log(`Error reading localStorage key "${key}":`);
      log(error);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      log(`Error setting localStorage key "${key}":`);
      log(error);
    }
  }, [key, value]);

  return [value, setValue];
}

/**
 * Get item from localStorage
 * @param key - LocalStorage key
 * @param defaultValue - Default value if key doesn't exist
 * @returns Parsed value or default
 */
export function getLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    log(`Error getting localStorage key "${key}":`);
    log(error);
    return defaultValue;
  }
}

/**
 * Set item in localStorage
 * @param key - LocalStorage key
 * @param value - Value to store
 */
export function setLocalStorage<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    log(`Error setting localStorage key "${key}":`);
    log(error);
  }
}

/**
 * Remove item from localStorage
 * @param key - LocalStorage key
 */
export function removeLocalStorage(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    log(`Error removing localStorage key "${key}":`);
    log(error);
  }
}
