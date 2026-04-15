import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { generate } from 'otplib';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { decryptSecret, encryptSecret } from '../Security/crypto';
import { restoreAccountsFromCloud, uploadAccountsToCloud } from '../cloud/cloudsyn';
import { isValidBase32, parseOTPAuthURI } from '../utils/validators';
import { mergeAccounts, syncAccountsToCloud } from '../utils/storageManager';
import type { Account, User } from '../utils/types';

// Re-export for backward compatibility
export { isValidBase32, parseOTPAuthURI, mergeAccounts };

// ===== TIME SYNCHRONIZATION =====
let timeOffset = 0;

export function getSyncedTime(): number {
  return Math.floor(Date.now() / 1000) + timeOffset;
}

async function syncTime(): Promise<void> {
  const timeSources = [
    async () => {
      const startTime = Date.now();
      const response = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const roundTripTime = (Date.now() - startTime) / 2;
      const data = await response.json();
      const serverTime = Math.floor(new Date(data.datetime).getTime() / 1000);
      const localTime = Math.floor(Date.now() / 1000);
      return serverTime - localTime + Math.floor(roundTripTime / 1000);
    },
    async () => {
      const startTime = Date.now();
      const response = await fetch('https://timeapi.io/api/Time/current/zone?timeZone=UTC', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const roundTripTime = (Date.now() - startTime) / 2;
      const data = await response.json();
      const serverTime = Math.floor(new Date(data.dateTime).getTime() / 1000);
      const localTime = Math.floor(Date.now() / 1000);
      return serverTime - localTime + Math.floor(roundTripTime / 1000);
    },
    async () => {
      const startTime = Date.now();
      const response = await fetch('https://www.google.com', {
        method: 'HEAD',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const roundTripTime = (Date.now() - startTime) / 2;
      const dateHeader = response.headers.get('date');
      if (!dateHeader) throw new Error('No date header');
      const serverTime = Math.floor(new Date(dateHeader).getTime() / 1000);
      const localTime = Math.floor(Date.now() / 1000);
      return serverTime - localTime + Math.floor(roundTripTime / 1000);
    }
  ];

  for (let i = 0; i < timeSources.length; i++) {
    try {
      const offset = await timeSources[i]();
      timeOffset = offset;
      console.log(`✅ Time synced (source ${i + 1}). Offset: ${timeOffset}s`);
      await AsyncStorage.setItem('time_offset', timeOffset.toString());
      await AsyncStorage.setItem('last_sync_time', Date.now().toString());
      return;
    } catch (error) {
      console.log(`⚠️ Time source ${i + 1} failed:`, error);
    }
  }

  console.log('⚠️ All time sources failed, using saved/local time');
  try {
    const saved = await AsyncStorage.getItem('time_offset');
    const lastSync = await AsyncStorage.getItem('last_sync_time');
    

    if (saved) {
      timeOffset = parseInt(saved);
      const syncAge = lastSync ? Math.floor((Date.now() - parseInt(lastSync)) / 1000 / 60) : null;
      console.log(`📦 Using saved offset: ${timeOffset}s${syncAge ? ` (${syncAge} min old)` : ''}`);
    } else {
      timeOffset = 0;
      console.log(`🔓 No saved offset, using local time (offset = 0)`);
    }
  } catch (e) {
    timeOffset = 0;
    console.log(`🔓 Using local time (offset = 0)`);
  }
}

// ===== TOTP Generation =====
export async function generateTOTP(secret: string): Promise<string> {
  try {
    const token = await generate({ 
      secret,
    });
    return token;
  } catch (error) {
    console.error('TOTP generation error:', error);
    return '000000';
  }
}

export function useAuthenticatorLogic() {
  const [fabOpen, setFabOpen] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [showManual, setShowManual] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [timeSynced, setTimeSynced] = useState<boolean>(false);
  const allowCloudSyncRef = useRef<boolean>(true);
  const hasLoadedRef = useRef<boolean>(false);

  // Time sync effect
  useEffect(() => {
    let syncInterval: ReturnType<typeof setInterval>;
    
    const initializeTimeSync = async () => {
      await syncTime();
      
      if (timeOffset === 0) {
        console.log('⏱️ Retrying time sync in 10 seconds...');
        setTimeout(async () => {
          await syncTime();
          setTimeSynced(true);
        }, 10000);
      } else {
        setTimeSynced(true);
      }
      
      syncInterval = setInterval(syncTime, 30 * 60 * 1000);
    };

    initializeTimeSync();

    return () => {
      if (syncInterval) clearInterval(syncInterval);
    };
  }, []);

  // Load user data effect
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const savedUser = await AsyncStorage.getItem('user');
        let uid: string | null = null;
        if (savedUser) {
          const user: User = JSON.parse(savedUser);
          uid = user.id;
        }

        // Only load accounts on first mount or when user actually changes
        if (!hasLoadedRef.current || uid !== userId) {
          console.log(`User changed from ${userId} to ${uid}`);
          setUserId(uid);
          
          const key = uid ? `auth_accounts_${uid}` : 'auth_accounts_default';
          setStorageKey(key);

          // Load from local storage
          const stored = await AsyncStorage.getItem(key);
          const localAccounts = stored ? JSON.parse(stored) : [];
          setAccounts(localAccounts);
          
          hasLoadedRef.current = true;
          console.log(`Loaded ${localAccounts.length} local accounts.`);
        }
      } catch (e) {
        console.error('Load error:', e);
        setAccounts([]);
      }
    };

    loadUserData();
    const userCheckInterval = setInterval(loadUserData, 1000);
    return () => clearInterval(userCheckInterval);
  }, [userId]);

  // Save accounts effect
  useEffect(() => {
    if (!storageKey || !userId) return;
    
    (async () => {
      try {
        // Save locally (only active accounts that user sees)
        await AsyncStorage.setItem(storageKey, JSON.stringify(accounts));

        // Upload to cloud with merge logic
        if (allowCloudSyncRef.current) {
          await syncAccountsToCloud(userId, accounts);
        }
      } catch (e) {
        console.error('Save error:', e);
      }
    })();
  }, [accounts, storageKey, userId]);

  // Update time left effect
  useEffect(() => {
    const update = () => {
      const now = getSyncedTime();
      const secondsInPeriod = now % 30;
      const remaining = secondsInPeriod === 0 ? 30 : 30 - secondsInPeriod;
      setTimeLeft(remaining);
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [timeSynced]);

  const filteredAccounts = accounts.filter(account =>
    account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleScanQR = (): void => {
    setFabOpen(false);
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'QR scanning is only available on Android and iOS devices.', [{ text: 'OK' }]);
      return;
    }
    setShowCamera(true);
  };

  const handleQRScanned = async (data: string): Promise<void> => {
    try {
      // 🔄 Try parsing as JSON first (from Import/Export)
      const parsed = JSON.parse(data);
      
      if (parsed.name && parsed.email && parsed.secret) {
        // This is a JSON export from Import/Export screen
        const plaintextSecret = parsed.secret.toUpperCase();
        
        const accountId = Date.now();
        // 🔐 Encrypt the plaintext secret before storing
        const encryptedSecret = await encryptSecret(plaintextSecret, accountId.toString());
        
        const newAcc: Account = {
          id: accountId,
          name: parsed.name,
          email: parsed.email,
          secret: encryptedSecret,
        };
        
        setAccounts([newAcc, ...accounts]);
        setShowCamera(false);
        Alert.alert('Success! 🎉', `${parsed.name} imported successfully`);
        return;
      }
    } catch (e) {
      // Not JSON, try parsing as otpauth:// URI
    }
    
    // 📱 Parse as standard otpauth:// URI
    const parsed = parseOTPAuthURI(data);
    
    if (!parsed.secret) {
      Alert.alert('Invalid QR Code', 'Please scan a valid 2FA QR code');
      setShowCamera(false);
      return;
    }
    
    const plaintextSecret = parsed.secret.toUpperCase();
    
    // 🔐 Encrypt the secret before storing
    const accountId = Date.now();
    const encryptedSecret = await encryptSecret(plaintextSecret, accountId.toString());
    
    const newAcc: Account = {
      id: accountId,
      name: parsed.issuer || 'Scanned Account',
      email: parsed.label || 'From QR Code',
      secret: encryptedSecret,
    };
    
    setAccounts([newAcc, ...accounts]);
    setShowCamera(false);
    Alert.alert('Success! 🎉', 'Account added successfully');
  };

  const addAccount = async (name: string, email: string, secret: string) => {
    // 🔐 Encrypt the secret before storing
    const accountId = Date.now();
    const encryptedSecret = await encryptSecret(secret, accountId.toString());
    
    const newAcc: Account = { 
      id: accountId, 
      name, 
      email, 
      secret: encryptedSecret
    };
    setAccounts(prev => [newAcc, ...prev]);
    setShowManual(false);
    setFabOpen(false);
  };

  const deleteAccount = (id: number) => {
    Alert.alert(
      'Delete Account',
      'Remove this account from this device? (It will remain in your cloud backup)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete from Device',
          style: 'destructive',
          onPress: async () => {
            // Remove the account from local state (UI)
            const updatedAccounts = accounts.filter(a => a.id !== id);
            setAccounts(updatedAccounts);
            
            // Save updated local state
            if (storageKey) {
              await AsyncStorage.setItem(storageKey, JSON.stringify(updatedAccounts));
            }
            
            // Soft delete in cloud (mark as deleted but keep the data)
            if (userId) {
              try {
                // Get current cloud accounts
                const cloudAccounts = await restoreAccountsFromCloud(userId);
                if (cloudAccounts) {
                  // Find the account to soft-delete and mark it
                  const updatedCloud = cloudAccounts.map(acc => 
                    acc.id === id 
                      ? { ...acc, deleted: true, deletedAt: Date.now() }
                      : acc
                  );
                  
                  // Upload back to cloud with soft-delete flag
                  await uploadAccountsToCloud(userId, updatedCloud);
                }
              } catch (e) {
                console.error('Cloud soft-delete error:', e);
              }
            }
          },
        },
      ]
    );
  };

  return {
    // State
    fabOpen,
    accounts,
    searchQuery,
    showCamera,
    showManual,
    timeLeft,
    filteredAccounts,
    
    // Setters
    setFabOpen,
    setSearchQuery,
    setShowCamera,
    setShowManual,
    
    // Handlers
    handleScanQR,
    handleQRScanned,
    addAccount,
    deleteAccount,
  };
}

export function useAccountCardLogic(secret: string, name: string) {
  const [code, setCode] = useState<string>('------');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const updateCode = async () => {
      try {
        // 🔓 Decrypt the secret to get the original plaintext for TOTP generation
        const plaintextSecret = await decryptSecret(secret);
        
        // Validate the decrypted secret
        if (!plaintextSecret || !isValidBase32(plaintextSecret)) {
          console.error('Invalid decrypted secret for account:', name);
          console.error('Decrypted value:', plaintextSecret);
          setCode('ERROR');
          return;
        }
        
        const newCode = await generateTOTP(plaintextSecret);
        setCode(newCode);
      } catch (error) {
        console.error('Error generating TOTP for account:', name, error);
        setCode('ERROR');
      }
    };
    updateCode();
    const interval = setInterval(updateCode, 1000);
    return () => clearInterval(interval);
  }, [secret, name]);

  const copyCode = async () => {
    if (code !== 'ERROR' && code !== '------') {
      await Clipboard.setStringAsync(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return {
    code,
    copied,
    copyCode,
  };
}