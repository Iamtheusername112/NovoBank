'use client';

import { ChakraProvider } from '@chakra-ui/react';
import { theme } from './theme';
import { useEffect } from 'react';

export function Providers({ children }) {
  useEffect(() => {
    // Disable browser notifications completely
    if (typeof window !== 'undefined' && 'Notification' in window) {
      // Override Notification.requestPermission to always deny
      Notification.requestPermission = () => Promise.resolve('denied');
      
      // Prevent creating new Notification instances
      const OriginalNotification = window.Notification;
      window.Notification = function() {
        console.warn('Browser notifications are disabled');
        return null;
      };
      
      // Set up the overridden Notification
      window.Notification.requestPermission = () => Promise.resolve('denied');
      
      // Try to set permission, but don't fail if it's read-only
      try {
        Object.defineProperty(window.Notification, 'permission', {
          value: 'denied',
          writable: false,
          configurable: false,
        });
      } catch (e) {
        // Permission property might be read-only, that's okay
        console.log('Could not set Notification.permission (read-only)');
      }
      
      // Copy static properties safely
      try {
        Object.setPrototypeOf(window.Notification, OriginalNotification);
        Object.keys(OriginalNotification).forEach(key => {
          if (key !== 'requestPermission' && key !== 'permission') {
            try {
              const descriptor = Object.getOwnPropertyDescriptor(OriginalNotification, key);
              if (descriptor && descriptor.writable !== false) {
                window.Notification[key] = OriginalNotification[key];
              }
            } catch (e) {
              // Skip read-only properties
            }
          }
        });
      } catch (e) {
        // If copying properties fails, that's okay - the main functionality is disabled
        console.log('Could not copy all Notification properties');
      }
    }
  }, []);

  return (
    <ChakraProvider theme={theme}>
      {children}
    </ChakraProvider>
  );
}

