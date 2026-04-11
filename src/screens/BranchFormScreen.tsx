import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, KeyboardAvoidingView, SafeAreaView, Modal, FlatList, TouchableOpacity } from 'react-native';
import { Text, Searchbar, List, Divider, TextInput } from 'react-native-paper';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { supabase } from '../lib/supabase';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { State, City } from 'country-state-city';

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

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<GarageFormData>({
    resolver: zodResolver(garageSchema),
    defaultValues: { garageName: '', address: '', city: '', state: '' }
  });

  const [selectedStateCode, setSelectedStateCode] = useState('');
  const [showStateModal, setShowStateModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');

  const indianStates = useMemo(() => State.getStatesOfCountry('IN'), []);
  const indianCities = useMemo(() => selectedStateCode ? City.getCitiesOfState('IN', selectedStateCode) : [], [selectedStateCode]);

  const filteredStates = useMemo(() => indianStates.filter(s => s.name.toLowerCase().includes(stateSearch.toLowerCase())), [indianStates, stateSearch]);
  const filteredCities = useMemo(() => indianCities.filter(c => c.name.toLowerCase().includes(citySearch.toLowerCase())), [indianCities, citySearch]);

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

      const { data: newGarage, error } = await supabase
        .from('garages')
        .insert({
          garage_name: data.garageName,
          owner_name: fullName,
          phone: phone,
          address: data.address,
          city: data.city,
          state: data.state,
          country: 'India',
          garage_code: code,
          owner_user_id: ownerUserId,   // ties new branch to auth user UUID
        })
        .select()
        .single();

      if (error) throw error;

      const msg = `Branch Created! 🏢\nName: ${data.garageName}\nCode: ${code}\n\nShare this code with your staff to join.`;
      if (Platform.OS === 'web') {
        window.alert(msg);
        navigation.goBack();
      } else {
        Alert.alert('Branch Created! 🏢', `Name: ${data.garageName}\nCode: ${code}\n\nShare this code with staff to join.`, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err.message || 'Failed to create branch';
      if (Platform.OS === 'web') {
        window.alert('Error: ' + errMsg);
      } else {
        Alert.alert('Error', errMsg);
      }
    } finally {
      setLoading(false);
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
            render={({ field: { value } }) => (
              <TouchableOpacity onPress={() => setShowStateModal(true)}>
                <View pointerEvents="none">
                  <Input
                    label="State"
                    placeholder="Select State"
                    value={value}
                    error={errors.state?.message}
                    editable={false}
                  />
                </View>
              </TouchableOpacity>
            )}
          />

          <Controller
            control={control}
            name="city"
            render={({ field: { value } }) => (
              <TouchableOpacity onPress={() => {
                if (!selectedStateCode) {
                  Platform.OS === 'web' ? window.alert('Please select a state first.') : Alert.alert('Notice', 'Please select a state first.');
                  return;
                }
                setShowCityModal(true);
              }}>
                <View pointerEvents="none">
                  <Input
                    label="City"
                    placeholder="Select City"
                    value={value}
                    error={errors.city?.message}
                    editable={false}
                  />
                </View>
              </TouchableOpacity>
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

      {/* STATE SELECTION MODAL */}
      <Modal visible={showStateModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowStateModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={styles.modalHeader}>
            <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>Select State</Text>
            <TouchableOpacity onPress={() => setShowStateModal(false)}><Text style={{ color: '#1976D2', fontWeight: 'bold' }}>Close</Text></TouchableOpacity>
          </View>
          <View style={{ padding: 16 }}>
            <Searchbar placeholder="Search states..." value={stateSearch} onChangeText={setStateSearch} elevation={0} style={{ backgroundColor: '#F5F5F5' }} />
          </View>
          <FlatList
            data={filteredStates}
            keyExtractor={item => item.isoCode}
            renderItem={({ item }) => (
              <>
                <List.Item
                  title={item.name}
                  onPress={() => {
                    setValue('state', item.name);
                    setValue('city', ''); // reset city on state change
                    setSelectedStateCode(item.isoCode);
                    setShowStateModal(false);
                    setStateSearch('');
                  }}
                />
                <Divider />
              </>
            )}
            ListEmptyComponent={<Text style={{ padding: 24, textAlign: 'center' }}>No states found.</Text>}
          />
        </SafeAreaView>
      </Modal>

      {/* CITY SELECTION MODAL */}
      <Modal visible={showCityModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCityModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={styles.modalHeader}>
            <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>Select City</Text>
            <TouchableOpacity onPress={() => setShowCityModal(false)}><Text style={{ color: '#1976D2', fontWeight: 'bold' }}>Close</Text></TouchableOpacity>
          </View>
          <View style={{ padding: 16 }}>
            <Searchbar placeholder="Search cities..." value={citySearch} onChangeText={setCitySearch} elevation={0} style={{ backgroundColor: '#F5F5F5' }} />
          </View>
          <FlatList
            data={filteredCities}
            keyExtractor={item => item.name}
            renderItem={({ item }) => (
              <>
                <List.Item
                  title={item.name}
                  onPress={() => {
                    setValue('city', item.name);
                    setShowCityModal(false);
                    setCitySearch('');
                  }}
                />
                <Divider />
              </>
            )}
            ListEmptyComponent={<Text style={{ padding: 24, textAlign: 'center' }}>No cities found for this state.</Text>}
          />
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
  scroll: { padding: 24 },
  title: { fontWeight: 'bold', color: '#1A202C', marginBottom: 8 },
  subtitle: { color: '#718096', marginBottom: 24, lineHeight: 22 },
  submitBtn: { marginTop: 16 },
  modalHeader: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
});
