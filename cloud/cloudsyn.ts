import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface CloudAccount {
  deleted: any;
  id: number;
  name: string;
  email: string;
  secret: string; 
}

interface CloudPayload {
  accounts: CloudAccount[];
  updatedAt: number;
}

/**
 * 🔼 Upload encrypted accounts to cloud
 * Zero-trust: cloud never sees plaintext
 */
export async function uploadAccountsToCloud(
  uid: string,
  accounts: CloudAccount[]
): Promise<void> {
  if (!uid) return;

  const ref = doc(db, 'users', uid);

  const payload: CloudPayload = {
    accounts,
    updatedAt: Date.now(),
  };

  await setDoc(ref, payload, { merge: true });
}

/**
 * 🔽 Restore encrypted accounts from cloud
 * Decryption happens later on device
 */
export async function restoreAccountsFromCloud(
  uid: string
): Promise<CloudAccount[] | null> {
  if (!uid) return null;

  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  const data = snap.data() as CloudPayload;
  return data.accounts || [];
}

/**
 * ❌ Permanently delete one account from cloud
 */
export async function deleteAccountFromCloud(
  uid: string,
  accountId: number,
  currentAccounts: CloudAccount[]
): Promise<void> {
  if (!uid) return;

  const updated = currentAccounts.filter(a => a.id !== accountId);

  await updateDoc(doc(db, 'users', uid), {
    accounts: updated,
    updatedAt: Date.now(),
  });
}
