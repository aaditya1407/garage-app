import './src/polyfills';
import 'react-native-gesture-handler';
import { Platform } from 'react-native';
if (Platform.OS !== 'web') {
  require('react-native-url-polyfill/auto');
}

// ── Global error handlers for iOS Safari debugging ────────────────
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.onerror = (message, source, lineno, colno, error) => {
    console.error('[GLOBAL onerror]', message, source, lineno, colno, error);
    return false;
  };
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[GLOBAL unhandledrejection]', event.reason);
  });
}

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// ── Global Paper Theme ─────────────────────────────────────────────
const appTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    background: '#FFFFFF',
    surface: '#FFFFFF',
    outline: '#9E9E9E',
    primary: '#1976D2',
    onSurface: '#212121',
    onSurfaceVariant: '#555555',
    placeholder: '#9E9E9E',
    surfaceDisabled: '#F0F0F0',
    onSurfaceDisabled: '#757575',
    error: '#D32F2F',
  },
};

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider initialMetrics={Platform.OS === 'web' ? undefined : initialWindowMetrics}>
        <PaperProvider theme={appTheme}>
          <NavigationContainer documentTitle={{ formatter: (options, route) => options?.title ? `${options.title} - WorkshopSeva` : 'WorkshopSeva' }}>
            <RootNavigator />
            <StatusBar style="auto" />
          </NavigationContainer>
        </PaperProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
