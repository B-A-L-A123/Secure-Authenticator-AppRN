import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen'; // ✅ Critical import
import { createContext, useContext, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import AuthWrapper from '../Security/Auth';
import ScreenshotProtection from '../Security/ScreenshotProdection';
import { setupAuthListener, signOutUser, User } from '../components/Auth';
import AuthScreen from '../components/AuthScreen';
import Sidebar from '../components/Sidebar';
import Header from '../components/header';
import '../global.css';
import SecureAuthenticatorLogo from './(tabs)/SecureAuthenticatorLogo';
// ✅ FIXED PATH (removed /tabs/)
// PREVENT native splash from hiding automatically
SplashScreen.preventAutoHideAsync();

/* ---------------- CONTEXT ---------------- */
export const UserContext = createContext<{
  user: User | null;
  setUser: (user: User | null) => void;
}>({
  user: null,
  setUser: () => {},
});
export const useUser = () => useContext(UserContext);

/* ---------------- COLORS ---------------- */
const colors = {
  bg: '#f1f7f7',
  card: '#2f3031',
  text: '#EAE0CF',
  border: '#94B4C1',
  modalBg: '#1a1a1a',
};

/* ---------------- ROOT LAYOUT ---------------- */
export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Controls React splash screen

  /* ---------------- LOAD USER & SYNC WITH FIREBASE ---------------- */
  useEffect(() => {
    let splashHidden = false;

    const loadUser = async () => {
      try {
        const savedUser = await AsyncStorage.getItem('user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } catch (err) {
        console.error('Failed to load user', err);
      } finally {
        // ONLY hide native splash AFTER React logo animation completes
        // (handled in SecureAuthenticatorLogo's onFinish callback)
      }
    };

    loadUser();

    const unsubscribe = setupAuthListener((userData: User | null) => {
      setUser(userData);
      if (userData) setShowLogin(false);
    });

    return () => {
      unsubscribe();
      // Ensure splash hides if component unmounts unexpectedly
      if (!splashHidden) {
        SplashScreen.hideAsync().catch(() => {});
      }
    };
  }, []);

  // ✅ CRITICAL: Hide native splash ONLY after React logo animation finishes
  const handleSplashFinish = () => {
    setIsLoading(false);
    SplashScreen.hideAsync().catch(() => {});
  };

  /* ---------------- SIGN OUT ---------------- */
  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const result = await signOutUser();
            if (result.success) {
              setUser(null);
              Alert.alert('Signed Out', 'You have been signed out successfully');
            } else {
              Alert.alert('Error', result.error || 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  /* ---------------- SIDEBAR MENU ---------------- */
  const menuItems = [
    { id: 'authenticator', label: 'Authenticator', icon: 'lock' as const },
    { id: 'PasswordGenerator', label: 'Password Generator', icon: 'key' as const },
    { id: 'Import-export', label: 'Import/Export', icon: 'download' as const },
    { id: 'settings', label: 'Settings', icon: 'settings' as const },
  ];

  const handleMenuItemPress = (id: string) => {
    setSidebarOpen(false);
    switch (id) {
      case 'authenticator':
        router.push('/(tabs)/authenticator');
        break;
      case 'PasswordGenerator':
        router.push('/(tabs)/PasswordGenerator');
        break;
      case 'Import-export':
        router.push('/(tabs)/Import-export');
        break;
      case 'settings':
        router.push('/(tabs)/Settings');
        break;
    }
  };

  /* ---------------- SPLASH SCREEN ---------------- */
  if (isLoading) {
    return <SecureAuthenticatorLogo onFinish={handleSplashFinish} />;
  }

  /* ---------------- MAIN UI ---------------- */
  return (
    <UserContext.Provider value={{ user, setUser }}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <AuthWrapper>
      <ScreenshotProtection>

      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          {sidebarOpen && (
            <TouchableOpacity
            style={styles.sidebarOverlay}
              activeOpacity={1}
              onPress={() => setSidebarOpen(false)}
            />
          )}
          
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            user={user}
            onSignOut={handleSignOut}
            menuItems={menuItems}
            onMenuItemPress={handleMenuItemPress}
          />

          <Header
            onMenuPress={() => setSidebarOpen(true)}
            user={user}
            onSignIn={() => setShowLogin(true)}
            onSignOut={handleSignOut}
          />

          <View style={{ flex: 1 }} pointerEvents={sidebarOpen ? 'none' : 'auto'}>
            {!user && pathname === '/(tabs)/authenticator' ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🔒</Text>
                <Text style={styles.title}>Sign in to use Authenticator</Text>
                <Text style={styles.subtitle}>
                  Your authenticator codes will be synced securely
                </Text>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => setShowLogin(true)}
                >
                  <Text style={styles.primaryBtnText}>Sign In</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Stack screenOptions={{ headerShown: false }} />
            )}
          </View>

          {/* AUTH MODAL */}
          <Modal
            visible={showLogin}
            transparent
            animationType="fade"
            onRequestClose={() => setShowLogin(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <TouchableOpacity
                  onPress={() => setShowLogin(false)}
                  style={styles.closeButton}
                  >
                  <Feather name="x" size={24} color="#e6e6e6" />
                </TouchableOpacity>
                <AuthScreen />
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      </SafeAreaProvider>
      </ScreenshotProtection>
      </AuthWrapper>
    </UserContext.Provider>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  sidebarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 999,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginVertical: 16,
    paddingHorizontal: 32,
    fontSize: 14,
  },
  primaryBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  primaryBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.modalBg,
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 450,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});