import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, Alert, KeyboardAvoidingView, Modal, SafeAreaView, FlatList, SectionList } from 'react-native';
import { Text, TextInput, Button, Surface, Divider, SegmentedButtons, IconButton, Searchbar, List, Chip } from 'react-native-paper';
import { supabase } from '../../lib/supabase';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { generateInvoicePDF, InvoiceData } from '../../utils/invoiceGenerator';
import { deductInventoryStock } from '../../utils/inventory';

type Props = NativeStackScreenProps<RootStackParamList, 'BillingForm'>;

interface LineItem {
  id: string;
  name: string;
  cost: string;
  inventoryItemId?: string;
}

import { PART_CATEGORIES } from '../../constants/parts';

export const BillingScreen: React.FC<Props> = ({ route, navigation }) => {
  const { garageId, jobId } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [jobCardNumber, setJobCardNumber] = useState('');
  const [customerInfo, setCustomerInfo] = useState<any>({});
  const [vehicleInfo, setVehicleInfo] = useState<any>({});
  const [garageName, setGarageName] = useState('Garage Manager');

  // Financial State
  const [partLines, setPartLines] = useState<LineItem[]>([]);
  const [labourTotal, setLabourTotal] = useState('');
  const [miscLines, setMiscLines] = useState<LineItem[]>([]);
  
  // Modifiers
  const [discount, setDiscount] = useState('0');
  const [cgstPercent, setCgstPercent] = useState('9'); // Default 9%
  const [sgstPercent, setSgstPercent] = useState('9'); // Default 9%
  
  // Payment
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [invoiceStatus, setInvoiceStatus] = useState('Paid');

  // Parts Picker State
  const [showPartPicker, setShowPartPicker] = useState(false);
  const [partSearch, setPartSearch] = useState('');
  const [inventoryItems, setInventoryItems] = useState<{id: string; part_name: string; price: number; stock_quantity: number}[]>([]);

  useEffect(() => {
    if (showPartPicker && garageId) {
      supabase.from('inventory').select('id, part_name, price, stock_quantity').eq('garage_id', garageId)
        .then(({ data }) => setInventoryItems(data || []));
    }
  }, [showPartPicker, garageId]);

  useEffect(() => {
    // Also fetch Garage Name
    supabase.from('garages').select('garage_name').eq('id', garageId).single().then(({ data }) => setGarageName(data?.garage_name || 'Garage Manager'));

    const fetchJob = async () => {
      try {
        const { data, error } = await supabase
          .from('job_cards')
          .select(`
            job_card_number, parts_lines, labour_cost,
            vehicles!inner(make, model, license_plate, customers!inner(full_name, phone))
          `)
          .eq('id', jobId)
          .eq('garage_id', garageId)
          .single();
        
        if (error) throw error;

        if (data) {
          setJobCardNumber(data.job_card_number);
          const vehicleInfoRaw: any = data.vehicles || {};
          setVehicleInfo(vehicleInfoRaw);
          setCustomerInfo(vehicleInfoRaw.customers || {});
          // Load original parts
          if (data.parts_lines && Array.isArray(data.parts_lines)) {
            setPartLines(data.parts_lines.map((p: any) => ({
              id: p.id || String(Date.now() + Math.random()), 
              name: p.name, 
              cost: String(p.cost || 0)
            })));
          }
          setLabourTotal(String(data.labour_cost || 0));
        }
      } catch (err: any) {
        const msg = err.message || 'This job card was not found for the selected garage.';
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Error', msg);
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [garageId, jobId, navigation]);

  // Derived calculations
  const partsSum = partLines.reduce((sum, item) => sum + (parseFloat(item.cost) || 0), 0);
  const miscSum = miscLines.reduce((sum, item) => sum + (parseFloat(item.cost) || 0), 0);
  const labourAmt = parseFloat(labourTotal) || 0;
  
  const cgstAmt = Math.round(labourAmt * ((parseFloat(cgstPercent) || 0) / 100));
  const sgstAmt = Math.round(labourAmt * ((parseFloat(sgstPercent) || 0) / 100));
  const discountAmt = parseFloat(discount) || 0;

  const grandTotal = partsSum + miscSum + labourAmt + cgstAmt + sgstAmt - discountAmt;

  const handleAddPart = (name: string, inventoryItemId?: string, price?: number) => {
    const newLine: LineItem = { 
      id: String(Date.now() + Math.random()), 
      name: name === 'Custom Part' ? '' : name, 
      cost: price != null ? String(price) : '',
      inventoryItemId
    };
    setPartLines([...partLines, newLine]);
    setShowPartPicker(false);
    setPartSearch('');
  };
  const handleUpdatePart = (id: string, field: 'name'|'cost', val: string) => {
    setPartLines(prev => prev.map(p => p.id === id ? { ...p, [field]: val } : p));
  };
  const handleRemovePart = (id: string) => {
    setPartLines(prev => prev.filter(p => p.id !== id));
  };

  const handleAddMisc = () => {
    setMiscLines([...miscLines, { id: String(Date.now()), name: '', cost: '' }]);
  };
  const handleUpdateMisc = (id: string, field: 'name'|'cost', val: string) => {
    setMiscLines(prev => prev.map(m => m.id === id ? { ...m, [field]: val } : m));
  };
  const handleRemoveMisc = (id: string) => {
    setMiscLines(prev => prev.filter(m => m.id !== id));
  };

  const onSubmit = async () => {
    if (grandTotal < 0) {
      const msg = "Grand total cannot be negative.";
      if (Platform.OS === 'web') window.alert(msg); else Alert.alert("Error", msg);
      return;
    }

    setSubmitting(true);
    try {
      // Check if a draft bill already exists
      const { data: existingBill } = await supabase.from('bills').select('id, invoice_number').eq('job_card_id', jobId).single();
      
      const invoiceNumber = existingBill?.invoice_number || `INV-${Date.now().toString().slice(-6)}`;
      
      const payload = {
        garage_id: garageId,
        job_card_id: jobId,
        invoice_number: invoiceNumber,
        parts_total: partsSum,
        manual_parts: partLines,
        labour_total: labourAmt,
        misc_items: miscLines,
        discount: discountAmt,
        cgst_amount: cgstAmt,
        sgst_amount: sgstAmt,
        grand_total: grandTotal,
        payment_mode: paymentMode,
        status: invoiceStatus
      };

      if (existingBill) {
        const { error: updateError } = await supabase.from('bills').update(payload).eq('id', existingBill.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('bills').insert(payload);
        if (insertError) throw insertError;
      }

      await deductInventoryStock(garageId, partLines);

      const { error: updateError } = await supabase
        .from('job_cards')
        .update({ payment_status: invoiceStatus })
        .eq('id', jobId)
        .eq('garage_id', garageId);
      if (updateError) throw updateError;

      // ── Generate PDF ──
      try {
        const invoiceData: InvoiceData = {
          garageName,
          invoiceNumber,
          date: new Date().toISOString(),
          customerName: customerInfo.full_name || 'Customer',
          customerPhone: customerInfo.phone || 'N/A',
          vehicleMake: vehicleInfo.make || 'Unknown',
          vehicleModel: vehicleInfo.model || 'Vehicle',
          licensePlate: vehicleInfo.license_plate || 'N/A',
          jobCardNumber,
          partsLines: partLines.map(p => ({ name: p.name, cost: parseFloat(p.cost) || 0 })),
          miscLines: miscLines.map(m => ({ name: m.name, cost: parseFloat(m.cost) || 0 })),
          partsTotal: partsSum,
          labourTotal: labourAmt,
          miscTotal: miscSum,
          cgstAmount: cgstAmt,
          sgstAmount: sgstAmt,
          discount: discountAmt,
          grandTotal: grandTotal,
          paymentMode,
        };
        await generateInvoicePDF(invoiceData);
      } catch (pdfErr) {
        console.warn("Could not generate PDF right now", pdfErr);
      }
      
      navigation.goBack();
      if (Platform.OS === 'web') window.alert("Bill generated successfully!");
      else Alert.alert("Success", "Bill generated successfully!");
      
    } catch (err: any) {
      if (Platform.OS === 'web') window.alert("Error: " + err.message);
      else Alert.alert("Error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F5F5F5' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Surface style={styles.card} elevation={1}>
          <Text variant="titleMedium" style={styles.headerTitle}>Job Card: {jobCardNumber}</Text>

          {/* Parts Section */}
          <View style={styles.section}>
            <Text variant="labelLarge" style={styles.tableHead}>Parts List</Text>
            {partLines.map((part) => (
              <View key={part.id} style={styles.lineRow}>
                <TextInput style={[styles.inputSm, { flex: 2 }]} mode="outlined" value={part.name} onChangeText={v => handleUpdatePart(part.id, 'name', v)} placeholder="Part Name" />
                <TextInput style={[styles.inputSm, { flex: 1, marginHorizontal: 8 }]} mode="outlined" value={part.cost} onChangeText={v => handleUpdatePart(part.id, 'cost', v)} placeholder="Price" keyboardType="numeric" />
                <IconButton icon="close" size={20} iconColor="#D32F2F" onPress={() => handleRemovePart(part.id)} style={{ margin: 0, padding: 0 }} />
              </View>
            ))}
            <Button mode="text" onPress={() => setShowPartPicker(true)} icon="plus">Add Part Entry</Button>
            <Text style={styles.subtotalTxt}>Parts Subtotal: ₹{partsSum}</Text>
          </View>

          <Divider style={styles.divider} />

          {/* Labour Section */}
          <View style={styles.section}>
             <Text variant="labelLarge" style={styles.tableHead}>Labour Total</Text>
             <TextInput
               mode="outlined"
               label="Total Labour Cost"
               value={labourTotal}
               onChangeText={setLabourTotal}
               keyboardType="numeric"
               left={<TextInput.Affix text="₹" />}
               style={{ backgroundColor: '#FFFFFF' }}
             />
          </View>

          <Divider style={styles.divider} />

          {/* Misc Section */}
          <View style={styles.section}>
            <Text variant="labelLarge" style={styles.tableHead}>Miscellaneous / Other</Text>
            {miscLines.map((misc) => (
              <View key={misc.id} style={styles.lineRow}>
                <TextInput style={[styles.inputSm, { flex: 2 }]} mode="outlined" value={misc.name} onChangeText={v => handleUpdateMisc(misc.id, 'name', v)} placeholder="E.g. Consumables" />
                <TextInput style={[styles.inputSm, { flex: 1, marginHorizontal: 8 }]} mode="outlined" value={misc.cost} onChangeText={v => handleUpdateMisc(misc.id, 'cost', v)} placeholder="Price" keyboardType="numeric" />
                <IconButton icon="close" size={20} iconColor="#D32F2F" onPress={() => handleRemoveMisc(misc.id)} style={{ margin: 0, padding: 0 }} />
              </View>
            ))}
            <Button mode="text" onPress={handleAddMisc} icon="plus">Add Misc Entry</Button>
          </View>

        </Surface>

        <Surface style={[styles.card, { marginTop: 16 }]} elevation={1}>
          <Text variant="titleMedium" style={styles.headerTitle}>Taxes & Adjustments</Text>
          
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
             <TextInput mode="outlined" label="CGST % (Labour)" value={cgstPercent} onChangeText={setCgstPercent} keyboardType="numeric" style={{ flex: 1, backgroundColor: '#FFFFFF' }} />
             <TextInput mode="outlined" label="SGST % (Labour)" value={sgstPercent} onChangeText={setSgstPercent} keyboardType="numeric" style={{ flex: 1, backgroundColor: '#FFFFFF' }} />
          </View>

          <TextInput
            mode="outlined"
            label="Discount Amount"
            value={discount}
            onChangeText={setDiscount}
            keyboardType="numeric"
            left={<TextInput.Affix text="₹" />}
            style={{ backgroundColor: '#FFFFFF' }}
          />

          <Divider style={{ marginVertical: 16 }} />
          
          <Text variant="titleMedium" style={{ marginBottom: 8, fontWeight: 'bold' }}>Payment Mode</Text>
          <SegmentedButtons
            value={paymentMode}
            onValueChange={setPaymentMode}
            buttons={[{ value: 'Cash', label: 'Cash' }, { value: 'UPI', label: 'UPI' }, { value: 'Card', label: 'Card' }]}
            style={{ marginBottom: 16 }}
          />
          <Text variant="titleMedium" style={{ marginBottom: 8, fontWeight: 'bold' }}>Invoice Status</Text>
          <SegmentedButtons
            value={invoiceStatus}
            onValueChange={setInvoiceStatus}
            buttons={[{ value: 'Draft', label: 'Draft' }, { value: 'Unpaid', label: 'Unpaid' }, { value: 'Paid', label: 'Paid' }]}
            style={{ marginBottom: 16 }}
          />
        </Surface>

        {/* Totals Summary */}
        <Surface style={[styles.card, { marginTop: 16, backgroundColor: '#E3F2FD' }]} elevation={1}>
           <View style={styles.totRow}><Text>Parts Total:</Text><Text>₹{partsSum}</Text></View>
           <View style={styles.totRow}><Text>Labour Total:</Text><Text>₹{labourAmt}</Text></View>
           <View style={styles.totRow}><Text>Misc Total:</Text><Text>₹{miscSum}</Text></View>
           <View style={styles.totRow}><Text>CGST (on Labour):</Text><Text>₹{cgstAmt}</Text></View>
           <View style={styles.totRow}><Text>SGST (on Labour):</Text><Text>₹{sgstAmt}</Text></View>
           <View style={styles.totRow}><Text style={{ color: '#D32F2F' }}>Discount:</Text><Text style={{ color: '#D32F2F' }}>-₹{discountAmt}</Text></View>
           
           <Divider style={{ marginVertical: 12 }} />
           
           <View style={styles.totRow}>
              <Text variant="titleLarge" style={{ fontWeight: 'bold', color: '#1565C0' }}>Grand Total</Text>
              <Text variant="titleLarge" style={{ fontWeight: 'bold', color: '#1565C0' }}>₹{grandTotal}</Text>
           </View>
        </Surface>

        <Button
          mode="contained"
          onPress={onSubmit}
          loading={submitting}
          style={{ marginTop: 24, borderRadius: 8 }}
          contentStyle={{ paddingVertical: 8 }}
          buttonColor="#2E7D32"
          icon="check-circle"
        >
          Generate Invoice & Close
        </Button>
      </ScrollView>

      {/* ── PARTS PICKER MODAL ── */}
      <Modal visible={showPartPicker} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowPartPicker(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
            <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>Select Part</Text>
            <Button onPress={() => { setShowPartPicker(false); setPartSearch(''); }}>Close</Button>
          </View>
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <Searchbar placeholder="Search parts…" value={partSearch} onChangeText={setPartSearch} elevation={0} style={{ backgroundColor: '#F5F5F5' }} />
          </View>

          {/* ── Inventory Items (DB) */}
          {inventoryItems.length > 0 && (
            <>
              <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#E8F5E9' }}>
                <Text variant="labelMedium" style={{ color: '#2E7D32', fontWeight: 'bold' }}>📦 FROM INVENTORY (auto-fills price)</Text>
              </View>
              {inventoryItems
                .filter(i => i.part_name.toLowerCase().includes(partSearch.toLowerCase()))
                .map(inv => (
                  <React.Fragment key={inv.id}>
                    <List.Item
                      title={inv.part_name}
                      description={`₹${inv.price} / unit  •  ${inv.stock_quantity} in stock`}
                      descriptionStyle={{ color: inv.stock_quantity <= 5 ? '#C62828' : '#616161' }}
                      left={props => <List.Icon {...props} icon="package-variant" color="#388E3C" />}
                      right={() => (
                        <Chip compact style={{ backgroundColor: inv.stock_quantity <= 5 ? '#FFEBEE' : '#E8F5E9', alignSelf: 'center' }}>
                          <Text style={{ fontSize: 10, color: inv.stock_quantity <= 5 ? '#C62828' : '#2E7D32' }}>
                            {inv.stock_quantity <= 5 ? '⚠️ Low' : 'In Stock'}
                          </Text>
                        </Chip>
                      )}
                      onPress={() => handleAddPart(inv.part_name, inv.id, inv.price)}
                    />
                    <Divider />
                  </React.Fragment>
                ))}
            </>
          )}

          {/* ── Common Parts Catalogue */}
          {(() => {
            const filteredCategories = PART_CATEGORIES.map(cat => ({
              title: cat.title,
              data: cat.data.filter((item: string) => item.toLowerCase().includes(partSearch.toLowerCase()))
            })).filter(cat => cat.data.length > 0);

            return (
              <SectionList
                sections={filteredCategories}
                keyExtractor={item => item}
                renderSectionHeader={({ section: { title } }) => (
                  <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#E3F2FD' }}>
                    <Text variant="labelMedium" style={{ color: '#1976D2', fontWeight: 'bold', letterSpacing: 0.5 }}>{title}</Text>
                  </View>
                )}
                renderItem={({ item }) => (
                  <>
                    <List.Item
                      title={item}
                      left={props => (
                        <List.Icon
                          {...props}
                          icon={item === 'Custom Part' ? 'pencil-outline' : 'cog-outline'}
                          color={item === 'Custom Part' ? '#1976D2' : '#757575'}
                        />
                      )}
                      onPress={() => handleAddPart(item)}
                    />
                    <Divider />
                  </>
                )}
                ListEmptyComponent={
                  <Text style={{ padding: 24, textAlign: 'center', color: '#9E9E9E' }}>
                    No parts found. Try a different search or use "Custom Part".
                  </Text>
                }
              />
            );
          })()}
        </SafeAreaView>
      </Modal>

    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 60 },
  card: { padding: 16, borderRadius: 12, backgroundColor: '#FFFFFF' },
  headerTitle: { fontWeight: 'bold', color: '#455A64', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#EEEEEE', paddingBottom: 8 },
  section: { marginVertical: 8 },
  tableHead: { fontWeight: 'bold', color: '#1976D2', marginBottom: 8 },
  lineRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  inputSm: { height: 40, backgroundColor: '#FFFFFF', fontSize: 13 },
  divider: { marginVertical: 16 },
  subtotalTxt: { textAlign: 'right', fontWeight: 'bold', color: '#616161', marginTop: 4 },
  totRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
});
