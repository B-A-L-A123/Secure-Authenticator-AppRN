import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
;

const colors = {
  background: '#000000',
  cardBg: '#1C1C1E',
  primary: '#00D4FF',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E93',
};

interface Account {
  id: number;
  name: string;
  email: string;
  secret: string;
}

export default function ImportExportScreen() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showExportText, setShowExportText] = useState(false);
  const [showImportText, setShowImportText] = useState(false);
  const [importCode, setImportCode] = useState('');

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    const stored = await AsyncStorage.getItem('auth_accounts_default');
    if (stored) setAccounts(JSON.parse(stored));
  };

  const saveAccounts = async (newAccounts: Account[]) => {
    setAccounts(newAccounts);
    await AsyncStorage.setItem('auth_accounts_default', JSON.stringify(newAccounts));
  };

  // ✅ Generate Base64 Encoded Backup Code
  const generateBackupCode = () => {
    const backupData = accounts.map((acc) => ({
      name: acc.name,
      email: acc.email,
      secret: acc.secret,
    }));
    
    const jsonString = JSON.stringify(backupData);
    const base64Code = btoa(jsonString); // Encode to Base64
    return base64Code;
  };

  // ✅ Copy Backup Code to Clipboard
  const handleCopyBackup = async () => {
    const backupCode = generateBackupCode();
    await Clipboard.setStringAsync(backupCode);
    Alert.alert('Copied!', 'Backup code copied to clipboard. You can now paste it on another phone.');
  };

  // ✅ Share Backup Code via Apps - FIXED VERSION
  const handleShareBackup = async () => {
    try {
      const backupCode = generateBackupCode();
      
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing not available', 'Please copy the code manually');
        return;
      }

      // Create a temporary file with proper file:// URI
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `2FA_Backup_${timestamp}.txt`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      
      const fileContent = `My 2FA Backup Code:\n\n${backupCode}\n\nImport this code on your new phone to restore all accounts.`;
      
      // Write to file
      await FileSystem.writeAsStringAsync(fileUri, fileContent);
      
      // Share the file
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/plain',
        dialogTitle: 'Share Backup Code',
        UTI: 'public.plain-text',
      });
      
      // Optional: Clean up the file after sharing
      // await FileSystem.deleteAsync(fileUri, { idempotent: true });
      
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share backup code');
    }
  };

  // ✅ Import Accounts from Backup Code
  const handleImportBackup = async () => {
    if (!importCode.trim()) {
      Alert.alert('Error', 'Please paste your backup code');
      return;
    }

    try {
      // Decode Base64
      const jsonString = atob(importCode.trim());
      const parsed = JSON.parse(jsonString);

      if (!Array.isArray(parsed)) throw new Error('Invalid backup code');

      const newAccounts = parsed.map((acc, i) => ({
        id: Date.now() + i,
        name: acc.name,
        email: acc.email,
        secret: acc.secret.toUpperCase(),
      }));

      // Filter out duplicates
      const existingSecrets = new Set(accounts.map((a) => a.secret));
      const uniqueNew = newAccounts.filter((acc) => !existingSecrets.has(acc.secret));

      if (uniqueNew.length > 0) {
        const updated = [...accounts, ...uniqueNew];
        await saveAccounts(updated);
        setShowImportText(false);
        setImportCode('');
        Alert.alert('Success! 🎉', `${uniqueNew.length} accounts imported successfully`);
      } else {
        Alert.alert('No New Accounts', 'All accounts already exist');
      }
    } catch (err) {
      Alert.alert('Error', 'Invalid backup code. Please check and try again.');
    }
  };

  // ✅ Paste from Clipboard
  const handlePasteFromClipboard = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) {
      setImportCode(text);
    } else {
      Alert.alert('Empty Clipboard', 'No text found in clipboard');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Backup & Restore</Text>
        
        <Text style={styles.subtitle}>Export Your Accounts</Text>

        <Pressable style={styles.primaryButton} onPress={handleCopyBackup}>
          <Feather name="copy" size={24} color="#000" />
          <Text style={styles.primaryText}>Copy Backup Code</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={handleShareBackup}>
          <Feather name="share-2" size={24} color={colors.textPrimary} />
          <Text style={styles.secondaryText}>Share Backup Code</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => setShowExportText(true)}>
          <Feather name="eye" size={24} color={colors.textPrimary} />
          <Text style={styles.secondaryText}>View Backup Code</Text>
        </Pressable>

        <View style={styles.divider} />

        <Text style={styles.subtitle}>Import Accounts</Text>

        <Pressable style={styles.primaryButton} onPress={() => setShowImportText(true)}>
          <Feather name="download" size={24} color="#000" />
          <Text style={styles.primaryText}>Import Backup Code</Text>
        </Pressable>

        <View style={styles.statsCard}>
          <Text style={styles.statsNumber}>{accounts.length}</Text>
          <Text style={styles.statsLabel}>Accounts Saved</Text>
        </View>
      </ScrollView>

      {/* Export Text Modal */}
      <Modal visible={showExportText} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardLarge}>
            <Text style={styles.modalTitle}>Your Backup Code</Text>
            <Text style={styles.modalSubtitle}>Copy this code and save it securely</Text>

            <ScrollView style={styles.codeContainer}>
              <Text style={styles.codeText} selectable>
                {generateBackupCode()}
              </Text>
            </ScrollView>

            <View style={styles.buttonRow}>
              <Pressable 
                style={[styles.modalButton, styles.primaryButton]} 
                onPress={async () => {
                  await handleCopyBackup();
                  setShowExportText(false);
                }}
              >
                <Feather name="copy" size={20} color="#000" />
                <Text style={styles.primaryText}>Copy</Text>
              </Pressable>

              <Pressable 
                style={[styles.modalButton, styles.secondaryButton]} 
                onPress={() => setShowExportText(false)}
              >
                <Text style={styles.secondaryText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Import Text Modal */}
      <Modal visible={showImportText} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardLarge}>
            <Text style={styles.modalTitle}>Import Backup Code</Text>
            <Text style={styles.modalSubtitle}>Paste your backup code below</Text>

            <TextInput
              style={styles.textInput}
              placeholder="Paste backup code here..."
              placeholderTextColor={colors.textSecondary}
              value={importCode}
              onChangeText={setImportCode}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <Pressable 
              style={[styles.pasteButton]} 
              onPress={handlePasteFromClipboard}
            >
              <Feather name="clipboard" size={20} color={colors.textPrimary} />
              <Text style={styles.secondaryText}>Paste from Clipboard</Text>
            </Pressable>

            <View style={styles.buttonRow}>
              <Pressable 
                style={[styles.modalButton, styles.primaryButton]} 
                onPress={handleImportBackup}
              >
                <Feather name="download" size={20} color="#000" />
                <Text style={styles.primaryText}>Import</Text>
              </Pressable>

              <Pressable 
                style={[styles.modalButton, styles.secondaryButton]} 
                onPress={() => {
                  setShowImportText(false);
                  setImportCode('');
                }}
              >
                <Text style={styles.secondaryText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24 },
  title: { fontSize: 28, color: colors.textPrimary, fontWeight: '700', marginBottom: 8 },
  subtitle: { 
    fontSize: 18, 
    color: colors.textPrimary, 
    fontWeight: '600', 
    marginTop: 20,
    marginBottom: 12 
  },

  primaryButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryText: { fontSize: 16, fontWeight: '700', color: '#000' },

  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.textSecondary,
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  secondaryText: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },

  divider: {
    height: 1,
    backgroundColor: colors.textSecondary,
    marginVertical: 20,
    opacity: 0.3,
  },

  statsCard: {
    marginTop: 30,
    backgroundColor: colors.cardBg,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  statsNumber: { fontSize: 40, color: colors.primary, fontWeight: '900' },
  statsLabel: { color: colors.textSecondary, fontSize: 14 },

  modalOverlay: { 
    flex: 1, 
    backgroundColor: '#000000cc', 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20,
  },
  modalCardLarge: { 
    backgroundColor: colors.cardBg, 
    padding: 24, 
    borderRadius: 18, 
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: { 
    color: colors.textPrimary, 
    fontSize: 20, 
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },

  codeContainer: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 10,
    maxHeight: 200,
    marginBottom: 16,
  },
  codeText: {
    color: colors.primary,
    fontSize: 12,
    fontFamily: 'monospace',
  },

  textInput: {
    backgroundColor: colors.background,
    color: colors.textPrimary,
    padding: 12,
    borderRadius: 10,
    fontSize: 14,
    minHeight: 120,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.textSecondary,
  },

  pasteButton: {
    borderWidth: 1,
    borderColor: colors.textSecondary,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 14,
  },
});