// AuthWrapper.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, View } from 'react-native';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);

  useEffect(() => {
    checkAuthRequirement();

    // Re-authenticate when app comes back to foreground
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = async (nextAppState: string) => {
    if (nextAppState === 'active') {
      const privacyEnabled = await AsyncStorage.getItem('privacyScreenEnabled');
      if (privacyEnabled === 'true') {
        setIsAuthenticated(false);
        await authenticate();
      }
    }
  };

  const checkAuthRequirement = async () => {
    try {
      const privacyScreenEnabled = await AsyncStorage.getItem('privacyScreenEnabled');
      
      if (privacyScreenEnabled === 'true') {
        setAuthRequired(true);
        await authenticate();
      } else {
        setIsAuthenticated(true);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error checking auth requirement:', error);
      setIsAuthenticated(true);
      setIsLoading(false);
    }
  };

  const authenticate = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access the app',
        fallbackLabel: 'Use Device Authentication',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsAuthenticated(true);
      } else {
        // User cancelled or authentication failed
        setIsAuthenticated(false);
        // Retry authentication after a short delay
        setTimeout(() => authenticate(), 1000);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (authRequired && !isAuthenticated) {
    return (
      <View style={styles.authContainer}>
        <Text style={styles.authTitle}>🔒 Authentication Required</Text>
        <Text style={styles.authDescription}>
          Please authenticate to access the app
        </Text>
        <ActivityIndicator size="large" color="#10B981" style={styles.spinner} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 24,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  authDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  spinner: {
    marginTop: 16,
  },
});