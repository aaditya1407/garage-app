import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { ActivityIndicator, View } from 'react-native';

import { RootStackParamList } from './types';
import { AlertModal } from '../components/AlertModal';

const Stack = createNativeStackNavigator<RootStackParamList>();

// ── Deferred screen loading ─────────────────────────────────────────
// All screen imports use inline require() so they load at RENDER time
// (shallow stack) instead of module evaluation time (deep stack).
// iOS Safari has a ~3 000 frame call stack limit vs Chrome's ~15 000.

// Authenticated app screens (shared between admin and staff)
const AppScreens = () => (
  <>
    <Stack.Screen name="CustomerList" component={require('../screens/customers/CustomerListScreen').CustomerListScreen} options={{ headerShown: true, title: 'Customers' }} />
    <Stack.Screen name="CustomerForm" component={require('../screens/customers/CustomerFormScreen').CustomerFormScreen} options={{ headerShown: true, title: 'Add Customer' }} />
    <Stack.Screen name="CustomerHistory" component={require('../screens/customers/CustomerHistoryScreen').CustomerHistoryScreen} options={{ headerShown: true, title: 'Customer History' }} />
    <Stack.Screen name="VehicleList" component={require('../screens/vehicles/VehicleListScreen').VehicleListScreen} options={{ headerShown: true, title: 'Vehicles' }} />
    <Stack.Screen name="VehicleForm" component={require('../screens/vehicles/VehicleFormScreen').VehicleFormScreen} options={{ headerShown: true, title: 'Add Vehicle' }} />
    <Stack.Screen name="JobCardForm" component={require('../screens/jobcards/JobCardScreen').JobCardScreen} options={{ headerShown: true, title: 'Job Card Intake' }} />
    <Stack.Screen name="JobCardList" component={require('../screens/jobcards/JobCardListScreen').JobCardListScreen} options={{ headerShown: true, title: 'Active Jobs' }} />
    <Stack.Screen name="JobCardDetails" component={require('../screens/jobcards/JobCardDetailsScreen').JobCardDetailsScreen} options={{ headerShown: true, title: 'Job Workspace' }} />
    <Stack.Screen name="InventoryList" component={require('../screens/inventory/InventoryScreen').InventoryScreen} options={{ headerShown: true, title: 'Parts Inventory' }} />
    <Stack.Screen name="InventoryForm" component={require('../screens/inventory/InventoryFormScreen').InventoryFormScreen} options={({ route }) => ({ headerShown: true, title: (route.params as any)?.item ? 'Edit Part' : 'Add Part' })} />
    <Stack.Screen name="BillingQueue" component={require('../screens/billing/BillingQueueScreen').BillingQueueScreen} options={{ headerShown: true, title: 'Billing Queue' }} />
    <Stack.Screen name="BillingForm" component={require('../screens/billing/BillingScreen').BillingScreen} options={{ headerShown: true, title: 'Generate Bill' }} />
    <Stack.Screen name="InvoiceList" component={require('../screens/billing/InvoiceListScreen').InvoiceListScreen} options={{ headerShown: true, title: 'Invoice History' }} />
    <Stack.Screen name="CreateInvoice" component={require('../screens/billing/CreateInvoiceScreen').CreateInvoiceScreen} options={{ headerShown: true, title: 'New Invoice' }} />
    <Stack.Screen name="StaffList" component={require('../screens/staff/StaffListScreen').StaffListScreen} options={{ headerShown: true, title: 'Manage Staff' }} />
    <Stack.Screen name="StaffForm" component={require('../screens/staff/StaffFormScreen').StaffFormScreen} options={({ route }) => ({ headerShown: true, title: (route.params as any)?.staff ? 'Edit Staff' : 'Add Staff' })} />
    <Stack.Screen name="BranchManager" component={require('../screens/BranchManagerScreen').BranchManagerScreen} options={{ headerShown: true, title: 'Manage Branches' }} />
    <Stack.Screen name="BranchForm" component={require('../screens/BranchFormScreen').BranchFormScreen} options={{ headerShown: true, title: 'Add New Garage' }} />
    <Stack.Screen name="OwnerDashboard" component={require('../screens/OwnerDashboardScreen').OwnerDashboardScreen} options={{ headerShown: false }} />
    <Stack.Screen name="BranchDashboard" component={require('../screens/BranchDashboardScreen').BranchDashboardScreen} options={{ headerShown: false }} />
  </>
);

