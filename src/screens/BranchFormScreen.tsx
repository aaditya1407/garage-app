import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, KeyboardAvoidingView, SafeAreaView } from 'react-native';
import { Text } from 'react-native-paper';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Dropdown } from '../components/Dropdown';
import { AlertModal, AlertVariant } from '../components/AlertModal';
import { supabase } from '../lib/supabase';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
// Lightweight local data for India (36 states, 4 242 cities, ~50 KB).
// Replaces the massive country-state-city library whose deep module tree
// overflows iOS Safari's call stack.
import indianData from '../data/indianStatesAndCities.json';

const garageSchema = z.object({
  garageName: z.string().min(2, 'Name is too short'),
  address: z.string().min(5, 'Address is too short'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
});

type GarageFormData = z.infer<typeof garageSchema>;

type Props = NativeStackScreenProps<RootStackParamList, 'BranchForm'>;

export const BranchFormScreen: React.FC<Props> = ({ route, navigation }) => {
  const { phone, fullName } = route.params;
  const [loading, setLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    variant: AlertVariant;
  }>({ title: '', message: '', variant: 'info' });

  const { control, handleSubmit, setValue, watch, formState: { errors }, resetField } = useForm<GarageFormData>({
    resolver: zodResolver(garageSchema),
    defaultValues: { garageName: '', address: '', city: '', state: '' }
  });

  const selectedState = watch('state');

  // State options from local data
  const stateOptions = indianData.states;

  // Load Cities dynamically based on selected state
  const cityOptions = useMemo(() => {
    if (!selectedState) return [];
    const cities = (indianData.cityMap as Record<string, string[]>)[selectedState] || [];
    return cities.map(name => ({ label: name, value: name }));
  }, [selectedState]);

  // Reset city if state changes
  useEffect(() => {
    resetField('city');
  }, [selectedState, resetField]);

  const showAlert = (title: string, message: string, variant: AlertVariant) => {
    setAlertConfig({ title, message, variant });
    setAlertVisible(true);
  };

  const generateGarageCode = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const onSubmit = async (data: GarageFormData) => {
    setLoading(true);
    let code = generateGarageCode();
    let isCodeUnique = false;

    try {
      // Get the current auth user ID to stamp the garage
      const { data: authData } = await supabase.auth.getUser();
      const ownerUserId = authData?.user?.id;
      if (!ownerUserId) throw new Error('Not authenticated. Please sign in again.');

      // Ensure unique code
      while (!isCodeUnique) {
        const { count } = await supabase.from('garages').select('id', { count: 'exact', head: true }).eq('garage_code', code);
        if (count === 0) {
          isCodeUnique = true;
        } else {
          code = generateGarageCode();
        }
      }

      // Find the state label from the state code for storage
      const stateEntry = stateOptions.find(s => s.value === data.state);
      const stateName = stateEntry ? stateEntry.label : data.state;

      const { data: newGarage, error } = await supabase
        .from('garages')
        .insert({
          garage_name: data.garageName,
          owner_name: fullName,
          phone: phone,
          address: data.address,
          city: data.city,
          state: stateName,
          country: 'India',
          garage_code: code,
          owner_user_id: ownerUserId,   // ties new branch to auth user UUID
        })
        .select()
        .single();

      if (error) throw error;

      showAlert(
        'Branch Created! 🏢',
        `Name: ${data.garageName}\n\nBranch created successfully! You can add your staff from the "Manage Staff" panel.`,
        'success'
      );
    } catch (err: any) {
      console.error(err);
      showAlert('Error', err.message || 'Failed to create branch', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAlertClose = () => {
    setAlertVisible(false);
    // Navigate back on success
    if (alertConfig.variant === 'success') {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text variant="headlineMedium" style={styles.title}>Add New Branch</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            This branch will automatically be linked to your phone number: {phone}
          </Text>

          <Controller
            control={control}
            name="garageName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Garage / Branch Name"
                placeholder="e.g. NextGen Auto (South)"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.garageName?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="address"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Street Address"
                placeholder="123 Main St"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.address?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="state"
            render={({ field: { onChange, value } }) => (
              <Dropdown
                label="State (India)"
                placeholder="Select State"
                options={stateOptions}
                value={value}
                onSelect={onChange}
                error={errors.state?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="city"
            render={({ field: { onChange, value } }) => (
              <Dropdown
                label="City"
                placeholder={selectedState ? "Select City" : "Select a State first"}
                options={cityOptions}
                value={value}
                onSelect={onChange}
                error={errors.city?.message}
              />
            )}
          />

          <Button 
            title="Create Branch" 
            onPress={handleSubmit(onSubmit)} 
            loading={loading}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <AlertModal
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        variant={alertConfig.variant}
        onClose={handleAlertClose}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
  scroll: { padding: 24 },
  title: { fontWeight: 'bold', color: '#1A202C', marginBottom: 8 },
  subtitle: { color: '#718096', marginBottom: 24, lineHeight: 22 },
  submitBtn: { marginTop: 16 },
});
