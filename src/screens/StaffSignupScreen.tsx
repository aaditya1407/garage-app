import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Dropdown } from '../components/Dropdown';
import { supabase } from '../lib/supabase';

const staffSchema = z.object({
  garageCode: z.string().length(4, 'Garage Code must be exactly 4 characters'),
  fullName: z.string().min(1, 'Full Name is required'),
  email: z.string().email('Invalid email format'),
  phone: z.string().min(10, 'Valid phone number is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.string().min(1, 'Role is required'),
});

type StaffFormData = z.infer<typeof staffSchema>;

const ROLE_OPTIONS = [
  { label: 'Service Advisor', value: 'service_advisor' },
  { label: 'Technician', value: 'technician' },
  { label: 'Accountant', value: 'accountant' },
];

export const StaffSignupScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
  });

  const onSubmit = async (data: StaffFormData) => {
    setLoading(true);

    try {
      // 1. Verify the Garage Code exists
      const { data: garageData, error: garageQueryError } = await supabase
        .from('garages')
        .select('id, garage_name')
        .eq('garage_code', data.garageCode)
        .single();
      
      if (garageQueryError || !garageData) {
        throw new Error("Invalid Garage Code. Please ask your administrator for the correct 4-digit code.");
      }

      // 2. Sign up the user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error("Could not retrieve user ID after signup.");

      // 3. Insert Profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          garage_id: garageData.id,
          full_name: data.fullName,
          phone: data.phone,
          role: data.role
        });

      if (profileError) throw profileError;

      Alert.alert(
        "Welcome Aboard!",
        `You have successfully joined ${garageData.garage_name}.`,
        [{ text: "OK" }]
      );
      
    } catch (err: any) {
      console.error(err);
      Alert.alert("Registration Failed", err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Join a Garage</Text>
          <Text style={styles.subtitle}>Enter your details and the 4-digit code provided by your admin.</Text>

          <Controller
            control={control}
            name="garageCode"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input 
                label="4-Digit Garage Code" 
                placeholder="E.g. 8392" 
                maxLength={4}
                autoCapitalize="characters"
                onBlur={onBlur} 
                onChangeText={onChange} 
                value={value} 
                error={errors.garageCode?.message} 
              />
            )}
          />

          <Controller
            control={control}
            name="fullName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Full Name" placeholder="Your Name" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.fullName?.message} />
            )}
          />

          <Controller
            control={control}
            name="role"
            render={({ field: { onChange, value } }) => (
              <Dropdown label="Job Role" placeholder="Select your role" options={ROLE_OPTIONS} value={value} onSelect={onChange} error={errors.role?.message} />
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
              <Input label="Email Address" placeholder="staff@garage.com" keyboardType="email-address" autoCapitalize="none" onBlur={onBlur} onChangeText={onChange} value={value} error={errors.email?.message} />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Create Password" placeholder="At least 6 characters" secureTextEntry onBlur={onBlur} onChangeText={onChange} value={value} error={errors.password?.message} />
            )}
          />

          <Button title="Join Garage" loading={loading} onPress={handleSubmit(onSubmit)} style={styles.submitBtn} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingVertical: 20 },
  title: { fontSize: 28, fontWeight: '700', color: '#1A202C', marginBottom: 6 },
  subtitle: { fontSize: 16, color: '#718096', marginBottom: 24 },
  submitBtn: { marginTop: 16, marginBottom: 40 },
});
