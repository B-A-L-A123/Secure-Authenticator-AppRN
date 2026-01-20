import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import React, { JSX, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

// ===== Types =====
interface Account {
  id: number;
  name: string;
  email: string;
  secret: string;
}
interface User { id: string; }
interface ParsedOTPAuth { secret: string; issuer: string; label: string; }

interface AccountCardProps extends Account {
  timeLeft: number;
  onDelete: () => void;
}
interface FabSubButtonProps {
  icon: JSX.Element;
  label: string;
  onPress: () => void;
}
interface QRScannerProps {
  onScanned: (data: string) => void;
  onClose: () => void;
}
interface ManualEntryModalProps {
  onSave: (name: string, email: string, secret: string) => void;
  onClose: () => void;
}

const colors = {
  appBg: '#000000',
  cardBg: '#111111',
  cardBorder: '#2a2a2a',
  textStrong: '#e6e6e6',
  textDim: '#9a9a9a',
  textMuted: '#666666',
  accent: '#bfc3c7',
  accentDark: '#8b8f94',
  success: '#22c55e',
  inputBg: '#1a1a1a',
  cardBg1: '#1a1a1a',
  accent1: '#e6e6e6',
};

// ===== TIME SYNCHRONIZATION =====
let timeOffset = 0;

function getSyncedTime(): number {
  return Math.floor(Date.now() / 1000) + timeOffset;
}

async function syncTime(): Promise<void> {
  try {
    const startTime = Date.now();
    const response = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC');
    const roundTripTime = (Date.now() - startTime) / 2;
    
    const data = await response.json();
    const serverTime = Math.floor(new Date(data.datetime).getTime() / 1000);
    const localTime = Math.floor(Date.now() / 1000);
    
    timeOffset = serverTime - localTime + Math.floor(roundTripTime / 1000);
    console.log(`Time synced. Offset: ${timeOffset} seconds`);
    
    await AsyncStorage.setItem('time_offset', timeOffset.toString());
  } catch (error) {
    console.log('Time sync failed, using local time:', error);
    try {
      const saved = await AsyncStorage.getItem('time_offset');
      if (saved) {
        timeOffset = parseInt(saved);
        console.log(`Using saved offset: ${timeOffset} seconds`);
      }
    } catch (e) {
      console.log('No saved offset available');
    }
  }
}

// ===== TOTP Generation =====
function generateTOTP(secret: string, time: number): string {
  const counter = Math.floor(time / 30);
  const key = base32Decode(secret.replace(/\s/g, ''));
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigUint64(0, BigInt(counter), false);
  
  const hmac = CryptoJS.HmacSHA1(
    CryptoJS.lib.WordArray.create(Array.from(new Uint8Array(buffer))),
    CryptoJS.lib.WordArray.create(Array.from(key))
  );
  
  const hmacBytes = hmac.words.flatMap(word => [
    (word >> 24) & 0xff,
    (word >> 16) & 0xff,
    (word >> 8) & 0xff,
    word & 0xff,
  ]);
  
  const offset = hmacBytes[hmacBytes.length - 1] & 0x0f;
  const code =
    ((hmacBytes[offset] & 0x7f) << 24) |
    ((hmacBytes[offset + 1] & 0xff) << 16) |
    ((hmacBytes[offset + 2] & 0xff) << 8) |
    (hmacBytes[offset + 3] & 0xff);
  
  return (code % 1000000).toString().padStart(6, '0');
}

function base32Decode(encoded: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  
  for (const char of encoded.toUpperCase()) {
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  
  return new Uint8Array(bytes);
}

function parseOTPAuthURI(uri: string): ParsedOTPAuth {
  const match = uri.match(/otpauth:\/\/totp\/([^?]+)\?secret=([A-Z2-7]+)/i);
  if (!match) {
    return { secret: '', issuer: '', label: '' };
  }
  
  const label = decodeURIComponent(match[1]);
  const secret = match[2];
  const parts = label.split(':');
  
  return {
    secret,
    issuer: parts.length > 1 ? parts[0] : '',
    label: parts.length > 1 ? parts[1] : parts[0],
  };
}

export default function Authenticator() {
  const [fabOpen, setFabOpen] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [showManual, setShowManual] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [timeSynced, setTimeSynced] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      await syncTime();
      setTimeSynced(true);
    })();

    const syncInterval = setInterval(syncTime, 30 * 60 * 1000);
    return () => clearInterval(syncInterval);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const savedUser = await AsyncStorage.getItem('user');
        let uid: string | null = null;

        if (savedUser) {
          const user: User = JSON.parse(savedUser);
          uid = user.id;
        }

        setUserId(uid);
        const key = uid ? `auth_accounts_${uid}` : 'auth_accounts_default';
        setStorageKey(key);

        const stored = await AsyncStorage.getItem(key);
        setAccounts(stored ? JSON.parse(stored) : []);
      } catch (e) {
        console.error('Load error:', e);
        setAccounts([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!storageKey) return;
    (async () => {
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(accounts));
      } catch (e) {
        console.error('Save error:', e);
      }
    })();
  }, [accounts, storageKey]);

  useEffect(() => {
    const update = () => {
      const now = getSyncedTime();
      const remaining = 30 - (now % 30);
      setTimeLeft(remaining === 30 ? 30 : remaining);
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

  const handleQRScanned = (data: string): void => {
    const parsed = parseOTPAuthURI(data);
    const newAcc: Account = {
      id: Date.now(),
      name: parsed.issuer || 'Scanned Account',
      email: parsed.label || 'From QR Code',
      secret: parsed.secret.toUpperCase(),
    };
    setAccounts([newAcc, ...accounts]);
    setShowCamera(false);
  };

  const addAccount = (name: string, email: string, secret: string) => {
    const newAcc: Account = { id: Date.now(), name, email, secret };
    setAccounts(prev => [newAcc, ...prev]);
    setShowManual(false);
    setFabOpen(false);
  };

  const deleteAccount = (id: number) => {
    setAccounts(prev => prev.filter(acc => acc.id !== id));
  };

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
        <Text style={styles.title}>AuthentiGuard</Text>
        <Text style={styles.subtitle}>QR scanning requires Android/iOS.</Text>
        <Text style={styles.textDim}>Open this screen on a device or emulator to use the camera.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.screen}>
          <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            {!timeSynced && (
              <View style={styles.syncBanner}>
                <Text style={styles.syncText}>⏱️ Syncing time...</Text>
              </View>
            )}

            {accounts.length > 0 && (
              <View style={styles.searchContainer}>
                <Feather name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
                <TextInput
                  placeholder="Search accounts..."
                  placeholderTextColor={colors.textMuted}
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                    <Feather name="x" size={18} color={colors.textMuted} />
                  </Pressable>
                )}
              </View>
            )}

            {accounts.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🔐</Text>
                <Text style={styles.emptyTitle}>No accounts yet</Text>
                <Text style={styles.emptyHint}>Tap the + button to add your first account</Text>
              </View>
            ) : filteredAccounts.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🔍</Text>
                <Text style={styles.emptyTitle}>No results found</Text>
                <Text style={styles.emptyHint}>Try searching with a different term</Text>
              </View>
            ) : (
              <View style={{ gap: 12, paddingBottom: 20 }}>
                {filteredAccounts.map(acc => (
                  <AccountCard key={acc.id} {...acc} timeLeft={timeLeft} onDelete={() => deleteAccount(acc.id)} />
                ))}
              </View>
            )}
          </ScrollView>

          {fabOpen && <Pressable style={styles.fabOverlay} onPress={() => setFabOpen(false)} />}

          <View style={styles.fabWrap} pointerEvents="box-none">
            {fabOpen && (
              <View style={{ gap: 10, alignItems: 'flex-end' }}>
                <FabSubButton
                  icon={<Feather name="key" size={20} color="#000000" />}
                  label="Enter Setup Key"
                  onPress={() => { setShowManual(true); setFabOpen(false); }}
                />
                <FabSubButton
                  icon={<Feather name="camera" size={20} color="#000000" />}
                  label="Scan QR Code"
                  onPress={handleScanQR}
                />
              </View>
            )}

            <Pressable
              onPress={() => setFabOpen(!fabOpen)}
              style={({ pressed }) => [styles.fab, { transform: [{ rotate: fabOpen ? '45deg' : '0deg' }], opacity: pressed ? 0.9 : 1 }]}
            >
              <Feather name="plus" size={43} color="#eee3e3" />
            </Pressable>
          </View>

          {showCamera && <QRScanner onScanned={handleQRScanned} onClose={() => setShowCamera(false)} />}
          {showManual && <ManualEntryModal onSave={addAccount} onClose={() => setShowManual(false)} />}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// ===== Subcomponents =====
