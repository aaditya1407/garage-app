import { Platform } from 'react-native';
if (Platform.OS !== 'web') {
  require('react-native-url-polyfill/auto');
}
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';

// ── Global Paper Theme ─────────────────────────────────────────────
// Forces all TextInput components across every screen to render with a
// clean white background, visible dark labels, and no text-overlap issues
// regardless of the browser / OS colour-scheme preference.
const appTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    // Input fill colour (the actual background of the field)
    background: '#FFFFFF',
    surface: '#FFFFFF',
    // Outlined mode border
    outline: '#9E9E9E',
    // Active outline (focused)
    primary: '#1976D2',
    // Text inside input
    onSurface: '#212121',
    // Label text (floating)
    onSurfaceVariant: '#555555',
    // Placeholder
    placeholder: '#9E9E9E',
    // Disabled field background
    surfaceDisabled: '#F0F0F0',
    onSurfaceDisabled: '#757575',
    // Error
    error: '#D32F2F',
  },
};

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <PaperProvider theme={appTheme}>
        <NavigationContainer>
          <RootNavigator />
          <StatusBar style="auto" />
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
