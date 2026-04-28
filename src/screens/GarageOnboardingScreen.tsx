import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { State, City } from 'country-state-city';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Dropdown } from '../components/Dropdown';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';


// We hardcode Country as India for now based on requirements.
const COUNTRY_CODE = 'IN';

const garageSchema = z.object({
  garageName: z.string().min(1, 'Garage Name is required'),
  ownerName: z.string().min(1, 'Owner Name is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  address: z.string().min(1, 'Address is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  state: z.string().min(1, 'State is required'),
  city: z.string().min(1, 'City is required'),
});

type GarageFormData = z.infer<typeof garageSchema>;
type Props = NativeStackScreenProps<AuthStackParamList, 'GarageOnboarding'>;

export const GarageOnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  
  const { control, handleSubmit, watch, formState: { errors }, resetField } = useForm<GarageFormData>({
    resolver: zodResolver(garageSchema),
  });

  const selectedState = watch("state");

  // Load States for India
  const stateOptions = useMemo(() => {
    return State.getStatesOfCountry(COUNTRY_CODE).map(state => ({
      label: state.name,
      value: state.isoCode,
    }));
  }, []);

  // Load Cities dynamically based on selected state
  const cityOptions = useMemo(() => {
    if (!selectedState) return [];
    return City.getCitiesOfState(COUNTRY_CODE, selectedState).map(city => ({
      label: city.name,
      value: city.name,
    }));
  }, [selectedState]);

  // Reset city if state changes
  useEffect(() => {
    resetField("city");
  }, [selectedState, resetField]);

  const onSubmit = async (data: GarageFormData) => {
    setLoading(true);
    
    try {
      // 1. Locally save data
      await AsyncStorage.setItem('pendingGarageData', JSON.stringify(data));

      // 2. Sign up the user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (authError) throw authError;

      // 3. Issue Email Verification Modal
      setShowVerifyModal(true);
      
    } catch (err: any) {
      console.error(err);
      setErrorModal(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.topRow}>
            <Text style={styles.brandText}>WorkshopSeva</Text>
            <Button
              title="Back to Home"
              variant="outline"
              onPress={() => navigation.navigate('Landing')}
              style={styles.backBtn}
            />
          </View>

          <Text style={styles.title}>Register Garage</Text>
          <Text style={styles.subtitle}>Set up your new workspace as an Admin.</Text>

          <Controller
            control={control}
            name="garageName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Garage Name" placeholder="E.g. Fast Auto Repair" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.garageName?.message} />
            )}
          />

          <Controller
            control={control}
            name="ownerName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Owner Name" placeholder="Your Full Name" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.ownerName?.message} />
            )}
          />

          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Phone Number" placeholder="10 Digit Mobile" keyboardType="phone-pad" maxLength={10} onBlur={onBlur} onChangeText={onChange} value={value} error={errors.phone?.message} />
            )}
          />

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Email Address" placeholder="admin@garage.com" keyboardType="email-address" autoCapitalize="none" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.email?.message} />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Create Password" placeholder="At least 6 characters" secureTextEntry onBlur={onBlur} onChangeText={onChange} value={value} error={errors.password?.message} />
            )}
          />

          <Controller
            control={control}
            name="address"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Address" placeholder="Street Address" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.address?.message} />
            )}
          />

          <Controller
            control={control}
            name="state"
            render={({ field: { onChange, value } }) => (
              <Dropdown label="State (India)" placeholder="Select State" options={stateOptions} value={value} onSelect={onChange} error={errors.state?.message} />
            )}
          />

          <Controller
            control={control}
            name="city"
            render={({ field: { onChange, value } }) => (
              <Dropdown label="City" placeholder={selectedState ? "Select City" : "Select a State first"} options={cityOptions} value={value} onSelect={onChange} error={errors.city?.message} />
            )}
          />

          <Button title="Register Garage" loading={loading} onPress={handleSubmit(onSubmit)} style={styles.submitBtn} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Verify Email Modal */}
      <Modal visible={showVerifyModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalEmoji}>✉️</Text>
            <Text style={styles.modalTitle}>Check your email!</Text>
            <Text style={styles.modalText}>
              We've sent a verification link to your email address. Once verified, come back to the app to receive your unique Garage Code!
            </Text>
            <Button title="Understood" onPress={() => setShowVerifyModal(false)} />
          </View>
        </View>
      </Modal>

      {/* Error Modal */}
      <Modal visible={!!errorModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalEmoji}>⚠️</Text>
            <Text style={styles.modalTitle}>Registration Failed</Text>
            <Text style={styles.modalText}>{errorModal}</Text>
            <Button title="Close" onPress={() => setErrorModal(null)} variant="secondary" />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingVertical: 20 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  brandText: { fontSize: 18, fontWeight: '800', color: '#1A202C' },
  backBtn: { width: 'auto', minWidth: 132, marginVertical: 0, paddingVertical: 10, paddingHorizontal: 14 },
  title: { fontSize: 28, fontWeight: '700', color: '#1A202C', marginBottom: 6 },
  subtitle: { fontSize: 16, color: '#718096', marginBottom: 24 },
  submitBtn: { marginTop: 16, marginBottom: 40 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  modalEmoji: { fontSize: 40, marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#1A202C', marginBottom: 8 },
  modalText: { fontSize: 15, color: '#4A5568', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
});
