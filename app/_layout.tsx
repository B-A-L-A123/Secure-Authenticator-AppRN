import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { Stack, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import 'react-native-get-random-values';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Sidebar from '../components/Sidebar';
import Header from '../components/header';
import "../global.css";
import AuthWrapper from './(tabs)/Auth';
import ScreenshotProtection from './(tabs)/ScreenshotProdection';
import SecureAuthenticatorLogo from './(tabs)/SecureAuthenticatorLogo';


SplashScreen.preventAutoHideAsync();

WebBrowser.maybeCompleteAuthSession();
  

interface User {
  id: string;
  name: string;
  email: string;
  picture?: string;
}

export const UserContext = createContext<{
  user: User | null;
  setUser: (user: User | null) => void;
}>({
  user: null,
  setUser: () => {},
});

export const useUser = () => useContext(UserContext);

const colors = {
  bg: '#213448',
  card: '#2f3031',
  text: '#EAE0CF',
  border: '#94B4C1'
};

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // 2026 UPDATE: Use Expo Proxy for redirect URI
  const redirectUri = makeRedirectUri({
    scheme: 'secureauthenticatorrn',
    path: 'redirect',
    // useProxy: true  // Required for Expo Go in 2026
  });

  console.log('🔗 Redirect URI:', redirectUri);
  
  // 2026 UPDATE: Web Client ID is now the primary clientId
  const [request, response, promptAsync] = Google.useAuthRequest({
    // Primary client ID (Web Client ID required for 2026)
    clientId: "356401180182-kou09gidb49a45708i62qadvf2t4grcl.apps.googleusercontent.com",
    
    // Platform-specific IDs (optional in 2026, but recommended for production)
    androidClientId: "356401180182-e9na9hppakcc40rlq72vg4jl59sut7iv.apps.googleusercontent.com",
    iosClientId: "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com",
    
    scopes: ['openid', 'profile', 'email'],
    
    // 2026 UPDATE: Auto-exchange for access token
    shouldAutoExchangeCode: true,
    
    redirectUri: redirectUri,
  });

  useEffect(() => {
    setTimeout(() => {
      SplashScreen.hideAsync();
    }, 300);
  }, []);

  // 2026 UPDATE: Load persisted user on mount
  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        console.log('✅ Got access token');
        fetchUserInfo(authentication.accessToken);
      }
    } else if (response?.type === 'error') {
      console.error('❌ Auth Error:', response.error);
      
      let errorMessage = 'Failed to sign in. ';
      if (response.error?.message) {
        errorMessage += response.error.message;
      }
      if (response.params?.error_description) {
        errorMessage += '\n\n' + response.params.error_description;
      }
      
      Alert.alert('Authentication Error', errorMessage);
    }
  }, [response]);

  const loadUser = async () => {
    try {
      const savedUser = await AsyncStorage.getItem('user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const fetchUserInfo = async (token: string) => {
    try {
      const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const userInfo = await res.json();
      
      const userData: User = {
        id: userInfo.id,
        name: userInfo.name ?? userInfo.email.split('@')[0],
        email: userInfo.email,
        picture: userInfo.picture,
      };
      
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      setShowLogin(false);
      
      Alert.alert('Success', `Welcome, ${userData.name}!`);
    } catch (error) {
      console.error('❌ Error fetching user info:', error);
      Alert.alert('Error', 'Failed to fetch user information. Please try again.');
    }
  };

  const handleSignIn = async () => { 
    try {
      if (!request) {
        console.log('⏳ Auth request not ready yet');
        return;
      }
      
      console.log('🚀 Starting sign in...');
      console.log('📱 Platform:', Platform.OS);
      console.log('🔗 Using redirect URI:', redirectUri);
      
      await promptAsync();
    } catch (error) {
      console.error('❌ Sign in error:', error);
      Alert.alert('Error', 'Failed to start sign in process. Please try again.');
    }
  };

  const handleSignOut = async () => {
    try { 
      await AsyncStorage.removeItem('user'); 
      setUser(null);
      Alert.alert('Signed Out', 'You have been signed out successfully');
    } catch (error) { 
      console.error('Sign out error:', error); 
    }
  };

  const menuItems = [
    { id: 'authenticator', label: 'Authenticator', icon: 'lock' as const },
    // { id: 'website', label: 'URL Scanner', icon: 'globe' as const },
    { id: 'PasswordGenerator', label: 'Password Generator', icon: 'key' as const },
    { id: 'settings', label: 'Settings', icon: 'settings' as const },
    { id: 'Import-export', label: 'Import/Export', icon: 'download'  as const },
  ];

  const handleMenuItemPress = (id: string) => {
    switch (id) {
      case 'authenticator':
        router.push('/(tabs)/authenticator');
        break;
      // case 'website':
      //   router.push('/(tabs)/website-check');
      //   break;
      case 'settings':
        router.push('/(tabs)/Settings');
        break;
      case 'PasswordGenerator':
        router.push('/(tabs)/PasswordGenerator');
        break;
      case 'Import-export':
        router.push('/(tabs)/Import-export');
        break;
      default:
        break;
    }
  };

  if (isLoading) {
    return <SecureAuthenticatorLogo onFinish={() => setIsLoading(false)} />;
  }

  return (
    <AuthWrapper>
      <ScreenshotProtection>
        <SafeAreaProvider>
          <UserContext.Provider value={{ user, setUser }}>
            <View style={{ flex: 1, backgroundColor: colors.bg, flexDirection: 'column' }}>
              {/* Sidebar Overlay - blocks touches when sidebar is open */}
              {sidebarOpen && (
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => setSidebarOpen(false)}
                  style={styles.sidebarOverlay}
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
                  <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                    <Text style={{ fontSize: 60, marginBottom: 16 }}>🔐</Text>
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>
                      Sign in to use Authenticator
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 24, textAlign: 'center', paddingHorizontal: 32 }}>
                      Your authenticator codes will be synced to your account
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowLogin(true)}
                      style={{
                        paddingHorizontal: 24, 
                        paddingVertical: 12,
                        backgroundColor: '#3B82F6', 
                        borderRadius: 12,
                      }}
                    >
                      <Text style={{ fontWeight: '600', color: 'white' }}>Sign In</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Stack screenOptions={{ headerShown: false }} />
                )}
              </View>

              <Modal visible={showLogin} transparent animationType="fade">
                <View style={{
                  flex: 1, 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.7)', 
                  padding: 16,
                }}>
                  <View style={{
                    backgroundColor: colors.card, 
                    width: '100%', 
                    maxWidth: 384,
                    borderRadius: 24, 
                    padding: 32, 
                    borderWidth: 1, 
                    borderColor: 'rgba(255,255,255,0.1)',
                  }}>
                    <Text style={{ 
                      fontSize: 24, 
                      fontWeight: 'bold', 
                      color: '#cfced3', 
                      marginBottom: 8 
                    }}>
                      Sign in
                    </Text>
                    <Text style={{ 
                      color: 'rgba(255,255,255,0.7)', 
                      marginBottom: 24 
                    }}>
                      Sign in to sync your authenticator accounts
                    </Text>

                    <TouchableOpacity
                      onPress={handleSignIn}
                      disabled={!request}
                      style={{
                        backgroundColor: !request ? '#cccccc' : 'white', 
                        paddingVertical: 14, 
                        paddingHorizontal: 24,
                        borderRadius: 12, 
                        marginBottom: 16, 
                        alignItems: 'center',
                        opacity: !request ? 0.5 : 1,
                      }}
                    >
                      <Text style={{ fontWeight: '600', color: colors.bg, fontSize: 16 }}>
                        {!request ? 'Loading...' : '🔐 Sign in with Google'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setShowLogin(false)}>
                      <Text style={{ 
                        color: 'rgba(255,255,255,0.6)', 
                        textAlign: 'center', 
                        fontSize: 14 
                      }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            </View>
          </UserContext.Provider>
        </SafeAreaProvider>
      </ScreenshotProtection>
    </AuthWrapper>
  );
}

const styles = StyleSheet.create({
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
});