function AccountCard({ id, name, email, secret, timeLeft, onDelete }: AccountCardProps) {
  const code = generateTOTP(secret, getSyncedTime());
  const percentage = (timeLeft / 30) * 100;
  const [copied, setCopied] = useState<boolean>(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const [swiping, setSwiping] = useState<boolean>(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 5,
      onPanResponderGrant: () => setSwiping(true),
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -120));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        setSwiping(false);
        if (gestureState.dx < -80) {
          Animated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: true }).start();
          setTimeout(() => {
            Alert.alert('Delete account', 'Are you sure you want to delete this account?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: onDelete },
            ]);
          }, 100);
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, tension: 50, friction: 7 }).start();
        }
      },
    })
  ).current;

  const copyCode = async (): Promise<void> => {
    if (swiping) return;
    try {
      await Clipboard.setStringAsync(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const circumference = 2 * Math.PI * 20;
  const dashOffset = circumference * (1 - percentage / 100);

  return (
    <View style={{ position: 'relative' }}>
      <View style={styles.deleteBackground} />
      <Animated.View style={[styles.card, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{name[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{name}</Text>
              <Text style={styles.cardSub} numberOfLines={1}>{email}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Pressable onPress={copyCode} style={styles.codePress}>
            <Text style={[styles.codeText, { opacity: copied ? 0.65 : 1 }]}>
              {code.slice(0, 3)} {code.slice(3)}
            </Text>
            {copied ? (
              <View style={styles.copiedToast}>
                <Feather name="check" size={14} color="#0f172a" />
                <Text style={styles.copiedText}>Copied!</Text>
              </View>
            ) : (
              <View style={styles.copyHint}>
                <Feather name="copy" size={18} color={colors.accent} />
              </View>
            )}
          </Pressable>

          <View style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={48} height={48} style={{ transform: [{ rotate: '-90deg' }] }}>
              <Circle cx={24} cy={24} r={20} stroke="rgba(255,255,255,0.1)" strokeWidth={4} fill="none" />
              <Circle
                cx={24} cy={24} r={20} stroke={colors.accent} strokeWidth={4} fill="none"
                strokeDasharray={`${circumference}`} strokeDashoffset={`${dashOffset}`} strokeLinecap="round"
              />
            </Svg>
            <View style={styles.counterCenter}>
              <Text style={styles.counterText}>{timeLeft}</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function FabSubButton({ icon, label, onPress }: FabSubButtonProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      <View style={styles.fabRow}>
        <Text style={styles.fabLabel}>{label}</Text>
        <View style={styles.fabMini}>{icon}</View>
      </View>
    </Pressable>
  );
}

function QRScanner({ onScanned, onClose }: QRScannerProps) {
  const [scanned, setScanned] = useState<boolean>(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (!permission?.granted && requestPermission) {
      requestPermission();
    }
  }, []);

  const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);
    onScanned(data);
  };

  if (!permission) {
    return (
      <Modal visible transparent animationType="fade">
        <View style={styles.scannerWrap}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>Scan QR Code</Text>
            <Pressable onPress={onClose}><Feather name="x" size={24} color="#fff" /></Pressable>
          </View>
          <View style={styles.scannerDenied}>
            <Text style={{ color: '#fff', fontSize: 18 }}>Loading camera...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible transparent animationType="fade">
        <View style={styles.scannerWrap}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>Scan QR Code</Text>
            <Pressable onPress={onClose}><Feather name="x" size={24} color="#fff" /></Pressable>
          </View>
          <View style={styles.scannerDenied}>
            <Text style={{ color: '#fff', fontSize: 18, marginBottom: 16, textAlign: 'center' }}>Camera Permission Required</Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 24, paddingHorizontal: 32 }}>
              We need camera access to scan QR codes for your authenticator accounts.
            </Text>
            <Pressable
              onPress={requestPermission}
              style={({ pressed }) => [styles.permissionButton, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.scannerWrap}>
        <View style={styles.scannerHeader}>
          <Text style={styles.scannerTitle}>Scan QR Code</Text>
          <Pressable onPress={onClose}><Feather name="x" size={24} color="#fff" /></Pressable>
        </View>
        <View style={{ flex: 1 }}>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
          <View style={styles.frameCenter}>
            <View style={styles.frame} />
          </View>
          <View style={styles.scannerHintWrap}>
            <Text style={styles.scannerHint}>
              {scanned ? 'QR Code detected! Processing...' : 'Position QR code within the frame'}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ManualEntryModal({ onSave, onClose }: ManualEntryModalProps) {
  const [key, setKey] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  const handleSave = (): void => {
    if (key.trim()) {
      onSave(name.trim() || 'New Account', email.trim() || 'manually.added@example.com', key.trim());
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalWrap}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Add Account</Text>
          <TextInput
            placeholder="Account Name"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            placeholder="Email or Username"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            placeholder="Setup Key"
            placeholderTextColor={colors.textMuted}
            value={key}
            onChangeText={(t) => setKey(t.toUpperCase())}
            autoCapitalize="characters"
            style={[styles.input, styles.inputMono]}
          />
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            <Pressable onPress={onClose} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, flex: 1 }]}>
              <View style={styles.modalBtnSecondary}>
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </View>
            </Pressable>
            <Pressable onPress={handleSave} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, flex: 1 }]}>
              <View style={styles.modalBtn}>
                <Text style={styles.modalBtnText}>Save</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ===== Styles =====
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.appBg },
  screen: { flex: 1 },
  container: { padding: 20, paddingTop: 16, flexGrow: 1 },
  center: { flex: 1, backgroundColor: colors.appBg, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: '700', color: colors.textStrong, marginBottom: 8 },
  subtitle: { fontSize: 18, color: colors.textDim, marginBottom: 4 },
  textDim: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  
  syncBanner: { backgroundColor: colors.cardBg1, padding: 12, borderRadius: 8, marginBottom: 16 },
  syncText: { color: colors.textDim, fontSize: 14, textAlign: 'center' },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: colors.textStrong, fontSize: 16 },
  
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: colors.textStrong, marginBottom: 8 },
  emptyHint: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardHeader: { marginBottom: 16 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#000' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.textStrong, marginBottom: 2 },
  cardSub: { fontSize: 13, color: colors.textDim },
  cardBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codePress: { flex: 1, position: 'relative' },
  codeText: { fontSize: 32, fontWeight: '700', color: colors.accent1, letterSpacing: 2 },
  copyHint: { position: 'absolute', right: 0, top: 8 },
  copiedToast: {
    position: 'absolute',
    right: 0,
    top: 8,
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  copiedText: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
  counterCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterText: { fontSize: 14, fontWeight: '700', color: colors.textStrong },
  
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 120,
    backgroundColor: '#dc2626',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  fabOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  fabWrap: { position: 'absolute', bottom: 24, right: 24 },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textStrong,
    backgroundColor: colors.cardBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  fabMini: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  scannerWrap: { flex: 1, backgroundColor: '#000' },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
  },
  scannerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  scannerDenied: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  permissionButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: { fontSize: 16, fontWeight: '600', color: '#000' },
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
    borderColor: colors.accent,
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
  
  modalWrap: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalTitle: { fontSize: 22, fontWeight: '700', color: colors.textStrong, marginBottom: 8 },
  input: {
    backgroundColor: colors.inputBg,
    color: colors.textStrong,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  inputMono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  modalBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnText: { fontSize: 16, fontWeight: '600', color: '#000' },
  modalBtnSecondary: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalBtnSecondaryText: { fontSize: 16, fontWeight: '600', color: colors.textStrong },
});