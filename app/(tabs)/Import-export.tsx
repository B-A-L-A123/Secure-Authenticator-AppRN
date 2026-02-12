import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

const colors = {
  background: '#000000',
  cardBg: '#1C1C1E',
  primary: '#00D4FF',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E93',
  cardBorder: '#2a2a2a',
};

interface Account {
  id: number;
  name: string;
  email: string;
  secret: string;
}

interface User {
  id: string;
}

export default function ImportExportScreen() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [showExportQR, setShowExportQR] = useState(false);
  const [showImportCamera, setShowImportCamera] = useState(false);
  const [currentExportIndex, setCurrentExportIndex] = useState(0);

  // Enhanced user detection with account switching support
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const savedUser = await AsyncStorage.getItem('user');
        let uid: string | null = null;

        if (savedUser) {
          const user: User = JSON.parse(savedUser);
          uid = user.id;
        }

        if (uid !== userId) {
          console.log(`User changed from ${userId} to ${uid}`);
          
          setUserId(uid);
          const key = uid ? `auth_accounts_${uid}` : 'auth_accounts_default';
          setStorageKey(key);

          const stored = await AsyncStorage.getItem(key);
          setAccounts(stored ? JSON.parse(stored) : []);
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

  const saveAccounts = async (newAccounts: Account[]) => {
    if (!storageKey) return;
    
    setAccounts(newAccounts);
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(newAccounts));
    } catch (e) {
      console.error('Save error:', e);
    }
  };

  // Generate export data for QR codes (one account per QR)
  const getExportData = (index: number) => {
    if (index >= accounts.length) return null;
    
    const account = accounts[index];
    return {
      name: account.name,
      email: account.email,
      secret: account.secret, // Encrypted secret
    };
  };

  // Handle QR code scan for import
  const handleQRScanned = async (data: string) => {
    try {
      const parsed = JSON.parse(data);
      
      if (!parsed.name || !parsed.email || !parsed.secret) {
        throw new Error('Invalid QR code format');
      }

      // Check for duplicates
      const exists = accounts.some(acc => acc.secret === parsed.secret);
      
      if (exists) {
        Alert.alert('Already Exists', 'This account is already saved');
        setShowImportCamera(false);
        return;
      }

      const newAccount: Account = {
        id: Date.now(),
        name: parsed.name,
        email: parsed.email,
        secret: parsed.secret, // Already encrypted
      };

      const updated = [...accounts, newAccount];
      await saveAccounts(updated);
      
      Alert.alert('Success! 🎉', `${parsed.name} imported successfully`, [
        {
          text: 'Import More',
          onPress: () => {
            // Keep camera open for more imports
          },
        },
        {
          text: 'Done',
          onPress: () => setShowImportCamera(false),
        },
      ]);
    } catch (err) {
      Alert.alert('Error', 'Invalid QR code. Please scan a valid 2FA backup QR code.');
    }
  };

  const handleExportStart = () => {
    if (accounts.length === 0) {
      Alert.alert('No Accounts', 'You have no accounts to export');
      return;
    }
    setCurrentExportIndex(0);
    setShowExportQR(true);
  };

  const handleNextExport = () => {
    if (currentExportIndex < accounts.length - 1) {
      setCurrentExportIndex(currentExportIndex + 1);
    } else {
      setShowExportQR(false);
      setCurrentExportIndex(0);
      Alert.alert('Complete', 'All accounts have been exported');
    }
  };

  const handlePreviousExport = () => {
    if (currentExportIndex > 0) {
      setCurrentExportIndex(currentExportIndex - 1);
    }
  };

  const exportData = getExportData(currentExportIndex);
  const qrSize = Math.min(Dimensions.get('window').width - 100, 280);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* <Text style={styles.title}>Backup & Restore</Text> */}
        
        {/* {userId && (
          <View style={styles.userBanner}>
            <Feather name="user" size={16} color={colors.primary} />
            <Text style={styles.userText}>Logged in as: {userId}</Text>
          </View>
        )} */}
        
        <Text style={styles.subtitle}>Export Your Accounts</Text>
        <Text style={styles.description}>
          Export accounts one by one using QR codes. Scan each QR code on your new device.
        </Text>

        <Pressable style={styles.primaryButton} onPress={handleExportStart}>
          <Feather name="upload" size={24} color="#000" />
          <Text style={styles.primaryText}>Export via QR Code</Text>
        </Pressable>

        <View style={styles.divider} />

        <Text style={styles.subtitle}>Import Accounts</Text>
        <Text style={styles.description}>
          Scan QR codes from your old device to import accounts.
        </Text>

        <Pressable style={styles.primaryButton} onPress={() => setShowImportCamera(true)}>
          <Feather name="download" size={24} color="#000" />
          <Text style={styles.primaryText}>Import via QR Code</Text>
        </Pressable>

        <View style={styles.statsCard}>
          <Text style={styles.statsNumber}>{accounts.length}</Text>
          <Text style={styles.statsLabel}>Accounts Saved</Text>
        </View>
      </ScrollView>

      {/* Export QR Modal */}
      <Modal visible={showExportQR} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Export Account</Text>
              <Pressable onPress={() => {
                setShowExportQR(false);
                setCurrentExportIndex(0);
              }}>
                <Feather name="x" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            {exportData && (
              <>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{exportData.name}</Text>
                  <Text style={styles.accountEmail}>{exportData.email}</Text>
                  <Text style={styles.accountProgress}>
                    Account {currentExportIndex + 1} of {accounts.length}
                  </Text>
                </View>

                <View style={styles.qrContainer}>
                  <QRCode
                    value={JSON.stringify(exportData)}
                    size={qrSize}
                    color="#000000"
                    backgroundColor="#FFFFFF"
                  />
                </View>

                <Text style={styles.qrInstruction}>
                  Scan this QR code on your new device to import this account
                </Text>

                <View style={styles.navigationButtons}>
                  <Pressable
                    style={[
                      styles.navButton,
                      currentExportIndex === 0 && styles.navButtonDisabled,
                    ]}
                    onPress={handlePreviousExport}
                    disabled={currentExportIndex === 0}
                  >
                    <Feather
                      name="chevron-left"
                      size={24}
                      color={currentExportIndex === 0 ? colors.textSecondary : colors.textPrimary}
                    />
                    <Text
                      style={[
                        styles.navButtonText,
                        currentExportIndex === 0 && styles.navButtonTextDisabled,
                      ]}
                    >
                      Previous
                    </Text>
                  </Pressable>

                  <Pressable style={styles.navButton} onPress={handleNextExport}>
                    <Text style={styles.navButtonText}>
                      {currentExportIndex < accounts.length - 1 ? 'Next' : 'Done'}
                    </Text>
                    <Feather name="chevron-right" size={24} color={colors.textPrimary} />
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Import Camera Modal */}
      {showImportCamera && (
        <QRScannerModal
          onScanned={handleQRScanned}
          onClose={() => setShowImportCamera(false)}
        />
      )}
    </SafeAreaView>
  );
}

