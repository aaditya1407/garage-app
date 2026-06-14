import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'VerificationSuccess'>;

interface Props {
  navigation: NavigationProp;
}

let activeRegistrationPromise: Promise<void> | null = null;
let registrationError: string | null = null;

export const VerificationSuccessScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [garageCode, setGarageCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    executePendingRegistration();
  }, []);

  const executePendingRegistration = async () => {
    // If another instance of this screen is already running the registration, wait for it to finish.
    if (activeRegistrationPromise) {
      console.log("[VerificationSuccess] A registration is already in progress. Waiting for it...");
      await activeRegistrationPromise;
      if (registrationError) {
        setErrorMsg(registrationError);
      }
      setLoading(false);
      return;
    }

    // Create the promise lock
    let resolvePromise: () => void = () => {};
    activeRegistrationPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    registrationError = null;

    try {
      const { data: authData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const userId = authData.session?.user?.id;
      if (!userId) {
        throw new Error("You are not fully authenticated yet.");
      }

      // 1. Check if profile already exists first. If so, registration is already complete.
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (existingProfile) {
        console.log("[VerificationSuccess] Profile already exists, skipping insertion.");
        await AsyncStorage.removeItem('pendingGarageData');
        return;
      }

      // 2. Fetch pending registration data
      const dataStr = await AsyncStorage.getItem('pendingGarageData');
      if (!dataStr) {
        // If profile doesn't exist AND no pending data is found, it's an error.
        throw new Error("No pending garage data found. Please contact support.");
      }

      const data = JSON.parse(dataStr);

      // 3. Check if a garage already exists for this owner user ID to prevent duplicate branches
      const { data: existingGarage } = await supabase
        .from('garages')
        .select('id, garage_code')
        .eq('owner_user_id', userId)
        .limit(1)
        .maybeSingle();

      let garageId = existingGarage?.id;

      if (!garageId) {
        console.log("[VerificationSuccess] Inserting new garage:", data.garageName);
        // Create the garage
        const { data: garageData, error: garageError } = await supabase
          .from('garages')
          .insert({
            garage_name: data.garageName,
            owner_name: data.ownerName,
            phone: data.phone,
            address: data.address,
            city: data.city,
            state: data.state,
            country: 'India',
            owner_user_id: userId,
          })
          .select()
          .single();

        if (garageError) throw garageError;
        garageId = garageData.id;
        setGarageCode(garageData.garage_code);
      } else {
        console.log("[VerificationSuccess] Garage already exists for this owner, using existing ID:", garageId);
        setGarageCode(existingGarage?.garage_code || null);
      }

      // 4. Create the profile linked to the garage
      console.log("[VerificationSuccess] Inserting new profile for owner.");
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          garage_id: garageId,
          full_name: data.ownerName,
          phone: data.phone,
          role: 'admin'
        });

      if (profileError) throw profileError;

      // 5. Clean up pending data
      await AsyncStorage.removeItem('pendingGarageData');
      console.log("[VerificationSuccess] Registration completed successfully.");

    } catch (err: any) {
      console.error("[VerificationSuccess] Registration failed:", err);
      const msg = err.message || "Something went wrong registering your garage.";
      registrationError = msg;
      setErrorMsg(msg);
    } finally {
      resolvePromise();
      activeRegistrationPromise = null;
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#208AEF" />
        <Text style={styles.loadingText}>Finalizing your Garage...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Oops!</Text>
        <Text style={styles.subtitle}>{errorMsg}</Text>
        <Button title="Go to Dashboard" onPress={() => navigation.replace('Home')} style={{marginTop: 20}} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.title}>Email Verified!</Text>
        <Text style={styles.subtitle}>Your garage has been successfully registered.</Text>

        <Text style={[styles.instructionText, { marginTop: 24 }]}>
          You can now log in and manage your customers, vehicles, job cards, parts, staff, and billing from your dashboard. Add your staff directly from the "Manage Staff" panel.
        </Text>

        <Button 
          title="Continue to Dashboard" 
          onPress={() => navigation.replace('Home')} 
          style={styles.btn}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#718096',
  },
  emoji: { fontSize: 60, marginBottom: 16 },
  title: { fontSize: 32, fontWeight: '800', color: '#1A202C', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#718096', textAlign: 'center', marginBottom: 40 },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF8FF', // Light blue
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#BEE3F8',
    marginBottom: 32,
  },
  codeHash: {
    fontSize: 36,
    color: '#3182CE',
    fontWeight: '700',
    marginRight: 8,
  },
  codeText: {
    fontSize: 48,
    color: '#2B6CB0',
    fontWeight: '800',
    letterSpacing: 8,
  },
  instructionText: {
    fontSize: 15,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  errorText: {
    fontSize: 24,
    color: '#E53E3E',
    fontWeight: 'bold',
    marginBottom: 10
  },
  btn: {
    width: '100%',
  }
});
