import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import {
  AccountCardProps,
  FabSubButtonProps,
  ManualEntryModalProps,
  QRScannerProps,
  colors
} from '..//../components/Authenticator.types';
import { useAccountCardLogic, useAuthenticatorLogic } from '..//../components/Useauthenticatorlogic';

export default function Authenticator() {
  const {
    fabOpen,
    searchQuery,
    showCamera,
    showManual,
    timeLeft,
    filteredAccounts,
    setFabOpen,
    setSearchQuery,
    setShowCamera,
    setShowManual,
    handleScanQR,
    handleQRScanned,
    addAccount,
    deleteAccount,
  } = useAuthenticatorLogic();

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={colors.appBg} />
        <View style={styles.screen}>
          <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.searchContainer}>
              <Feather name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
              <TextInput
                placeholder="Search accounts..."
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {filteredAccounts.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🔐</Text>
                <Text style={styles.emptyTitle}>
                  {searchQuery ? 'No matches found' : 'No accounts yet'}
                </Text>
                <Text style={styles.emptyHint}>
                  {searchQuery
                    ? 'Try a different search term'
                    : 'Tap the + button to add your first 2FA account'}
                </Text>
              </View>
            ) : (
              filteredAccounts.map(acc => (
                <AccountCard key={acc.id} {...acc} timeLeft={timeLeft} onDelete={() => deleteAccount(acc.id)} />
              ))
            )}
          </ScrollView>

          {fabOpen && <Pressable style={styles.fabOverlay} onPress={() => setFabOpen(false)} />}

          <View style={styles.fabWrap}>
            {fabOpen && (
              <>
                <FabSubButton
                  icon={<Feather name="camera" size={22} color="#000" />}
                  label="Scan QR Code"
                  onPress={handleScanQR}
                />
                <View style={{ height: 12 }} />
                <FabSubButton
                  icon={<Feather name="edit-3" size={22} color="#000" />}
                  label="Enter Manually"
                  onPress={() => {
                    setFabOpen(false);
                    setShowManual(true);
                  }}
                />
                <View style={{ height: 12 }} />
              </>
            )}
            <Pressable onPress={() => setFabOpen(!fabOpen)} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
              <View style={styles.fab}>
                <Feather name={fabOpen ? 'x' : 'plus'} size={28} color="#000" />
              </View>
            </Pressable>
          </View>
        </View>

        {showCamera && <QRScanner onScanned={handleQRScanned} onClose={() => setShowCamera(false)} />}
        {showManual && <ManualEntryModal onSave={addAccount} onClose={() => setShowManual(false)} />}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// ===== Account Card =====
function AccountCard({ id, name, email, secret, timeLeft, onDelete }: AccountCardProps) {
  const { code, copied, copyCode } = useAccountCardLogic(secret, name);
  const deleteAnim = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 10,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          deleteAnim.setValue(Math.max(gestureState.dx, -120));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -80) {
          Animated.timing(deleteAnim, {
            toValue: -120,
            duration: 200,
            useNativeDriver: true,
          }).start();
        } else {
          Animated.spring(deleteAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleDelete = () => {
    Animated.spring(deleteAnim, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
    onDelete();
  };

  const progress = timeLeft / 30;

  return (
    <View style={{ marginBottom: 12, position: 'relative' }}>
      <View style={styles.deleteBackground}>
        <Pressable onPress={handleDelete} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
          <Feather name="trash-2" size={24} color="#fff" />
        </Pressable>
      </View>

      <Animated.View
        style={[styles.card, { transform: [{ translateX: deleteAnim }] }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.cardTitle}>{name}</Text>
              <Text style={styles.cardSub}>{email}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Pressable onPress={copyCode} style={styles.codePress}>
            <Text style={styles.codeText}>{code}</Text>
            {copied && (
              <View style={styles.copiedToast}>
                <Feather name="check" size={14} color="#0f172a" />
                <Text style={styles.copiedText}>Copied!</Text>
              </View>
            )}
          </Pressable>

          <View style={{ width: 48, height: 48, position: 'relative' }}>
            <Svg width={48} height={48} viewBox="0 0 48 48">
              <Circle cx={24} cy={24} r={20} stroke={colors.cardBorder} strokeWidth={4} fill="none" />
              <Circle
                cx={24}
                cy={24}
                r={20}
                stroke={timeLeft <= 5 ? '#ef4444' : colors.accent}
                strokeWidth={4}
                fill="none"
                strokeDasharray={`${2 * Math.PI * 20}`}
                strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress)}`}
                strokeLinecap="round"
                transform="rotate(-90 24 24)"
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

// ===== FAB Sub Button =====
function FabSubButton({ icon, label, onPress }: FabSubButtonProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
      <View style={styles.fabRow}>
        <Text style={styles.fabLabel}>{label}</Text>
        <View style={styles.fabMini}>{icon}</View>
      </View>
    </Pressable>
  );
}

// ===== QR Scanner =====
function QRScanner({ onScanned, onClose }: QRScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState<boolean>(false);

  if (!permission) {
    return (
      <View style={styles.scannerWrap}>
        <View style={styles.scannerDenied}>
          <Text style={{ color: '#fff', fontSize: 16, marginBottom: 16 }}>Loading camera...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.scannerWrap}>
        <View style={styles.scannerDenied}>
          <Text style={{ color: '#fff', fontSize: 16, marginBottom: 16, textAlign: 'center' }}>
            Camera permission is required to scan QR codes
          </Text>
          <Pressable onPress={requestPermission}>
            <View style={styles.permissionButton}>
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </View>
          </Pressable>
        </View>
      </View>
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

// ===== Manual Entry Modal =====
function ManualEntryModal({ onSave, onClose }: ManualEntryModalProps) {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [key, setKey] = useState<string>('');

  const handleSave = () => {
    if (!name.trim() || !email.trim() || !key.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }
    const cleanKey = key.replace(/\s/g, '').toUpperCase();
    if (!/^[A-Z2-7]+=*$/.test(cleanKey)) {
      Alert.alert('Invalid Key', 'The setup key must be a valid Base32 string.');
      return;
    }
    onSave(name.trim(), email.trim(), cleanKey);
  };

  return (
    <Modal visible transparent animationType="fade">
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
    borderRadius: 30,
    paddingHorizontal: 6,
    paddingVertical: 0,
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
    width: 54,
    height: 54,
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
  fabRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
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
  clearButton: {
    backgroundColor: '#7f1d1d',
    paddingVertical: 10,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14, 
  },
  modalBtnSecondaryText: { fontSize: 16, fontWeight: '600', color: colors.textStrong },
});