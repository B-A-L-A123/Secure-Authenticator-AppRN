import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {
  restoreAccountsFromCloud,
  uploadAccountsToCloud,
} from '..//../cloud/cloudsyn';

type Account = {
  id: string;
  name: string;
  deleted?: boolean;
  deletedAt?: string;
  [key: string]: any;
};

export default function Settings() {
  const [privacyScreenEnabled, setPrivacyScreenEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [storageKey, setStorageKey] = useState<string | null>(null);

  const allowCloudSyncRef = useRef<boolean>(true);

  useEffect(() => {
    checkBiometricAvailability();
    loadSettings();
    loadUser();
  }, []);

  const loadUser = async () => {
    const savedUser = await AsyncStorage.getItem('user');
    if (!savedUser) return;

    const user = JSON.parse(savedUser);
    setUserId(user.id);
    setStorageKey(`auth_accounts_${user.id}`);
  };

  /* =====================================================
     ✅ FIX: LOAD ACCOUNTS (NO LOGIC / UI CHANGE)
     ===================================================== */
  useEffect(() => {
    if (!storageKey) return;

    AsyncStorage.getItem(storageKey).then(stored => {
      if (stored) {
        setAccounts(JSON.parse(stored));
      }
    });
  }, [storageKey]);

  const checkBiometricAvailability = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    setBiometricAvailable(compatible && enrolled);

    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      setBiometricType('Face ID');
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      setBiometricType('Fingerprint');
    } else {
      setBiometricType('Screen Lock');
    }
  };

  const loadSettings = async () => {
    const privacy = await AsyncStorage.getItem('privacyScreenEnabled');
    setPrivacyScreenEnabled(privacy === 'true');
  };

  /* ================= RESTORE (UNCHANGED) ================= */
  const handleRestoreAllAccounts = async () => {
    try {
      if (!userId || !storageKey) {
        Alert.alert('Error', 'User not found');
        return;
      }

      const cloudAccounts = await restoreAccountsFromCloud(userId);

      if (!cloudAccounts || cloudAccounts.length === 0) {
        Alert.alert('Info', 'No accounts found in cloud');
        return;
      }

      const restoredAccounts = cloudAccounts.map((acc: any) =>
        acc.deleted
          ? { ...acc, deleted: false, deletedAt: undefined }
          : acc
      );

      allowCloudSyncRef.current = false;
      await AsyncStorage.setItem(
        storageKey,
        JSON.stringify(restoredAccounts)
      );

      await uploadAccountsToCloud(userId, restoredAccounts);

      Alert.alert('Success', 'Accounts restored successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to restore accounts');
    }
  };

  /* ================= CLEAR ALL (UNCHANGED) ================= */
  const clearAllAccounts = async () => {
    Alert.alert('Clear All', 'Delete all accounts everywhere?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          allowCloudSyncRef.current = true;
          setAccounts([]);

          if (storageKey) {
            await AsyncStorage.removeItem(storageKey);
          }
          if (userId) {
            await uploadAccountsToCloud(userId, []);
          }
        },
      },
    ]);
  };

  const handlePrivacyScreenToggle = async (value: boolean) => {
    if (!biometricAvailable) return;

    if (value) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to enable privacy screen',
      });

      if (result.success) {
        setPrivacyScreenEnabled(true);
        await AsyncStorage.setItem('privacyScreenEnabled', 'true');
      }
    } else {
      setPrivacyScreenEnabled(false);
      await AsyncStorage.setItem('privacyScreenEnabled', 'false');
    }
  };

  /* ================= UI (UNCHANGED) ================= */

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>⚙️ Security Settings</Text>
          <Text style={styles.subtitle}>
            Manage your privacy and security preferences
          </Text>
        </View>

        <View style={styles.mainCard}>
          <Text style={styles.cardTitle}>Privacy & Security</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>🔒 Privacy Screen</Text>
              <Text style={styles.settingDescription}>
                {biometricAvailable
                  ? `Protected by ${biometricType}`
                  : 'Authentication not available'}
              </Text>
            </View>
            <Switch
              value={privacyScreenEnabled}
              onValueChange={handlePrivacyScreenToggle}
              disabled={!biometricAvailable}
            />
          </View>
        </View>

        <View style={styles.mainCard}>
          <Text style={styles.cardTitle}>Account Management</Text>

          <Pressable
            onPress={handleRestoreAllAccounts}
            style={styles.restoreButton}
          >
            <Text style={styles.restoreButtonText}>
              🔄 Restore All Deleted Accounts
            </Text>
          </Pressable>

          <Text style={styles.settingDescription}>
            This will restore all accounts you've previously deleted.
          </Text>
        </View>

        <View style={styles.screen}>
          {accounts.length > 0 && (
            <Pressable onPress={clearAllAccounts} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>
                ⚠️ Clear All Accounts
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

/* ================= STYLES (UNCHANGED) ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  content: { padding: 19 },
  header: { marginBottom: 19 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 14, color: '#9a9a9a', marginLeft: 40 },
  mainCard: {
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 9,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#e6e6e6' },
  settingItem: { flexDirection: 'row', justifyContent: 'space-between' },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 16, color: '#e6e6e6' },
  settingDescription: { fontSize: 13, color: '#9a9a9a' },
  restoreButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  restoreButtonText: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  clearButton: {
    backgroundColor: '#330000',
    paddingVertical: 12,
    borderRadius: 12,
  },
  clearButtonText: {
    color: '#ff6666',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  screen: { flex: 1 },
});
