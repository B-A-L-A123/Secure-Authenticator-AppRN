import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

export interface BiometricStatus {
  available: boolean;
  type: string;
}

/**
 * Check if biometric authentication is available on the device
 */
export async function checkBiometricAvailability(): Promise<BiometricStatus> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

  const available = compatible && enrolled;

  let type = 'Screen Lock';
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    type = 'Face ID';
  } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    type = 'Fingerprint';
  }

  return { available, type };
}

/**
 * Trigger biometric/device authentication
 */
export async function authenticate(
  promptMessage: string = 'Authenticate to access the app'
): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Use Device Authentication',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });
    return result.success;
  } catch (error) {
    console.error('Authentication error:', error);
    return false;
  }
}

/**
 * Check if privacy screen is enabled
 */
export async function isPrivacyScreenEnabled(): Promise<boolean> {
  const privacy = await AsyncStorage.getItem('privacyScreenEnabled');
  return privacy === 'true';
}

/**
 * Set privacy screen enabled/disabled
 */
export async function setPrivacyScreen(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem('privacyScreenEnabled', enabled ? 'true' : 'false');
}
