import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Modal, SafeAreaView, ScrollView } from 'react-native';
import { TextInput, Text, Button, Searchbar, List, Divider, Surface, Avatar, ActivityIndicator } from 'react-native-paper';
import { supabase } from '../lib/supabase';

interface Props {
  garageId: string;
  onAssetSelected: (vehicleId: string, customerId: string) => void;
}

export const UnifiedAssetSearch: React.FC<Props> = ({ garageId, onAssetSelected }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  
  // Quick Add State
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaPhone, setQaPhone] = useState('');
  const [qaName, setQaName] = useState('');
  const [qaPlate, setQaPlate] = useState('');
  const [qaMake, setQaMake] = useState('');
  const [qaModel, setQaModel] = useState('');

  // 1. Unified Real-time Database Search
  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    const executeSearch = async () => {
      setLoading(true);
      try {
        // Query Vehicles and join mapping Customers
        // PostgREST doesn't easily .or() across tables safely in old wrappers, so we fetch vehicles
        // matching the license plate, OR we fetch vehicles whose customer matches the phone.
        
        // Approach: Two parallel queries merged
        const { data: vData } = await supabase
          .from('vehicles')
          .select('id, make, model, license_plate, customer_id, customers!inner(full_name, phone)')
          .eq('garage_id', garageId)
          .ilike('license_plate', `%${query}%`);

        const { data: cData } = await supabase
          .from('customers')
          .select('full_name, phone, vehicles(id, make, model, license_plate, customer_id)')
          .eq('garage_id', garageId)
          .ilike('phone', `%${query}%`);

        const customerMatchedVehicles = (cData || []).flatMap((customer: any) =>
          (customer.vehicles || []).map((vehicle: any) => ({
            ...vehicle,
            customers: {
              full_name: customer.full_name,
              phone: customer.phone,
            },
          }))
        );

        // Deduplicate
        const merged = [...(vData || []), ...customerMatchedVehicles];
        const unique = Array.from(new Set(merged.map(a => a.id))).map(id => merged.find(a => a.id === id));
        
        setResults(unique);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    const delay = setTimeout(executeSearch, 500); // 500ms debounce
    return () => clearTimeout(delay);
  }, [query, garageId]);

  const handleSelect = (asset: any) => {
    setSelectedAsset(asset);
    onAssetSelected(asset.id, asset.customer_id);
    setQuery(''); // Clear search visual
  };

  const handleClear = () => {
    setSelectedAsset(null);
    onAssetSelected('', '');
  };

  // 2. Quick-Add Database Pipeline
  const executeQuickAdd = async () => {
    if (!qaPhone || !qaName || !qaPlate || !qaMake || !qaModel) {
        if(typeof window !== 'undefined') window.alert("All fields are mandatory for rapid registration.");
        else Alert.alert("Missing Fields", "All fields are mandatory.");
        return;
    }

    setQaLoading(true);
    try {
        // Step 1: Does customer exist?
        let customerId = '';
        const { data: existingCust } = await supabase.from('customers').select('id').eq('phone', qaPhone).eq('garage_id', garageId).single();
        
        if (existingCust) {
            customerId = existingCust.id;
        } else {
            // Create Customer
            const { data: newCust, error: cErr } = await supabase.from('customers')
               .insert({ garage_id: garageId, full_name: qaName, phone: qaPhone, address: 'Added via Quick-Add' })
               .select().single();
            if(cErr) throw cErr;
            customerId = newCust.id;
        }

        // Step 2: Create Vehicle
        const { data: newVeh, error: vErr } = await supabase.from('vehicles')
            .insert({ garage_id: garageId, customer_id: customerId, make: qaMake, model: qaModel, license_plate: qaPlate.toUpperCase() })
            .select().single();
        if(vErr) throw vErr;

        // Step 3: Fast Bind to Screen
        if(typeof window !== 'undefined') window.alert("Asset securely bound to Job Card!");
        else Alert.alert("Success", "Asset securely bound to Job Card!");

        // Set pseudo-asset so UI shows it's locked in
        handleSelect({ 
            id: newVeh.id, 
            customer_id: customerId, 
            make: qaMake, 
            model: qaModel, 
            license_plate: qaPlate.toUpperCase(), 
            customers: { full_name: qaName, phone: qaPhone } 
        });

        setShowQuickAdd(false);
    } catch (err: any) {
        console.error(err);
        if(typeof window !== 'undefined') window.alert(`Error: ${err.message}`);
        else Alert.alert("Error", err.message);
    } finally {
        setQaLoading(false);
    }
  };


  if (selectedAsset) {
      return (
          <Surface style={styles.card} elevation={1}>
             <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
                 <Text variant="titleMedium" style={styles.headerTitle}>Active Intake Asset</Text>
                 <Button mode="text" textColor="#D32F2F" onPress={handleClear}>Clear</Button>
             </View>
             <View style={{flexDirection: 'row', alignItems: 'center'}}>
                 <Avatar.Icon size={40} icon="car-connected" style={{backgroundColor: '#E8F5E9', marginRight: 16}} color="#2E7D32" />
                 <View>
                     <Text variant="titleMedium" style={{fontWeight: 'bold'}}>{selectedAsset.license_plate}</Text>
                     <Text variant="bodyMedium">{selectedAsset.make} {selectedAsset.model} • {selectedAsset.customers?.full_name}</Text>
                     <Text variant="labelSmall" style={{color: '#757575'}}>Verified File Context</Text>
                 </View>
             </View>
          </Surface>
      );
  }

  return (
    <Surface style={styles.card} elevation={1}>
        <Text variant="titleMedium" style={styles.headerTitle}>Unified Asset Search (Phase 1)</Text>
        
        <Searchbar
            placeholder="Search by Mobile No. or Reg Plate..."
            onChangeText={setQuery}
            value={query}
            style={{ backgroundColor: '#F5F5F5', marginBottom: 8 }}
            inputStyle={{ minHeight: 48 }}
            elevation={0}
        />

        {loading && <ActivityIndicator style={{marginTop: 16}} />}

        {query.length >= 3 && !loading && results.length > 0 && (
            <View style={styles.resultsBox}>
                {results.map((r, i) => (
                    <React.Fragment key={r.id}>
                        <List.Item
                            title={`${r.license_plate} - ${r.make} ${r.model}`}
                            description={`${r.customers?.full_name} (${r.customers?.phone})`}
                            left={props => <List.Icon {...props} icon="car" color="#1976D2" />}
                            onPress={() => handleSelect(r)}
                            style={{ paddingVertical: 4 }}
                        />
                        {i < results.length - 1 && <Divider />}
                    </React.Fragment>
                ))}
            </View>
        )}

        {query.length >= 3 && !loading && results.length === 0 && (
            <View style={styles.notFoundBox}>
                <Text style={{color: '#757575', marginBottom: 12}}>No exact matches found for "{query}".</Text>
                <Button mode="contained" icon="plus" onPress={() => { setQaPhone(query); setShowQuickAdd(true); }} buttonColor="#388E3C">
                    Register New Target Asset
                </Button>
            </View>
        )}

        {/* INLINE RAPID ADD MODAL */}
        <Modal visible={showQuickAdd} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowQuickAdd(false)}>
            <SafeAreaView style={{flex: 1, backgroundColor: '#FFFFFF'}}>
                <View style={styles.modalHeader}>
                    <Text variant="titleLarge" style={{fontWeight: 'bold'}}>Rapid Registration</Text>
                    <Button onPress={() => setShowQuickAdd(false)}>Cancel</Button>
                </View>
                <ScrollView contentContainerStyle={{padding: 24}}>
                    <Text variant="titleMedium" style={{color: '#1976D2', marginBottom: 16}}>Step 1: Customer Details</Text>
                    <TextInput mode="outlined" label="Mobile Number *" value={qaPhone} onChangeText={setQaPhone} keyboardType="numeric" maxLength={10} style={{marginBottom: 16}} />
                    <TextInput mode="outlined" label="Full Name *" value={qaName} onChangeText={setQaName} style={{marginBottom: 24}} autoCapitalize="words"/>

                    <Divider style={{marginBottom: 24}} />

                    <Text variant="titleMedium" style={{color: '#1976D2', marginBottom: 16}}>Step 2: Vehicle Details</Text>
                    <TextInput mode="outlined" label="Registration Number *" value={qaPlate} onChangeText={setQaPlate} autoCapitalize="characters" style={{marginBottom: 16}} />
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32}}>
                        <TextInput mode="outlined" label="Make (e.g. Honda) *" value={qaMake} onChangeText={setQaMake} style={{width: '48%'}} />
                        <TextInput mode="outlined" label="Model (e.g. Civic) *" value={qaModel} onChangeText={setQaModel} style={{width: '48%'}} />
                    </View>

                    <Button mode="contained" onPress={executeQuickAdd} loading={qaLoading} style={{paddingVertical: 8, backgroundColor: '#1976D2'}}>
                        Confirm & Bind to Job Card
                    </Button>
                </ScrollView>
            </SafeAreaView>
        </Modal>

    </Surface>
  );
};

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 12, marginBottom: 16, backgroundColor: '#FFFFFF' },
  headerTitle: { fontWeight: 'bold', color: '#1976D2', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#EEEEEE', paddingBottom: 8 },
  resultsBox: {
      marginTop: 8,
      borderWidth: 1,
      borderColor: '#E0E0E0',
      borderRadius: 8,
      backgroundColor: '#FAFAFA'
  },
  notFoundBox: {
      marginTop: 16,
      alignItems: 'center',
      padding: 16,
      backgroundColor: '#F5F5F5',
      borderRadius: 8
  },
  modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#EEEEEE'
  }
});
