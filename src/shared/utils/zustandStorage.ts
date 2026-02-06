import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, StateStorage, StorageValue } from 'zustand/middleware';

/**
 * Date fields that need to be revived from JSON strings
 */
const DATE_FIELDS = ['createdAt', 'updatedAt', 'resolvedAt', 'expiresAt', 'startDate', 'endDate', 'uploadedAt'];

/**
 * Custom JSON reviver that converts ISO date strings back to Date objects
 * This is necessary because JSON.stringify converts Dates to strings
 */
function dateReviver(key: string, value: unknown): unknown {
  if (DATE_FIELDS.includes(key) && typeof value === 'string') {
    const date = new Date(value);
    // Check if valid date
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  return value;
}

/**
 * Recursively convert date strings to Date objects in an object
 */
function reviveDates<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => reviveDates(item)) as T;
  }
  
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (DATE_FIELDS.includes(key) && typeof value === 'string') {
        const date = new Date(value);
        result[key] = !isNaN(date.getTime()) ? date : value;
      } else if (typeof value === 'object' && value !== null) {
        result[key] = reviveDates(value);
      } else {
        result[key] = value;
      }
    }
    return result as T;
  }
  
  return obj;
}

/**
 * Base AsyncStorage adapter
 */
const baseStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const value = await AsyncStorage.getItem(name);
      console.log(`[ZustandStorage] GET "${name}":`, value ? `${value.length} chars` : 'null');
      return value;
    } catch (error) {
      console.error(`[ZustandStorage] Failed to get item "${name}":`, error);
      return null;
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(name, value);
      console.log(`[ZustandStorage] SET "${name}":`, `${value.length} chars saved`);
    } catch (error) {
      console.error(`[ZustandStorage] Failed to set item "${name}":`, error);
    }
  },

  removeItem: async (name: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(name);
    } catch (error) {
      console.error(`[ZustandStorage] Failed to remove item "${name}":`, error);
    }
  },
};

/**
 * Create Zustand storage with automatic Date revival
 * Use this with persist middleware
 * 
 * @example
 * persist(
 *   (set) => ({ ... }),
 *   {
 *     name: 'my-store',
 *     storage: createZustandStorage(),
 *   }
 * )
 */
export function createZustandStorage<T>() {
  return {
    getItem: async (name: string): Promise<StorageValue<T> | null> => {
      try {
        const value = await AsyncStorage.getItem(name);
        console.log(`[ZustandStorage] GET "${name}":`, value ? `${value.length} chars` : 'null');
        
        if (!value) return null;
        
        const parsed = JSON.parse(value) as StorageValue<T>;
        
        // Revive dates in the state object
        if (parsed && parsed.state) {
          parsed.state = reviveDates(parsed.state);
        }
        
        return parsed;
      } catch (error) {
        console.error(`[ZustandStorage] Failed to get item "${name}":`, error);
        return null;
      }
    },
    
    setItem: async (name: string, value: StorageValue<T>): Promise<void> => {
      try {
        const stringified = JSON.stringify(value);
        await AsyncStorage.setItem(name, stringified);
        console.log(`[ZustandStorage] SET "${name}":`, `${stringified.length} chars saved`);
      } catch (error) {
        console.error(`[ZustandStorage] Failed to set item "${name}":`, error);
      }
    },
    
    removeItem: async (name: string): Promise<void> => {
      try {
        await AsyncStorage.removeItem(name);
      } catch (error) {
        console.error(`[ZustandStorage] Failed to remove item "${name}":`, error);
      }
    },
  };
}

/**
 * Legacy storage export for backward compatibility
 * @deprecated Use createZustandStorage() instead
 */
export const zustandStorage = baseStorage;

/**
 * Storage keys for Zustand persisted stores
 * Centralized to avoid key collisions and enable easy management
 */
export const STORAGE_KEYS = {
  FAULT_REPORTS: '@talofix_fault_reports',
  COMPANY_FAULT_REPORTS: '@talofix_company_fault_reports',
  ANNOUNCEMENTS: '@talofix_announcements',
  USER_PROFILE: '@talofix_user_profile',
  SETTINGS: '@talofix_settings',
} as const;

/**
 * Clear all user-specific persisted data
 * Should be called on logout to prevent data leakage between users
 * Does NOT clear settings (theme/language) as those are user preferences
 */
export async function clearPersistedUserData(): Promise<void> {
  const keysToRemove = [
    STORAGE_KEYS.FAULT_REPORTS,
    STORAGE_KEYS.COMPANY_FAULT_REPORTS,
    STORAGE_KEYS.USER_PROFILE,
    STORAGE_KEYS.ANNOUNCEMENTS,
  ];

  try {
    await AsyncStorage.multiRemove(keysToRemove);
    console.log('[ZustandStorage] Cleared persisted user data');
  } catch (error) {
    console.error('[ZustandStorage] Failed to clear persisted data:', error);
  }
}

/**
 * Helper to create persist options with consistent defaults
 * Filters out loading/error states and functions from persistence
 */
export function createPersistConfig<T>(
  name: string,
  partialize?: (state: T) => Partial<T>
) {
  return {
    name,
    storage: zustandStorage,
    partialize: partialize ?? ((state: T) => {
      // Default: exclude common transient state
      const { loading, error, refreshing, isLoading, ...rest } = state as Record<string, unknown>;
      return rest as Partial<T>;
    }),
  };
}