// Capture the launch URL hash and parameters synchronously as soon as the module is loaded.
// This avoids issues where React Navigation or Expo Router clears the hash from the browser URL during initialization.
let launchHash = '';
let launchHref = '';
if (typeof window !== 'undefined' && window.location) {
  launchHash = window.location.hash || '';
  launchHref = window.location.href || '';
}

const getLaunchParam = (param: string): string => {
  try {
    const hashParams = new URLSearchParams(launchHash.substring(1));
    let val = hashParams.get(param);
    if (val) return val;
    const queryParams = new URLSearchParams(launchHref.split('?')[1] || '');
    val = queryParams.get(param);
    if (val) return val;
  } catch (e) {
    console.error('Failed to parse launch parameter:', e);
  }
  return '';
};

const launchErrorCode = getLaunchParam('error_code');
const launchErrorDesc = getLaunchParam('error_description') || getLaunchParam('error');
const isLaunchRecovery = launchHash.includes('type=recovery') || launchHref.includes('type=recovery');

export const RootNavigator = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [staffSession, setStaffSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPendingData, setHasPendingData] = useState(false);
  const [loginMode, setLoginMode] = useState<'admin' | 'staff'>('admin');
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(isLaunchRecovery);
  const [alertVisible, setAlertVisible] = useState(!!(launchErrorCode || launchErrorDesc));
  const [alertTitle, setAlertTitle] = useState(launchErrorCode || launchErrorDesc ? 'Link Expired or Invalid' : '');
  const [alertMessage, setAlertMessage] = useState(
    launchErrorDesc
      ? launchErrorDesc.replace(/\+/g, ' ')
      : launchErrorCode
      ? 'This password reset link is invalid or has expired. Please request a new one.'
      : ''
  );

  const checkSessions = async () => {
    // Check staff session from AsyncStorage
    const staffStr = await AsyncStorage.getItem('staffSession');
    if (staffStr) {
      try {
        setStaffSession(JSON.parse(staffStr));
      } catch (e) {
        console.error('Failed to parse staff session:', e);
        await AsyncStorage.removeItem('staffSession');
        setStaffSession(null);
      }
    } else {
      setStaffSession(null);
    }

    // Check pending data
    const dataStr = await AsyncStorage.getItem('pendingGarageData');
    setHasPendingData(!!dataStr);
    setIsLoading(false);
  };

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    // Handle launch error side effects (sign out and clear URL)
    if (launchErrorCode || launchErrorDesc) {
      if (typeof window !== 'undefined' && window.location && window.history) {
        window.history.replaceState(null, '', window.location.pathname);
      }
      supabase.auth.signOut().catch(() => {});
    }

    // Check Supabase session
    supabase.auth.getSession()
      .then(({ data, error }) => {
        const session = data?.session ?? null;
        if (error) {
          console.warn('Session restore failed, clearing stale session:', error?.message);
          supabase.auth.signOut().catch(() => {});
          AsyncStorage.removeItem('staffSession').catch(() => {});
          setSession(null);
          setStaffSession(null);
          setIsLoading(false);
          return;
        }
        // If the landing URL had an error (e.g. link expired), ignore the restored session to prevent dashboard redirect
        if (launchErrorCode || launchErrorDesc) {
          setSession(null);
        } else {
          setSession(session);
        }
        checkSessions();
      })
      .catch((error) => {
        console.warn('Session restore crashed, showing public landing:', error);
        AsyncStorage.removeItem('staffSession').catch(() => {});
        setSession(null);
        setStaffSession(null);
        setIsLoading(false);
      });

    try {
      const authListener = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
          AsyncStorage.removeItem('staffSession').catch(() => {});
          setSession(null);
          setStaffSession(null);
          setIsLoading(false);
          return;
        }
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecoveringPassword(true);
        }
        // If the landing URL had an error, ignore initial session state triggers to prevent dashboard redirect
        if (launchErrorCode || launchErrorDesc) {
          setSession(null);
        } else {
          setSession(session ?? null);
        }
        checkSessions();
      });
      subscription = authListener.data.subscription;
    } catch (e) {
      console.warn('onAuthStateChange setup failed:', e);
      setIsLoading(false);
    }

    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => {
      subscription?.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleStaffLoginSuccess = async () => {
    await checkSessions();
  };

  const handleStaffLogout = async () => {
    await AsyncStorage.removeItem('staffSession');
    setStaffSession(null);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#208AEF" />
      </View>
    );
  }

  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isRecoveringPassword ? (
        <Stack.Screen name="ResetPassword">
          {(props) => {
            const { ResetPasswordScreen } = require('../screens/ResetPasswordScreen');
            return (
              <ResetPasswordScreen
                {...props}
                onPasswordResetComplete={() => {
                  setIsRecoveringPassword(false);
                }}
                onCancel={async () => {
                  await supabase.auth.signOut().catch(() => {});
                  setIsRecoveringPassword(false);
                }}
              />
            );
          }}
        </Stack.Screen>
      ) : session && session.user ? (
        /* Priority 1: Admin session (Supabase Auth) */
        <>
          {hasPendingData && <Stack.Screen name="VerificationSuccess" component={require('../screens/VerificationSuccessScreen').VerificationSuccessScreen} />}
          <Stack.Screen name="Home" component={require('../screens/HomeScreen').default} />
          {AppScreens()}
        </>
      ) : staffSession ? (
        /* Priority 2: Staff session (AsyncStorage) */
        <>
          <Stack.Screen name="StaffHome">
            {(props) => {
              const { StaffHomeScreen } = require('../screens/StaffHomeScreen');
              return (
                <StaffHomeScreen
                  {...props}
                  staffData={staffSession}
                  onLogout={handleStaffLogout}
                />
              );
            }}
          </Stack.Screen>
          {AppScreens()}
        </>
      ) : (
        /* ── No session: show auth screens directly (flat, no nested navigator) ── */
        /* This avoids a nested Stack.Navigator which doubles the React component  */
        /* tree depth and causes "Maximum call stack size exceeded" on iOS Safari. */
        <>
          {loginMode === 'staff' ? (
            <Stack.Screen name="StaffLogin">
              {() => {
                const { StaffLoginScreen } = require('../screens/StaffLoginScreen');
                return (
                  <StaffLoginScreen
                    onLoginSuccess={handleStaffLoginSuccess}
                    onSwitchToAdmin={() => setLoginMode('admin')}
                    onForgotPassword={() => setLoginMode('admin')}
                  />
                );
              }}
            </Stack.Screen>
          ) : (
            <>
              <Stack.Screen name="Landing" component={require('../screens/LandingScreen').LandingScreen} />
              <Stack.Screen name="Login">
                {(props) => {
                  const { LoginScreen } = require('../screens/LoginScreen');
                  return <LoginScreen {...props} onSwitchToStaff={() => setLoginMode('staff')} />;
                }}
              </Stack.Screen>
              <Stack.Screen
                name="GarageOnboarding"
                component={require('../screens/GarageOnboardingScreen').GarageOnboardingScreen}
                options={{ headerShown: true, title: 'Register Garage' }}
              />
              <Stack.Screen
                name="RegistrationThankYou"
                component={require('../screens/RegistrationThankYouScreen').RegistrationThankYouScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ForgotPassword"
                component={require('../screens/ForgotPasswordScreen').ForgotPasswordScreen}
                options={{ headerShown: false }}
              />
            </>
          )}
        </>
      )}
    </Stack.Navigator>
      <AlertModal
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        variant="error"
        onClose={() => setAlertVisible(false)}
      />
    </>
  );
};
