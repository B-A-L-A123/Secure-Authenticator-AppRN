// ScreenshotProtection.tsx
import * as ScreenCapture from 'expo-screen-capture';
import React, { useEffect } from 'react';
import { Alert, Platform } from 'react-native';

interface ScreenshotProtectionProps {
  children: React.ReactNode;
}

export default function ScreenshotProtection({ children }: ScreenshotProtectionProps) {
  
  useEffect(() => {
    let subscription: any;

    const enableProtection = async () => {
      try {
        // Prevent screenshots and screen recordings
        await ScreenCapture.preventScreenCaptureAsync();
        
        // Add listener for screenshot attempts (Android only)
        if (Platform.OS === 'android') {
          subscription = ScreenCapture.addScreenshotListener(() => {
            Alert.alert(
              'Screenshot Blocked',
              'Screenshots are not allowed in this app for security reasons.',
              [{ text: 'OK' }]
            );
          });
        }
        
        console.log('Screenshot protection enabled');
      } catch (error) {
        console.error('Error enabling screenshot protection:', error);
      }
    };

    enableProtection();

    // Cleanup: Remove protection when component unmounts
    return () => {
      const disableProtection = async () => {
        try {
          await ScreenCapture.allowScreenCaptureAsync();
          if (subscription) {
            subscription.remove();
          }
          console.log('Screenshot protection disabled');
        } catch (error) {
          console.error('Error disabling screenshot protection:', error);
        }
      };
      
      disableProtection();
    };
  }, []);

  return <>{children}</>;
}