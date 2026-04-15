import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Account, CloudAccount, User } from './types';
import { restoreAccountsFromCloud, uploadAccountsToCloud } from '../cloud/cloudsyn';

/**
 * Get the AsyncStorage key for a user's authenticator accounts
 */
export function getUserStorageKey(userId: string | null): string {
  return userId ? `auth_accounts_${userId}` : 'auth_accounts_default';
}

/**
 * Load the current user from AsyncStorage
 */
export async function loadCurrentUser(): Promise<User | null> {
  try {
    const savedUser = await AsyncStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  } catch (error) {
    console.error('Error loading current user:', error);
    return null;
  }
}

/**
 * Load authenticator accounts from local storage
 */
export async function loadAccounts(storageKey: string): Promise<Account[]> {
  try {
    const stored = await AsyncStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading accounts:', error);
    return [];
  }
}

/**
 * Save authenticator accounts to local storage
 */
export async function saveAccounts(storageKey: string, accounts: Account[]): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey, JSON.stringify(accounts));
  } catch (error) {
    console.error('Error saving accounts:', error);
  }
}

/**
 * Sync local accounts to cloud with merge logic
 */
export async function syncAccountsToCloud(
  userId: string,
  localAccounts: Account[]
): Promise<void> {
  if (!userId) return;

  try {
    const cloudAccounts = await restoreAccountsFromCloud(userId);
    const cloudMap = new Map<string, Account>();

    if (cloudAccounts) {
      cloudAccounts.forEach(acc => cloudMap.set(acc.secret, acc));
    }

    localAccounts.forEach(acc => {
      cloudMap.set(acc.secret, {
        ...acc,
        deleted: false,
      });
    });

    const mergedAccounts = Array.from(cloudMap.values());
    const cloudPayload: CloudAccount[] = mergedAccounts.map(acc => ({
      id: acc.id,
      name: acc.name,
      email: acc.email,
      secret: acc.secret,
      deleted: acc.deleted ?? false,
    }));

    await uploadAccountsToCloud(userId, cloudPayload);
  } catch (error) {
    console.error('Cloud sync error:', error);
  }
}

/**
 * Merge accounts from local and cloud storage
 */
export const mergeAccounts = (local: Account[], cloud: Account[]): Account[] => {
  const map = new Map<string, Account>();

  // First, add all cloud accounts (including soft-deleted ones)
  cloud.forEach(acc => {
    map.set(acc.secret, acc);
  });

  // Then merge in local accounts that aren't in cloud
  local.forEach(acc => {
    if (!map.has(acc.secret)) {
      map.set(acc.secret, acc);
    }
  });

  return Array.from(map.values());
};
