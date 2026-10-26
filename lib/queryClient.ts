'use client';

import { QueryClient } from '@tanstack/react-query';
import { get, set, del } from 'idb-keyval';
import type { AsyncStorage, Persister } from '@tanstack/react-query-persist-client';

const idbAsyncStorage: AsyncStorage = {
  getItem: async (key: string) => {
    const value = await get(key);
    return value ?? null;
  },
  setItem: async (key: string, value: string) => {
    await set(key, value);
  },
  removeItem: async (key: string) => {
    await del(key);
  },
};

export function createIDBPersister(idbKey = 'HEALTH_APP_OFFLINE_CACHE'): Persister {
  return {
    persistClient: async (persistClient) => {
      try {
        await idbAsyncStorage.setItem(idbKey, JSON.stringify(persistClient));
      } catch (error) {
        console.warn('Failed to persist query client to IndexedDB:', error);
      }
    },
    restoreClient: async () => {
      try {
        const value = await idbAsyncStorage.getItem(idbKey);
        return value ? JSON.parse(value) : undefined;
      } catch (error) {
        console.warn('Failed to restore query client from IndexedDB:', error);
        return undefined;
      }
    },
    removeClient: async () => {
      await idbAsyncStorage.removeItem(idbKey);
    },
  };
}

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 1000 * 60 * 60 * 24 * 7,
        staleTime: 1000 * 60 * 10,
        retry: 3,
        networkMode: 'offlineFirst',
      },
      mutations: {
        retry: 5,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        networkMode: 'offlineFirst',
      },
    },
  });
}