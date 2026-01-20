// components/header.tsx
import { Feather } from '@expo/vector-icons';
import { Image, MotiView } from 'moti';
import React from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Types
export interface HeaderUser {
  name: string;
  email: string;
  picture?: string;
}

export interface HeaderProps {
  onMenuPress: () => void;
  user: HeaderUser | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isSidebarOpen?: boolean;
  onSidebarClose?: () => void;
}

// SecureAuthenticator color scheme
const colors = {
  bg: '#1a1a1a',
  card: '#222222',
  text: '#e6e6e6',
  textMuted: '#9a9a9a',
  accent: '#bfc3c7',
  border: '#2a2a2a'
};

export default function Header({ 
  onMenuPress, 
  user, 
  onSignIn, 
  onSignOut,
  isSidebarOpen = false,
  onSidebarClose
}: HeaderProps) {
  return (

    //  <SafeAreaProvider>
    //       <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    //         <StatusBar barStyle="light-content" />
    //         <View style={styles.screen}>
              
    <>
      <SafeAreaView
        edges={['top']}
        style={[styles.header, { 
          backgroundColor: colors.card, 
          borderBottomColor: colors.border,
        }]}
      >
         <StatusBar barStyle="light-content" />
        <View style={styles.headerContent}>
          {/* Left Section: Menu + Logo */}
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={onMenuPress}
              style={[styles.menuButton, { backgroundColor: colors.bg }]}
              activeOpacity={0.7}
            >
              <Feather name="menu" size={22} color={colors.accent} />
            </TouchableOpacity>

            <View style={styles.headerLogoContainer}>
              <Feather name="shield" size={25} color={colors.accent} style={{ right: -35 }} />
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Krypta
              </Text>
            </View>
          </View>

          {/* Right Section: User Account */}
          <View style={styles.headerRight}>
            {user ? (
              <MotiView
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 15 }}
                style={styles.headerUserContainer}
              >
                <View style={[styles.headerAvatar, { backgroundColor: colors.bg }]}>
                  {user.picture ? (
                    <Image source={{ uri: user.picture }} style={styles.headerAvatarImage} />
                  ) : (
                    <Text style={[styles.headerAvatarText, { color: colors.accent }]}>
                      {user.name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                
                <View style={styles.headerUserInfo}>
                  <Text style={[styles.headerUserName, { color: colors.text }]} numberOfLines={1}>
                    {user.name}
                  </Text>
                  <Text style={[styles.headerUserEmail, { color: colors.textMuted }]} numberOfLines={1}>
                    {user.email}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={onSignOut}
                  style={[styles.headerActionButton, { backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1 }]}
                  activeOpacity={0.7}
                >
                  <Feather name="log-out" size={16} color={colors.accent} />
                </TouchableOpacity>
              </MotiView>
            ) : (
              <MotiView
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 15 }}
              >
                <TouchableOpacity
                  onPress={onSignIn}
                  style={[styles.signInButton, { backgroundColor: colors.accent }]}
                  activeOpacity={0.8}
                >
                  <Feather name="log-in" size={18} color="#000000" />
                  <Text style={[styles.signInText, { color: '#000000' }]}>
                    Sign In
                  </Text>
                </TouchableOpacity>
              </MotiView>
            )}
          </View>
        </View>
      </SafeAreaView>

      {/* Overlay to block touches when sidebar is open */}
      {isSidebarOpen && onSidebarClose && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={onSidebarClose}
          style={styles.sidebarOverlay}
        />
      )}
    </>
    //       </View>
    //       </SafeAreaView>
    //  </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1.5,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 100
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  logoImage: {
    width: 24,
    height: 24,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    right: -19,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerUserContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: 280,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarImage: {
    width: 38,
    height: 38,
    borderRadius: 12,
  },
  headerAvatarText: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerUserInfo: {
    maxWidth: 150,
  },
  headerUserName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  headerUserEmail: {
    fontSize: 11,
  },
  headerActionButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 30,
    gap: 5,
  },
  signInText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 99,
  },
});