// QR Scanner Component
interface QRScannerModalProps {
  onScanned: (data: string) => void;
  onClose: () => void;
}

function QRScannerModal({ onScanned, onClose }: QRScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    return (
      <Modal visible animationType="slide">
        <View style={styles.scannerWrap}>
          <View style={styles.scannerDenied}>
            <Text style={styles.scannerDeniedText}>Loading camera...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible animationType="slide">
        <View style={styles.scannerWrap}>
          <View style={styles.scannerDenied}>
            <Text style={styles.scannerDeniedText}>
              Camera permission is required to scan QR codes
            </Text>
            <Pressable onPress={requestPermission} style={styles.permissionButton}>
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible animationType="slide">
      <View style={styles.scannerWrap}>
        <View style={styles.scannerHeader}>
          <Text style={styles.scannerTitle}>Scan QR Code</Text>
          <Pressable onPress={onClose}>
            <Feather name="x" size={24} color="#fff" />
          </Pressable>
        </View>

        <CameraView
          style={{ flex: 1 }}
          facing="back"
          onBarcodeScanned={
            scanned
              ? undefined
              : ({ data }) => {
                  setScanned(true);
                  onScanned(data);
                  setTimeout(() => setScanned(false), 2000);
                }
          }
        >
          <View style={styles.frameCenter}>
            <View style={styles.frame} />
          </View>
          <View style={styles.scannerHintWrap}>
            <Text style={styles.scannerHint}>Point your camera at a QR code</Text>
          </View>
        </CameraView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 28, color: colors.textPrimary, fontWeight: '700', marginBottom: 8 },
  
  userBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.cardBg,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  userText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  
  subtitle: { 
    fontSize: 18, 
    color: colors.textPrimary, 
    fontWeight: '600', 
    marginTop: 20,
    marginBottom: 8,
  },
  
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
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
    backgroundColor: 'rgba(0, 0, 0, 0.95)', 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20,
  },
  
  modalCard: { 
    backgroundColor: colors.cardBg, 
    padding: 24, 
    borderRadius: 18, 
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  
  modalTitle: { 
    color: colors.textPrimary, 
    fontSize: 20, 
    fontWeight: '700',
  },

  accountInfo: {
    marginBottom: 20,
    alignItems: 'center',
  },
  
  accountName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  
  accountEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  
  accountProgress: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },

  qrContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  
  qrInstruction: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },

  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    gap: 8,
  },
  
  navButtonDisabled: {
    opacity: 0.4,
  },
  
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  
  navButtonTextDisabled: {
    color: colors.textSecondary,
  },

  // Scanner styles
  scannerWrap: { flex: 1, backgroundColor: '#000' },
  
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
  },
  
  scannerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  
  scannerDenied: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  
  scannerDeniedText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  
  permissionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  
  permissionButtonText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#000' 
  },
  
  frameCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  frame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: colors.primary,
    borderRadius: 16,
  },
  
  scannerHintWrap: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  
  scannerHint: {
    fontSize: 16,
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
});