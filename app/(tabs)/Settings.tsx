import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { useEffect, useState } from 'react';

import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

export default function Settings() {
  const [privacyScreenEnabled, setPrivacyScreenEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('');

  useEffect(() => {
    checkBiometricAvailability();
    loadSettings();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      setBiometricAvailable(compatible && enrolled);
      
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('Face ID');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType('Fingerprint');
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        setBiometricType('Iris');
      } else {
        setBiometricType('Screen Lock');
      }
    } catch (error) {
      console.error('Error checking biometric availability:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const privacyScreen = await AsyncStorage.getItem('privacyScreenEnabled');
      setPrivacyScreenEnabled(privacyScreen === 'true');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handlePrivacyScreenToggle = async (value: boolean) => {
    if (!biometricAvailable) {
      Alert.alert(
        'Authentication Not Available',
        'Screen lock, PIN, or biometric authentication is not available on this device.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (value) {
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate to enable privacy screen',
          fallbackLabel: 'Use Device Authentication',
          cancelLabel: 'Cancel',
        });

        if (result.success) {
          setPrivacyScreenEnabled(true);
          await AsyncStorage.setItem('privacyScreenEnabled', 'true');
          Alert.alert('Success', 'Privacy screen enabled successfully');
        } else {
          Alert.alert('Authentication Failed', 'Please try again');
        }
      } catch (error) {
        console.error('Authentication error:', error);
        Alert.alert('Error', 'Failed to enable privacy screen');
      }
    } else {
      Alert.alert(
        'Disable Privacy Screen',
        'Are you sure you want to disable privacy screen protection?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              setPrivacyScreenEnabled(false);
              await AsyncStorage.setItem('privacyScreenEnabled', 'false');
            },
          },
        ]
      );
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>⚙️ Security Settings</Text>
          <Text style={styles.subtitle}>Manage your privacy and security preferences</Text>
        </View>

        {/* Main Settings Card */}
        <View style={styles.mainCard}>
          <Text style={styles.cardTitle}>Privacy & Security</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>🔒 Privacy Screen</Text>
              <Text style={styles.settingDescription}>
                {biometricAvailable
                  ? `When privacy screen is on, access to this app will be restricted by screen lock, PIN or ${biometricType.toLowerCase()}`
                  : 'Authentication not available on this device'}
              </Text>
            </View>
            <Switch
              value={privacyScreenEnabled}
              onValueChange={handlePrivacyScreenToggle}
              disabled={!biometricAvailable}
              trackColor={{ false: '#2a2a2a', true: '#bfc3c7' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Status Card */}
       
        {/* Info Section */}
        <View style={styles.infoSection}>

          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Text style={styles.infoEmoji}>🛡️</Text>
              <Text style={styles.infoCardTitle}>How Privacy Screen Works</Text>
            </View>
            <Text style={styles.infoCardText}>
              When enabled, you'll need to authenticate using your device's {biometricType || 'security method'} every time you open the app. This adds an extra layer of security to protect your sensitive data.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    bottom: 0,
  },
  content: {
    padding: 19,
  },
  header: {
    marginBottom: 19,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 9,
  },
  subtitle: {
    fontSize: 14,
    color: '#9a9a9a',
    marginLeft: 40,
  },
  mainCard: {
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 9,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e6e6e6',
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: 10,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#e6e6e6',
    marginBottom: 6,
  },
  settingDescription: {
    fontSize: 13,
    color: '#9a9a9a',
    lineHeight: 18,
  },
  statusCard: {
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 9,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  statusIcon: {
    fontSize: 20,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22c55e',
  },
  statusDetails: {
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: '#9a9a9a',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e6e6e6',
  },
  statusEnabled: {
    color: '#22c55e',
  },
  statusDisabled: {
    color: '#666666',
  },
  infoSection: {
    gap: 9,
  },
  infoCard: {
    padding: 14,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderStyle: 'dashed',
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 7,
  },
  infoEmoji: {
    fontSize: 15,
  },
  infoCardTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#e6e6e6',
  },
  infoCardText: {
    fontSize: 12,
    color: '#9a9a9a',
    lineHeight: 18,
  },
});