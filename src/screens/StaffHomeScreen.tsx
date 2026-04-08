import React, { useEffect } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { AdvisorDashboardScreen } from './AdvisorDashboardScreen';
import { TechnicianDashboardScreen } from './TechnicianDashboardScreen';
import { AccountantDashboardScreen } from './AccountantDashboardScreen';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'StaffHome'> & {
  staffData: {
    id: string;
    full_name: string;
    phone: string;
    role: string;
    garage_id: string;
  };
  onLogout: () => void;
};

export const StaffHomeScreen: React.FC<Props> = ({ navigation, staffData, onLogout }) => {
  // Override supabase.auth.signOut so the role dashboards' "Sign Out" buttons
  // work correctly for staff (clearing AsyncStorage instead of Supabase Auth).
  useEffect(() => {
    const originalSignOut = supabase.auth.signOut.bind(supabase.auth);
    (supabase.auth as any).signOut = async () => {
      onLogout();
      return { error: null };
    };
    return () => {
      (supabase.auth as any).signOut = originalSignOut;
    };
  }, [onLogout]);

  const commonProps = {
    userId: staffData.id,
    fullName: staffData.full_name,
    garageId: staffData.garage_id,
    navigation: navigation as any,
  };

  if (staffData.role === 'service_advisor') {
    return <AdvisorDashboardScreen {...commonProps} />;
  }

  if (staffData.role === 'technician') {
    return <TechnicianDashboardScreen {...commonProps} />;
  }

  if (staffData.role === 'accountant') {
    return <AccountantDashboardScreen {...commonProps} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Role: {staffData.role}</Text>
      <Text style={styles.sub}>Welcome {staffData.full_name}!</Text>
      <Button title="Sign Out" variant="outline" style={{ marginTop: 40 }} onPress={onLogout} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#0F1923' },
  title: { fontSize: 24, fontWeight: '800', color: '#F0F4FF', marginBottom: 12, textTransform: 'capitalize' },
  sub: { fontSize: 16, color: '#8BA0BE', textAlign: 'center' },
});
