import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import HomeScreen from '../screens/HomeScreen';
import { StaffHomeScreen } from '../screens/StaffHomeScreen';
import { AuthNavigator } from './AuthNavigator';
import { VerificationSuccessScreen } from '../screens/VerificationSuccessScreen';
import { CustomerListScreen } from '../screens/customers/CustomerListScreen';
import { CustomerFormScreen } from '../screens/customers/CustomerFormScreen';
import { CustomerHistoryScreen } from '../screens/customers/CustomerHistoryScreen';
import { VehicleListScreen } from '../screens/vehicles/VehicleListScreen';
import { VehicleFormScreen } from '../screens/vehicles/VehicleFormScreen';
import { JobCardScreen } from '../screens/jobcards/JobCardScreen';
import { JobCardListScreen } from '../screens/jobcards/JobCardListScreen';
import { JobCardDetailsScreen } from '../screens/jobcards/JobCardDetailsScreen';
import { InventoryScreen } from '../screens/inventory/InventoryScreen';
import { InventoryFormScreen } from '../screens/inventory/InventoryFormScreen';
import { BillingQueueScreen } from '../screens/billing/BillingQueueScreen';
import { BillingScreen } from '../screens/billing/BillingScreen';
import { InvoiceListScreen } from '../screens/billing/InvoiceListScreen';
import { StaffListScreen } from '../screens/staff/StaffListScreen';
import { StaffFormScreen } from '../screens/staff/StaffFormScreen';
import { StaffLoginScreen } from '../screens/StaffLoginScreen';
import { ActivityIndicator, View } from 'react-native';

import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Authenticated app screens (shared between admin and staff)
const AppScreens = () => (
  <>
    <Stack.Screen name="CustomerList" component={CustomerListScreen} options={{ headerShown: true, title: 'Customers' }} />
    <Stack.Screen name="CustomerForm" component={CustomerFormScreen} options={{ headerShown: true, title: 'Add Customer' }} />
    <Stack.Screen name="CustomerHistory" component={CustomerHistoryScreen} options={{ headerShown: true, title: 'Customer History' }} />
    <Stack.Screen name="VehicleList" component={VehicleListScreen} options={{ headerShown: true, title: 'Vehicles' }} />
    <Stack.Screen name="VehicleForm" component={VehicleFormScreen} options={{ headerShown: true, title: 'Add Vehicle' }} />
    <Stack.Screen name="JobCardForm" component={JobCardScreen} options={{ headerShown: true, title: 'Job Card Intake' }} />
    <Stack.Screen name="JobCardList" component={JobCardListScreen} options={{ headerShown: true, title: 'Active Jobs' }} />
    <Stack.Screen name="JobCardDetails" component={JobCardDetailsScreen} options={{ headerShown: true, title: 'Job Workspace' }} />
    <Stack.Screen name="InventoryList" component={InventoryScreen} options={{ headerShown: true, title: 'Parts Inventory' }} />
    <Stack.Screen name="InventoryForm" component={InventoryFormScreen} options={({ route }) => ({ headerShown: true, title: (route.params as any)?.item ? 'Edit Part' : 'Add Part' })} />
    <Stack.Screen name="BillingQueue" component={BillingQueueScreen} options={{ headerShown: true, title: 'Billing Queue' }} />
    <Stack.Screen name="BillingForm" component={BillingScreen} options={{ headerShown: true, title: 'Generate Bill' }} />
    <Stack.Screen name="InvoiceList" component={InvoiceListScreen} options={{ headerShown: true, title: 'Invoice History' }} />
    <Stack.Screen name="StaffList" component={StaffListScreen} options={{ headerShown: true, title: 'Manage Staff' }} />
    <Stack.Screen name="StaffForm" component={StaffFormScreen} options={({ route }) => ({ headerShown: true, title: (route.params as any)?.staff ? 'Edit Staff' : 'Add Staff' })} />
  </>
);

export const RootNavigator = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [staffSession, setStaffSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPendingData, setHasPendingData] = useState(false);
  const [loginMode, setLoginMode] = useState<'admin' | 'staff'>('admin');

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
    // Check Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      checkSessions();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      checkSessions();
    });

    return () => subscription.unsubscribe();
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
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Priority 1: Admin session (Supabase Auth) */}
      {session && session.user ? (
        <>
          {hasPendingData && <Stack.Screen name="VerificationSuccess" component={VerificationSuccessScreen} />}
          <Stack.Screen name="Home" component={HomeScreen} />
          {AppScreens()}
        </>
      ) : staffSession ? (
        /* Priority 2: Staff session (AsyncStorage) */
        <>
          <Stack.Screen name="StaffHome">
            {(props) => (
              <StaffHomeScreen
                {...props}
                staffData={staffSession}
                onLogout={handleStaffLogout}
              />
            )}
          </Stack.Screen>
          {AppScreens()}
        </>
      ) : (
        /* No session: show login */
        <Stack.Screen name="Auth">
          {() => {
            if (loginMode === 'staff') {
              return (
                <StaffLoginScreen
                  onLoginSuccess={handleStaffLoginSuccess}
                  onSwitchToAdmin={() => setLoginMode('admin')}
                />
              );
            }
            return (
              <AuthNavigator onSwitchToStaff={() => setLoginMode('staff')} />
            );
          }}
        </Stack.Screen>
      )}
    </Stack.Navigator>
  );
};
