import React, { useEffect, useState } from 'react';
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

export const VerificationSuccessScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [garageCode, setGarageCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    executePendingRegistration();
  }, []);

  const executePendingRegistration = async () => {
    try {
      const dataStr = await AsyncStorage.getItem('pendingGarageData');
      if (!dataStr) {
        throw new Error("No pending garage data found. Please contact support.");
      }

      const data = JSON.parse(dataStr);
      
      const { data: authData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const userId = authData.session?.user?.id;
      if (!userId) {
        throw new Error("You are not fully authenticated yet.");
      }

      // Check if they already have a profile to avoid duplicates on refresh
      const { data: existingProfile } = await supabase.from('profiles').select('id').eq('id', userId).single();
      
      if (!existingProfile) {
        // 1. Insert Garage 
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
            owner_user_id: userId,   // ties garage to auth user UUID
          })
          .select()
          .single();

        if (garageError) throw garageError;

        // 2. Insert Profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            garage_id: garageData.id,
            full_name: data.ownerName,
            phone: data.phone,
            role: 'admin'
          });

        if (profileError) throw profileError;

        setGarageCode(garageData.garage_code);
        await AsyncStorage.removeItem('pendingGarageData');
      } else {
         // Profile exists, but maybe they refreshed the page. Try to get the garage code.
         const { data: userProfile } = await supabase.from('profiles').select('garage_id').eq('id', userId).single();
         if (userProfile?.garage_id) {
           const { data: existingGarage } = await supabase.from('garages').select('garage_code').eq('id', userProfile.garage_id).single();
           if (existingGarage) {
             setGarageCode(existingGarage.garage_code);
             await AsyncStorage.removeItem('pendingGarageData');
           }
         }
      }

    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong registering your garage.");
    } finally {
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

        <View style={styles.codeBox}>
          <Text style={styles.codeHash}>#</Text>
          <Text style={styles.codeText}>{garageCode}</Text>
        </View>

        <Text style={styles.instructionText}>
          Give this secure 4-digit code to your Service Advisors, Technicians, and Accountants so they can seamlessly join your digital workspace.
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
