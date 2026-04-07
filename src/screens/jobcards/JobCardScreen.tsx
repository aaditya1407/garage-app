import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, KeyboardAvoidingView, Alert, Modal, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Text, TextInput, Button, Surface, useTheme, Searchbar, List, Divider, SegmentedButtons, Checkbox } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { InspectionChecklist, InspectionData } from '../../components/InspectionChecklist';
import { ImagePickerGrid, ImageSlots } from '../../components/ImagePickerGrid';
import { EstimateCalculator, EstimatePayload } from '../../components/EstimateCalculator';
import { CustomerForm } from '../../components/CustomerForm';
import { VehicleForm } from '../../components/VehicleForm';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

type Props = NativeStackScreenProps<RootStackParamList, 'JobCardForm'>;

interface CustomerRecord { id: string; full_name: string; }
interface VehicleRecord { id: string; make: string; model: string; license_plate: string; }
interface TechnicianRecord { id: string; full_name: string; }

export const JobCardScreen: React.FC<Props> = ({ navigation, route }) => {
  const { garageId } = route.params;
  
  // -- Basic Info State --
  const [loading, setLoading] = useState(false);
  const [jobCardNumber] = useState(`JC-${Date.now().toString().slice(-5)}`);
  const [currentDate] = useState(new Date().toLocaleString());
  const [advisorName, setAdvisorName] = useState('Fetching...');
  const [bayNumber, setBayNumber] = useState('');

  // -- Relational Selection State --
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  // -- Quick Add Forms --
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);

  // -- Intake State --
  const [odometer, setOdometer] = useState('');
  const [fuelLevel, setFuelLevel] = useState('1/2');
  
  // -- Inspection & Media State --
  const [inspectionData, setInspectionData] = useState<InspectionData | null>(null);
  const [jobImages, setJobImages] = useState<ImageSlots | null>(null);
  const [estimateData, setEstimateData] = useState<EstimatePayload | null>(null);

  // -- Complaints State --
  const [complaints, setComplaints] = useState({
      Engine: false,
      Brake: false,
      Suspension: false,
      Electrical: false,
      AC: false
  });
  const [description, setDescription] = useState('');

  // -- Classification & Work Assignment State --
  const [technicians, setTechnicians] = useState<TechnicianRecord[]>([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | null>(null);
  const [showTechnicianModal, setShowTechnicianModal] = useState(false);
  const [jobType, setJobType] = useState('Paid Service');
  const [internalNotes, setInternalNotes] = useState('');

  const fetchCustomers = () => {
    supabase.from('customers').select('id, full_name').eq('garage_id', garageId)
    .then(({ data }) => setCustomers(data || []));
  };

  const fetchVehicles = (cId: string) => {
    supabase.from('vehicles').select('id, make, model, license_plate').eq('customer_id', cId)
    .then(({ data }) => setVehicles(data || []));
  };

  const fetchTechnicians = async () => {
    // Try garage_staff first (admin-created staff)
    const { data: staffData } = await supabase.from('garage_staff').select('id, full_name').eq('garage_id', garageId).eq('role', 'technician').eq('is_active', true);
    if (staffData && staffData.length > 0) {
      setTechnicians(staffData);
    } else {
      // Fallback to profiles (Supabase Auth users)
      const { data: profData } = await supabase.from('profiles').select('id, full_name').eq('garage_id', garageId).eq('role', 'technician');
      setTechnicians(profData || []);
    }
  };

  useEffect(() => {
    // 1. Fetch Advisor Name
    const loadAdvisor = async () => {
      // Try Supabase Auth first (admin users)
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const { data } = await supabase.from('profiles').select('full_name').eq('id', authData.user.id).single();
        setAdvisorName(data?.full_name || 'Advisor');
      } else {
        // Staff user — get from AsyncStorage
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        const staffStr = await AsyncStorage.getItem('staffSession');
        if (staffStr) {
          const staff = JSON.parse(staffStr);
          setAdvisorName(staff.full_name || 'Advisor');
        } else {
          setAdvisorName('Advisor');
        }
      }
    };
    loadAdvisor();
    // 2. Initial Fetch Customers & Technicians
    fetchCustomers();
    fetchTechnicians();
  }, [garageId]);

  useEffect(() => {
     if(selectedCustomerId) fetchVehicles(selectedCustomerId);
     else setVehicles([]);
  }, [selectedCustomerId]);

  const toggleComplaint = (category: keyof typeof complaints) => {
      setComplaints(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const onSubmit = async () => {
    if(!selectedVehicleId) {
        if(Platform.OS === 'web') return window.alert("Please physically select a Vehicle for intake.");
        return Alert.alert("Validation Error", "Please physically select a Vehicle for intake.");
    }
    if(!odometer) {
        if(Platform.OS === 'web') return window.alert("Please record the current Odometer reading.");
        return Alert.alert("Validation Error", "Please record the current Odometer reading.");
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let currentAdvisorId = user?.id || null;
      if (!currentAdvisorId) {
          const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
          const staffStr = await AsyncStorage.getItem('staffSession');
          if (staffStr) {
              const staff = JSON.parse(staffStr);
              currentAdvisorId = staff.id;
          }
      }

      const activeComplaints = Object.entries(complaints).filter(([_, val]) => val).map(([key, _]) => key);

      let uploadedUrls: Record<string, string> = {};
      if (jobImages) {
          for (const [key, uri] of Object.entries(jobImages)) {
              if (uri) {
                  try {
                      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
                      const filePath = `${garageId}/${jobCardNumber}/${key}-${Date.now()}.jpg`;
                      const { error: uploadError } = await supabase.storage.from('job_cards_media').upload(filePath, decode(base64), { contentType: 'image/jpeg' });
                      if (!uploadError) {
                          const { data: { publicUrl } } = supabase.storage.from('job_cards_media').getPublicUrl(filePath);
                          uploadedUrls[key] = publicUrl;
                      }
                  } catch (e) {
                      console.error(`Local file system error for ${key}:`, e);
                  }
              }
          }
      }

      const { error } = await supabase.from('job_cards').insert({
        garage_id: garageId,
        vehicle_id: selectedVehicleId,
        advisor_id: currentAdvisorId,
        assigned_technician_id: selectedTechnicianId,
        job_type: jobType,
        internal_notes: internalNotes || null,
        job_card_number: jobCardNumber,
        bay_number: bayNumber || null,
        odometer: parseInt(odometer),
        fuel_level: fuelLevel,
        inspection_data: inspectionData || {},
        images: uploadedUrls,
        complaint_categories: activeComplaints,
        description: description,
        parts_cost: estimateData?.partsCost || 0,
        parts_lines: estimateData?.partLines || [],
        labour_cost: estimateData?.labourCost || 0,
        gst_percent: estimateData?.gstPercent || 0,
        estimated_cost: estimateData?.totalCost || 0,
        approval_status: estimateData?.approvalStatus || 'Pending',
        status: 'open'
      });

      if (error) throw error;

      // ── Auto-deduct stock for inventory-linked parts
      const inventoryLines = (estimateData?.partLines || []).filter((l: any) => l.inventoryItemId);
      for (const line of inventoryLines) {
        // Fetch current stock, decrement by 1
        const { data: inv } = await supabase.from('inventory').select('stock_quantity').eq('id', line.inventoryItemId).single();
        if (inv && inv.stock_quantity > 0) {
          await supabase.from('inventory').update({ stock_quantity: inv.stock_quantity - 1 }).eq('id', line.inventoryItemId);
        }
      }
      
      if (Platform.OS !== 'web') Alert.alert("Job Card Generated", `JC Number: ${jobCardNumber} successfully initiated!`);
      navigation.goBack();

    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message || "Failed to generate Job Card.");
    } finally {
      setLoading(false);
    }
  };


  // --- UI PARTIALS ---
  const filteredCustomers = customers.filter(c => c.full_name.toLowerCase().includes(customerSearch.toLowerCase()));

  const renderSearchableModal = (
    title: string, 
    visible: boolean, 
    onDismiss: () => void, 
    data: {label: string, value: string, subLabel?: string}[],
    onSelect: (val: string) => void,
    showSearch: boolean,
    searchQuery: string,
    setSearchQuery: (v: string) => void,
    onAddNew: () => void
  ) => (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onDismiss}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>{title}</Text>
          <Button onPress={onDismiss}>Close</Button>
        </View>
        {showSearch && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <Searchbar placeholder="Search..." onChangeText={setSearchQuery} value={searchQuery} elevation={0} style={{ backgroundColor: '#F5F5F5' }} />
          </View>
        )}
        <View style={{ padding: 16 }}>
            <Button mode="contained" icon="plus" onPress={() => { onDismiss(); onAddNew(); }}>Add New</Button>
        </View>
        <FlatList
          data={data}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <>
              <List.Item
                title={item.label}
                description={item.subLabel}
                onPress={() => { onSelect(item.value); onDismiss(); }}
              />
              <Divider />
            </>
          )}
          ListEmptyComponent={<Text style={{padding: 20, textAlign: 'center', color: '#9E9E9E'}}>No results found.</Text>}
        />
      </SafeAreaView>
    </Modal>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* =========================================
            SECTION 1: BASIC INFO
        =========================================== */}
        <Surface style={styles.sectionSurface} elevation={1}>
            <Text variant="titleMedium" style={styles.sectionHeader}>Service Details</Text>
            <View style={styles.row}>
                <View style={styles.halfCol}><TextInput mode="flat" label="Job Card No." value={jobCardNumber} disabled style={styles.inputSpacing} /></View>
                <View style={styles.halfCol}><TextInput mode="flat" label="Timestamp" value={currentDate} disabled style={styles.inputSpacing} /></View>
            </View>
            <TextInput mode="flat" label="Service Advisor" value={advisorName} disabled style={styles.inputSpacing} left={<TextInput.Icon icon="account-tie" />} />
            <TextInput mode="outlined" label="Bay Number (Optional)" value={bayNumber} onChangeText={setBayNumber} style={styles.inputSpacing} placeholder="e.g. Bay 2" />
        </Surface>

        {/* =========================================
            SECTION 2: ASSET SELECTION
        =========================================== */}
        <Surface style={styles.sectionSurface} elevation={1}>
            <Text variant="titleMedium" style={styles.sectionHeader}>Customer & Vehicle Selection</Text>
            
            <TouchableOpacity onPress={() => setShowCustomerModal(true)} style={styles.inputSpacing}>
                <View pointerEvents="none">
                    <TextInput mode="outlined" label="Select Customer *" value={customers.find(c => c.id === selectedCustomerId)?.full_name || ''} right={<TextInput.Icon icon="chevron-down" />} />
                </View>
            </TouchableOpacity>

            <TouchableOpacity 
               onPress={() => selectedCustomerId ? setShowVehicleModal(true) : Alert.alert('Notice', 'Select a customer first.')} 
               style={styles.inputSpacing}>
                <View pointerEvents="none">
                    <TextInput mode="outlined" label="Select Linked Vehicle *" value={vehicles.find(v => v.id === selectedVehicleId)?.license_plate || ''} right={<TextInput.Icon icon="chevron-down" />} disabled={!selectedCustomerId}/>
                </View>
            </TouchableOpacity>
        </Surface>

        {/* =========================================
            SECTION 3: VEHICLE INTAKE
        =========================================== */}
        <Surface style={styles.sectionSurface} elevation={1}>
            <Text variant="titleMedium" style={styles.sectionHeader}>Vehicle Intake State</Text>
            <TextInput mode="outlined" label="Odometer Reading (KM) *" value={odometer} onChangeText={setOdometer} keyboardType="numeric" right={<TextInput.Affix text="KM" />} style={styles.inputSpacing} />
            <Text variant="bodyMedium" style={{marginBottom: 8, color: '#616161'}}>Fuel Level</Text>
            <SegmentedButtons
                value={fuelLevel}
                onValueChange={setFuelLevel}
                buttons={[{ value: 'E', label: 'E' }, { value: '1/4', label: '1/4' }, { value: '1/2', label: '1/2' }, { value: '3/4', label: '3/4' }, { value: 'F', label: 'F' }]}
                style={styles.inputSpacing}
            />
        </Surface>

        {/* =========================================
            SECTION 3.5: COMPREHENSIVE INSPECTION
        =========================================== */}
        <Surface style={styles.sectionSurface} elevation={1}>
            <Text variant="titleMedium" style={styles.sectionHeader}>Standard 16-Point Inspection</Text>
            <InspectionChecklist onChange={(data) => setInspectionData(data)} />
        </Surface>

        {/* =========================================
            SECTION 3.6: IMAGE ASSETS
        =========================================== */}
        <Surface style={styles.sectionSurface} elevation={1}>
            <ImagePickerGrid onChange={(images) => setJobImages(images)} />
        </Surface>

        {/* =========================================
            SECTION 4: CUSTOMER COMPLAINTS
        =========================================== */}
        <Surface style={styles.sectionSurface} elevation={1}>
            <Text variant="titleMedium" style={styles.sectionHeader}>System Complaints</Text>
            <View style={{flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12}}>
                {(Object.keys(complaints) as Array<keyof typeof complaints>).map((key) => (
                    <View key={key} style={{flexDirection: 'row', alignItems: 'center', width: '50%'}}>
                        <Checkbox status={complaints[key] ? 'checked' : 'unchecked'} onPress={() => toggleComplaint(key)} />
                        <Text>{key}</Text>
                    </View>
                ))}
            </View>
            <TextInput mode="outlined" label="Specific Complaints / Notes" value={description} onChangeText={setDescription} multiline numberOfLines={4} placeholder="e.g. Hearing rattling noise from front-left suspension when turning..." />
        </Surface>

        {/* =========================================
            SECTION 4.5: WORK ASSIGNMENT
        =========================================== */}
        <Surface style={styles.sectionSurface} elevation={1}>
            <Text variant="titleMedium" style={styles.sectionHeader}>Classification & Assignment</Text>
            
            <Text variant="bodyMedium" style={{marginBottom: 8, color: '#616161'}}>Job Type Classification</Text>
            <SegmentedButtons
                value={jobType}
                onValueChange={setJobType}
                buttons={[{ value: 'Paid Service', label: 'Paid' }, { value: 'Free Service', label: 'Free' }, { value: 'Accident Repair', label: 'Accident' }]}
                style={styles.inputSpacing}
            />

            <TouchableOpacity onPress={() => setShowTechnicianModal(true)} style={styles.inputSpacing}>
                <View pointerEvents="none">
                    <TextInput mode="outlined" label="Assign Technician" value={technicians.find(t => t.id === selectedTechnicianId)?.full_name || 'Unassigned (Select later)'} right={<TextInput.Icon icon="chevron-down" />} />
                </View>
            </TouchableOpacity>

            <TextInput mode="outlined" label="Internal Service Notes (Staff Only)" value={internalNotes} onChangeText={setInternalNotes} multiline numberOfLines={3} placeholder="Add any private remarks for the technician..." />
        </Surface>

        {/* =========================================
            SECTION 5: FINANCIAL ESTIMATE
        =========================================== */}
        <EstimateCalculator garageId={garageId} onChange={(payload) => setEstimateData(payload)} />

        <Button mode="contained" onPress={onSubmit} loading={loading} style={styles.submitBtn} contentStyle={{paddingVertical: 8}}>
          Generate Job Card
        </Button>
      </ScrollView>

      {/* SELECTION MODALS */}
      {renderSearchableModal(
          "Select Customer", showCustomerModal, () => setShowCustomerModal(false),
          filteredCustomers.map(c => ({ label: c.full_name, value: c.id })),
          (val) => { setSelectedCustomerId(val); setSelectedVehicleId(''); },
          true, customerSearch, setCustomerSearch,
          () => setShowAddCustomer(true)
      )}

      {renderSearchableModal(
          "Select Linked Vehicle", showVehicleModal, () => setShowVehicleModal(false),
          vehicles.map(v => ({ label: v.license_plate, value: v.id, subLabel: `${v.make} ${v.model}` })),
          (val) => setSelectedVehicleId(val),
          false, '', () => {},
          () => setShowAddVehicle(true)
      )}

      {renderSearchableModal(
          "Assign Technician", showTechnicianModal, () => setShowTechnicianModal(false),
          technicians.map(t => ({ label: t.full_name, value: t.id })),
          (val) => setSelectedTechnicianId(val),
          false, '', () => {},
          () => Alert.alert('Notice', 'Please ask a Manager or Admin to register new Technicians via the Dashboard Settings.')
      )}

      {/* QUICK ADD MODALS */}
      <Modal visible={showAddCustomer} animationType="slide" presentationStyle="formSheet">
          <SafeAreaView style={{flex: 1, backgroundColor: '#fff', padding: 16}}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16}}>
                  <Text variant="headlineSmall" style={{fontWeight: 'bold'}}>Add Customer</Text>
              </View>
              <CustomerForm 
                  garageId={garageId} 
                  onCancel={() => setShowAddCustomer(false)}
                  onSuccess={(newId) => {
                      fetchCustomers();
                      setSelectedCustomerId(newId);
                      setShowAddCustomer(false);
                      setShowAddVehicle(true); // Auto-prompt for their vehicle
                  }} 
              />
          </SafeAreaView>
      </Modal>

      <Modal visible={showAddVehicle} animationType="slide" presentationStyle="formSheet">
          <SafeAreaView style={{flex: 1, backgroundColor: '#fff', padding: 16}}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16}}>
                  <Text variant="headlineSmall" style={{fontWeight: 'bold'}}>Register Vehicle</Text>
              </View>
              <VehicleForm 
                  garageId={garageId} 
                  preSelectedCustomerId={selectedCustomerId}
                  onCancel={() => setShowAddVehicle(false)}
                  onSuccess={(newId) => {
                      fetchVehicles(selectedCustomerId);
                      setSelectedVehicleId(newId);
                      setShowAddVehicle(false);
                  }} 
              />
          </SafeAreaView>
      </Modal>

    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollContent: { padding: 16, paddingBottom: 60 },
  sectionSurface: { padding: 16, borderRadius: 12, marginBottom: 16, backgroundColor: '#FFFFFF' },
  sectionHeader: { fontWeight: 'bold', color: '#1976D2', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#EEEEEE', paddingBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfCol: { width: '48%' },
  inputSpacing: { marginBottom: 16 },
  submitBtn: { marginTop: 12, marginBottom: 32 }
});
