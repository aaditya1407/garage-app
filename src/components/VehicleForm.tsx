import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, Alert, Modal, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import { supabase } from '../lib/supabase';
import { Text, TextInput, Button, HelperText, Searchbar, List, Divider } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { CAR_MAKES, CAR_MODELS, CAR_VARIANTS } from '../utils/carData';

const vehicleSchema = z.object({
  customerId: z.string().min(1, 'Please select an owner'),
  licensePlate: z.string().min(1, 'Registration Number is required'),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  variant: z.string().optional(),
  vin: z.string().optional(),
  engineNumber: z.string().optional(),
  color: z.string().optional(),
  manufacturingYear: z.string().regex(/^\d{4}$/, 'Must be a valid 4-digit year').optional().or(z.literal('')),
  registrationDate: z.string().optional(),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

interface Props {
  garageId: string;
  preSelectedCustomerId?: string; // Automatically bind to a customer if provided
  onSuccess: (vehicleId: string) => void;
  onCancel?: () => void;
}

export const VehicleForm: React.FC<Props> = ({ garageId, preSelectedCustomerId, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  
  const [customers, setCustomers] = useState<{id: string, full_name: string}[]>([]);
  
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showMakeModal, setShowMakeModal] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);

  const [customerSearch, setCustomerSearch] = useState('');
  const [makeSearch, setMakeSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [variantSearch, setVariantSearch] = useState('');
  const [selectedMakeState, setSelectedMakeState] = useState<string | null>(null);

  // States for database-learned entries
  const [dbMakes, setDbMakes] = useState<string[]>([]);
  const [dbModels, setDbModels] = useState<Record<string, string[]>>({});
  const [dbVariants, setDbVariants] = useState<Record<string, string[]>>({});

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      customerId: preSelectedCustomerId || '',
      licensePlate: '',
      make: '',
      model: '',
      variant: '',
      vin: '',
      engineNumber: '',
      color: '',
      manufacturingYear: '',
      registrationDate: '',
    }
  });

  const selectedCustomerId = watch('customerId');
  const selectedMake = watch('make');
  const selectedModel = watch('model');
  const selectedVariant = watch('variant');

  useEffect(() => {
    supabase.from('customers').select('id, full_name').eq('garage_id', garageId)
      .then(({ data }) => setCustomers(data || []));
    
    fetchVehicleHistory();
  }, [garageId]);

  const fetchVehicleHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('make, model, variant')
        .eq('garage_id', garageId);

      if (error) throw error;

      if (data) {
        const makes = new Set<string>();
        const modelsByMake: Record<string, Set<string>> = {};
        const variantsByMake: Record<string, Set<string>> = {};

        data.forEach(v => {
          if (v.make) makes.add(v.make);
          if (v.make && v.model) {
            if (!modelsByMake[v.make]) modelsByMake[v.make] = new Set();
            modelsByMake[v.make].add(v.model);
          }
          if (v.make && v.variant) {
            if (!variantsByMake[v.make]) variantsByMake[v.make] = new Set();
            variantsByMake[v.make].add(v.variant);
          }
        });

        setDbMakes(Array.from(makes));
        
        const finalModels: Record<string, string[]> = {};
        Object.keys(modelsByMake).forEach(k => finalModels[k] = Array.from(modelsByMake[k]));
        setDbModels(finalModels);

        const finalVariants: Record<string, string[]> = {};
        Object.keys(variantsByMake).forEach(k => finalVariants[k] = Array.from(variantsByMake[k]));
        setDbVariants(finalVariants);
      }
    } catch (e) {
      console.warn('Failed to fetch vehicle history for suggestions:', e);
    }
  };

  // If prop changes later (e.g. they created a new user inline), update form constraint
  useEffect(() => {
      if(preSelectedCustomerId) setValue('customerId', preSelectedCustomerId);
  }, [preSelectedCustomerId, setValue]);


  const onSubmit = async (data: VehicleFormData) => {
    setLoading(true);
    try {
      const { data: newVeh, error } = await supabase.from('vehicles').insert({
        garage_id: garageId,
        customer_id: data.customerId,
        license_plate: data.licensePlate,
        make: data.make,
        model: data.model,
        variant: data.variant || null,
        vin: data.vin || null,
        engine_number: data.engineNumber || null,
        color: data.color || null,
        year: data.manufacturingYear ? parseInt(data.manufacturingYear) : null,
        registration_date: data.registrationDate || null
      }).select().single();

      if (error) throw error;
      
      if (Platform.OS !== 'web') Alert.alert("Success", "Vehicle registered successfully!");
      
      // Refresh options so new make/model shows up in dropdown next time
      fetchVehicleHistory();
      
      onSuccess(newVeh.id);

    } catch (error: any) {
      console.error(error);
      if(Platform.OS === 'web') window.alert("Failed to register vehicle: " + error.message);
      else Alert.alert("Error", error.message || "Failed to register vehicle");
    } finally {
      setLoading(false);
    }
  };

  const onInvalid = () => {
    if (Platform.OS === 'web') window.alert("Please fill in all mandatory fields (Owner, Make, Model, License Plate).");
    else Alert.alert("Validation Error", "Missing mandatory fields.");
  };

  const filteredCustomers = customers.filter(c => c.full_name.toLowerCase().includes(customerSearch.toLowerCase()));

  const renderSearchableModal = (
    title: string, 
    visible: boolean, 
    onDismiss: () => void, 
    data: {label: string, value: string}[], 
    onSelect: (val: string) => void, 
    searchQuery: string, 
    setSearchQuery: (v: string) => void,
    allowCustom: boolean = false
  ) => {
    const filteredData = data.filter(item => 
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const showAddNew = allowCustom && searchQuery.trim().length > 0 && 
      !data.some(item => item.label.toLowerCase() === searchQuery.trim().toLowerCase());

    return (
      <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onDismiss}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>{title}</Text>
              {allowCustom && <Text variant="bodySmall" style={{ color: '#666' }}>Type to add custom if not in list</Text>}
            </View>
            <Button onPress={onDismiss}>Close</Button>
          </View>
          
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <Searchbar 
              placeholder="Search or type new..." 
              onChangeText={setSearchQuery} 
              value={searchQuery} 
              elevation={0} 
              style={{ backgroundColor: '#F5F5F5' }} 
            />
          </View>

          <FlatList
            data={filteredData}
            keyExtractor={(item, index) => `${item.value}-${index}`}
            ListHeaderComponent={showAddNew ? (
              <List.Item 
                title={`+ Add "${searchQuery}"`}
                titleStyle={{ color: '#1976D2', fontWeight: 'bold' }}
                left={props => <List.Icon {...props} icon="plus" color="#1976D2" />}
                onPress={() => { onSelect(searchQuery); onDismiss(); }}
              />
            ) : null}
            renderItem={({ item }) => (
              <><List.Item title={item.label} onPress={() => { onSelect(item.value); onDismiss(); }} /><Divider /></>
            )}
            ListEmptyComponent={!showAddNew ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <Text variant="bodyMedium" style={{ color: '#666' }}>No matches found</Text>
              </View>
            ) : null}
          />
        </SafeAreaView>
      </Modal>
    );
  };

  return (
      <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <Text variant="titleMedium" style={styles.sectionTitle}>Ownership & Linking</Text>
        <TouchableOpacity onPress={() => setShowCustomerModal(true)}>
          <View pointerEvents="none">
            <TextInput mode="outlined" label="Select Owner *" value={customers.find(c => c.id === selectedCustomerId)?.full_name || ''} right={<TextInput.Icon icon="chevron-down" />} error={!!errors.customerId} />
          </View>
        </TouchableOpacity>
        {errors.customerId && <HelperText type="error" visible>{errors.customerId.message}</HelperText>}


        <Text variant="titleMedium" style={[styles.sectionTitle, { marginTop: 24 }]}>Vehicle Identity</Text>
        <Controller
          control={control}
          name="licensePlate"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.inputContainer}>
              <TextInput mode="outlined" label="Registration Number *" autoCapitalize="characters" onBlur={onBlur} onChangeText={onChange} value={value} error={!!errors.licensePlate} />
              {errors.licensePlate && <HelperText type="error" visible>{errors.licensePlate.message}</HelperText>}
            </View>
          )}
        />

        <TouchableOpacity onPress={() => setShowMakeModal(true)} style={{ marginBottom: 12 }}>
          <View pointerEvents="none"><TextInput mode="outlined" label="Make / Company *" value={selectedMake} right={<TextInput.Icon icon="chevron-down" />} error={!!errors.make} /></View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => { if(!selectedMake) { Platform.OS==='web'?window.alert('Select Make'):Alert.alert('Notice', 'Select a Make first.'); return; } setShowModelModal(true); }} style={{ marginBottom: 12 }}>
          <View pointerEvents="none"><TextInput mode="outlined" label="Model *" value={selectedModel} right={<TextInput.Icon icon="chevron-down" />} error={!!errors.model} disabled={!selectedMake}/></View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => { if(!selectedMake) return; setShowVariantModal(true); }} style={{ marginBottom: 12 }}>
          <View pointerEvents="none"><TextInput mode="outlined" label="Trim / Variant (Optional)" value={selectedVariant} right={<TextInput.Icon icon="chevron-down" />} disabled={!selectedMake}/></View>
        </TouchableOpacity>


        <Text variant="titleMedium" style={[styles.sectionTitle, { marginTop: 24 }]}>Manufacturing Specs</Text>
        <Controller control={control} name="vin" render={({ field: { onChange, value } }) => (<TextInput mode="outlined" label="VIN (Chassis Number)" autoCapitalize="characters" onChangeText={onChange} value={value} style={styles.inputContainer} />)} />
        <Controller control={control} name="engineNumber" render={({ field: { onChange, value } }) => (<TextInput mode="outlined" label="Engine Number" autoCapitalize="characters" onChangeText={onChange} value={value} style={styles.inputContainer} />)} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ width: '48%' }}><Controller control={control} name="color" render={({ field: { onChange, value } }) => (<TextInput mode="outlined" label="Color" onChangeText={onChange} value={value} />)} /></View>
            <View style={{ width: '48%' }}><Controller control={control} name="manufacturingYear" render={({ field: { onChange, value } }) => (<View><TextInput mode="outlined" label="Mfg Year" keyboardType="numeric" maxLength={4} onChangeText={onChange} value={value} error={!!errors.manufacturingYear}/>{errors.manufacturingYear && <HelperText type="error" visible>{errors.manufacturingYear.message}</HelperText>}</View>)} /></View>
        </View>

        <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 16}}>
           {onCancel && <Button mode="outlined" onPress={onCancel} style={{width: '48%'}}>Cancel</Button>}
           <Button mode="contained" onPress={handleSubmit(onSubmit, onInvalid)} loading={loading} style={{width: onCancel ? '48%' : '100%'}}>
             Register Vehicle
           </Button>
        </View>

      </ScrollView>

      {/* --- MODALS --- */}
      {renderSearchableModal("Select Customer", showCustomerModal, () => setShowCustomerModal(false), customers.map(c => ({ label: c.full_name, value: c.id })), (val) => setValue('customerId', val, { shouldValidate: true }), customerSearch, setCustomerSearch)}
      
      {renderSearchableModal("Select Make", showMakeModal, () => { setShowMakeModal(false); setMakeSearch(''); }, 
        Array.from(new Set([...CAR_MAKES, ...dbMakes])).map(m => ({ label: m, value: m })), 
        (val) => { 
          setValue('make', val, { shouldValidate: true }); 
          setSelectedMakeState(val); 
          setValue('model', ''); 
          setMakeSearch(''); 
        }, makeSearch, setMakeSearch, true)}
      
      {renderSearchableModal("Select Model", showModelModal, () => { setShowModelModal(false); setModelSearch(''); }, 
        Array.from(new Set([
          ...(selectedMakeState ? (CAR_MODELS[selectedMakeState] || []) : []),
          ...(selectedMakeState ? (dbModels[selectedMakeState] || []) : [])
        ])).map(m => ({ label: m, value: m })), 
        (val) => { 
          setValue('model', val, { shouldValidate: true }); 
          setModelSearch(''); 
        }, modelSearch, setModelSearch, true)}
      
      {renderSearchableModal("Select Variant", showVariantModal, () => { setShowVariantModal(false); setVariantSearch(''); }, 
        Array.from(new Set([
          ...(selectedMakeState && CAR_VARIANTS[selectedMakeState] ? CAR_VARIANTS[selectedMakeState] : []),
          ...(selectedMakeState && dbVariants[selectedMakeState] ? dbVariants[selectedMakeState] : [])
        ])).map(v => ({ label: v, value: v })), 
        (val) => { 
          setValue('variant', val, { shouldValidate: true }); 
          setVariantSearch(''); 
        }, variantSearch, setVariantSearch, true)}
      </View>
  );
};

const styles = StyleSheet.create({
  scrollContent: { padding: 4, paddingBottom: 60 },
  sectionTitle: { marginBottom: 12, fontWeight: 'bold', color: '#1976D2' },
  inputContainer: { marginBottom: 12 },
});
