import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { AdvisorDashboardScreen } from './AdvisorDashboardScreen';
import { TechnicianDashboardScreen } from './TechnicianDashboardScreen';
import { AccountantDashboardScreen } from './AccountantDashboardScreen';
import { Button } from '../components/Button';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

// Types of expected roles in our database
type UserRole = 'admin' | 'service_advisor' | 'technician' | 'accountant' | null;

interface UserProfile {
  id: string;
  role: UserRole;
  full_name: string;
  garage_id: string;
  phone: string;
}

// Redirects admin to the OwnerDashboard screen after mount
const OwnerRedirect = ({
  navigation, profile,
}: {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
  profile: UserProfile;
}) => {
  useEffect(() => {
    navigation.replace('OwnerDashboard', {
      phone:    profile.phone,
      fullName: profile.full_name,
      userId:   profile.id,
    });
  }, []);
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#080E18' }}>
      <ActivityIndicator size="large" color="#3B82F6" />
    </View>
  );
};

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error("No authenticated user found.");

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, role, garage_id, phone')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      setProfile(profileData as UserProfile);

    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to load your profile. Please sign out and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#208AEF" />
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{errorMsg}</Text>
        <Button title="Sign Out" onPress={() => supabase.auth.signOut()} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Profile not found.</Text>
        <Button title="Sign Out" onPress={() => supabase.auth.signOut()} />
      </View>
    );
  }

  // --- SMART ROUTING BASED ON ROLE ---

  if (profile.role === 'admin') {
    // Navigate to the multi-branch owner dashboard instead of rendering inline.
    // Use a useEffect to do this after render to avoid doing navigation inside render.
    return <OwnerRedirect navigation={navigation} profile={profile} />;
  }

  if (profile.role === 'service_advisor') {
    return (
      <AdvisorDashboardScreen
        userId={profile.id}
        fullName={profile.full_name}
        garageId={profile.garage_id}
        navigation={navigation}
      />
    );
  }

  if (profile.role === 'technician') {
    return (
      <TechnicianDashboardScreen
        userId={profile.id}
        fullName={profile.full_name}
        garageId={profile.garage_id}
        navigation={navigation}
      />
    );
  }

  if (profile.role === 'accountant') {
    return (
      <AccountantDashboardScreen
        userId={profile.id}
        fullName={profile.full_name}
        garageId={profile.garage_id}
        navigation={navigation}
      />
    );
  }

  // Fallback for any unrecognized roles
  return (
    <View style={styles.centerContainer}>
      <Text style={styles.roleTitle}>Role: {profile.role}</Text>
      <Text style={styles.subtitle}>Welcome {profile.full_name}! Your custom dashboard is under development.</Text>
      <Button title="Sign Out" variant="outline" style={{ marginTop: 40 }} onPress={() => supabase.auth.signOut()} />
    </View>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FAFAFA'
  },
  errorText: {
    fontSize: 16,
    color: '#E53E3E',
    marginBottom: 24,
    textAlign: 'center'
  },
  roleTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A202C',
    marginBottom: 12,
    textTransform: 'capitalize'
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 24
  }
});

export default HomeScreen;
