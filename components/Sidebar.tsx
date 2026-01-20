// components/Sidebar.tsx
import { Feather } from '@expo/vector-icons';
import { MotiView } from 'moti';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Types
export interface SidebarUser {
  name: string;
  email: string;
  picture?: string;
}

export interface MenuItem {
  id: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  badge?: number;
}

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: SidebarUser | null;
  onSignOut: () => void;
  menuItems: MenuItem[];
  onMenuItemPress: (id: string) => void;
}

// SecureAuthenticator color scheme
const colors = {
  bg: '#1a1a1a',
  card: '#111111',
  text: '#e6e6e6',
  textMuted: '#9a9a9a',
  accent: '#bfc3c7',
  border: '#2a2a2a'
};

export default function Sidebar({ 
  isOpen, 
  onClose, 
  user, 
  onSignOut, 
  menuItems,
  onMenuItemPress 
}: SidebarProps) {
  const insets = useSafeAreaInsets();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop Overlay - Now always blocks touches when visible */}
      <MotiView
        style={StyleSheet.absoluteFillObject}
        animate={{
          opacity: isOpen ? 1 : 0,
        }}
        transition={{
          type: 'timing',
          duration: 300,
        }}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={onClose} 
          style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]} 
        />
      </MotiView>

      {/* Sidebar Panel */}
      <MotiView
        style={[styles.sidebar, { backgroundColor: colors.card, borderColor: colors.border }]}
        animate={{
          translateX: isOpen ? 0 : -320,
        }}
        transition={{
          type: 'spring',
          damping: 30,
          stiffness: 300,
        }}
      >
        {/* Header Section with Logo */}
        <View style={[styles.sidebarHeader, { paddingTop: insets.top + 10 }]}>
          <View style={styles.logoContainer}>
            <View style={[styles.logoIcon, { backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1 }]}>
              <Feather name="shield" size={26} color={colors.accent} />
            </View>
            <Text style={[styles.logoText, { color: colors.text }]}>
              Krypta
            </Text>
          </View>
          
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={30} color={colors.accent} />
          </TouchableOpacity>
        </View>

        {/* User Profile Section */}
        {user && (
          <MotiView
            from={{ opacity: 0, translateY: -20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400, delay: 100 }}
            style={[styles.userSection, { borderBottomColor: colors.border }]}
          >
            <View style={[styles.userAvatar, { backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1 }]}>
              {user.picture ? (
                <Image source={{ uri: user.picture }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarText, { color: colors.accent }]}>
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                {user.name}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textMuted }]} numberOfLines={1}>
                {user.email}
              </Text>
            </View>
          </MotiView>
        )}

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <MotiView
              key={item.id}
              from={{ opacity: 0, translateX: -30 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{
                type: 'timing',
                duration: 300,
                delay: 150 + index * 50,
              }}
            >
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onMenuItemPress(item.id);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1 }]}>
                  <Feather name={item.icon} size={20} color={colors.accent} />
                </View>
                <Text style={[styles.menuLabel, { color: colors.text }]}>
                  {item.label}
                </Text>
                {item.badge !== undefined && item.badge > 0 && (
                  <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                    <Text style={[styles.badgeText, { color: '#000000' }]}>{item.badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </MotiView>
          ))}
        </View>

        {/* Sign Out Button */}
        {user && (
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'timing', duration: 400, delay: 400 }}
            style={[styles.signOutContainer, { paddingBottom: insets.bottom + 20 }]}
          >
            <TouchableOpacity
              style={[styles.signOutButton, { borderColor: colors.border }]}
              onPress={() => {
                onSignOut();
                onClose();
              }}
              activeOpacity={0.7}
            >
              <Feather name="log-out" size={20} color={colors.accent} />
              <Text style={[styles.signOutText, { color: colors.text }]}>
                Sign Out
              </Text>
            </TouchableOpacity>
          </MotiView>
        )}
      </MotiView>
    </>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 41,
    bottom: 50,
    width: 310,
    zIndex: 1000,
    shadowColor: '#ffffff',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    borderRadius: 25,
    borderWidth: 1,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
    left: 5,
  },
  closeButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'flex-end',
    left: 5,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    gap: 14,
  },
  userAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 16,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  userEmail: {
    fontSize: 13,
  },
  menuContainer: {
    flex: 1,
    paddingTop: 10,
    paddingHorizontal: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 6,
  },
  menuIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  signOutContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
  },
});