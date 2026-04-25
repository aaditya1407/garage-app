import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, Platform, Alert,
  KeyboardAvoidingView, Modal, SafeAreaView, FlatList, SectionList,
} from 'react-native';
import {
  Text, TextInput, Button, Surface, Divider, SegmentedButtons,
  IconButton, Searchbar, List, Chip,
} from 'react-native-paper';
import { supabase } from '../../lib/supabase';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { generateInvoicePDF, InvoiceData } from '../../utils/invoiceGenerator';
import { PART_CATEGORIES } from '../../constants/parts';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateInvoice'>;

interface LineItem {
  id: string;
  name: string;
  cost: string;
}

interface CustomerSummary {
  id: string;
  full_name: string;
  phone: string;
}

interface VehicleSummary {
  id: string;
  make: string;
  model: string;
  license_plate: string;
  customer_id: string;
}

export const CreateInvoiceScreen: React.FC<Props> = ({ route, navigation }) => {
  const { garageId } = route.params;

  const [garageName, setGarageName] = useState('Garage Manager');
  const [submitting, setSubmitting] = useState(false);

  // Customer / Vehicle selection
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [vehicles, setVehicles] = useState<VehicleSummary[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleSummary | null>(null);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');

  // Line items
  const [partLines, setPartLines] = useState<LineItem[]>([]);
  const [labourTotal, setLabourTotal] = useState('');
  const [miscLines, setMiscLines] = useState<LineItem[]>([]);

  // Tax & Payment
  const [discount, setDiscount] = useState('0');
  const [cgstPercent, setCgstPercent] = useState('9');
  const [sgstPercent, setSgstPercent] = useState('9');
  const [paymentMode, setPaymentMode] = useState('Cash');

  // Parts picker
  const [showPartPicker, setShowPartPicker] = useState(false);
  const [partSearch, setPartSearch] = useState('');
  const [inventoryItems, setInventoryItems] = useState<{ id: string; part_name: string; price: number; stock_quantity: number }[]>([]);

  // Custom reference / description
  const [referenceNote, setReferenceNote] = useState('');

  useEffect(() => {
    supabase.from('garages').select('garage_name').eq('id', garageId).single()
      .then(({ data }) => setGarageName(data?.garage_name || 'Garage Manager'));

    supabase.from('customers').select('id, full_name, phone').eq('garage_id', garageId).order('full_name')
      .then(({ data }) => setCustomers(data || []));
  }, [garageId]);

  // Load vehicles when customer is selected
  useEffect(() => {
    if (!selectedCustomer) { setVehicles([]); setSelectedVehicle(null); return; }
    supabase.from('vehicles')
      .select('id, make, model, license_plate, customer_id')
      .eq('customer_id', selectedCustomer.id)
      .then(({ data }) => setVehicles(data || []));
  }, [selectedCustomer]);

  // Load inventory when part picker opens
  useEffect(() => {
    if (showPartPicker && garageId) {
      supabase.from('inventory').select('id, part_name, price, stock_quantity').eq('garage_id', garageId)
        .then(({ data }) => setInventoryItems(data || []));
    }
  }, [showPartPicker, garageId]);

  // ── Derived totals ──
  const partsSum = partLines.reduce((s, i) => s + (parseFloat(i.cost) || 0), 0);
  const miscSum  = miscLines.reduce((s, i) => s + (parseFloat(i.cost) || 0), 0);
  const labourAmt = parseFloat(labourTotal) || 0;
  const cgstAmt = Math.round(labourAmt * ((parseFloat(cgstPercent) || 0) / 100));
  const sgstAmt = Math.round(labourAmt * ((parseFloat(sgstPercent) || 0) / 100));
  const discountAmt = parseFloat(discount) || 0;
  const grandTotal = partsSum + miscSum + labourAmt + cgstAmt + sgstAmt - discountAmt;

  // ── Parts handlers ──
  const handleAddPart = (name: string, price?: number) => {
    setPartLines(prev => [...prev, { id: String(Date.now() + Math.random()), name: name === 'Custom Part' ? '' : name, cost: price != null ? String(price) : '' }]);
    setShowPartPicker(false);
    setPartSearch('');
  };
  const handleUpdatePart = (id: string, field: 'name' | 'cost', val: string) =>
    setPartLines(prev => prev.map(p => p.id === id ? { ...p, [field]: val } : p));
  const handleRemovePart = (id: string) =>
    setPartLines(prev => prev.filter(p => p.id !== id));

  // ── Misc handlers ──
  const handleAddMisc = () => setMiscLines(prev => [...prev, { id: String(Date.now()), name: '', cost: '' }]);
  const handleUpdateMisc = (id: string, field: 'name' | 'cost', val: string) =>
    setMiscLines(prev => prev.map(m => m.id === id ? { ...m, [field]: val } : m));
  const handleRemoveMisc = (id: string) =>
    setMiscLines(prev => prev.filter(m => m.id !== id));

  // ── Submit ──
  const onSubmit = async () => {
    if (!selectedCustomer) {
      const msg = 'Please select a customer.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Validation', msg);
      return;
    }
    if (grandTotal < 0) {
      const msg = 'Grand total cannot be negative.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
      return;
    }

    setSubmitting(true);
    try {
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

      const payload = {
        garage_id: garageId,
        job_card_id: null,           // no linked job card
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
        status: 'Paid',
        customer_name: selectedCustomer.full_name,
        customer_phone: selectedCustomer.phone,
        vehicle_info: selectedVehicle
          ? `${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.license_plate})`
          : null,
        reference_note: referenceNote || null,
      };

      const { error: insertError } = await supabase.from('bills').insert(payload);
      if (insertError) throw insertError;

      // Generate PDF
      try {
        const invoiceData: InvoiceData = {
          garageName,
          invoiceNumber,
          date: new Date().toISOString(),
          customerName: selectedCustomer.full_name,
          customerPhone: selectedCustomer.phone,
          vehicleMake: selectedVehicle?.make || '',
          vehicleModel: selectedVehicle?.model || '',
          licensePlate: selectedVehicle?.license_plate || 'N/A',
          jobCardNumber: referenceNote || 'Direct Invoice',
          partsLines: partLines.map(p => ({ name: p.name, cost: parseFloat(p.cost) || 0 })),
          miscLines: miscLines.map(m => ({ name: m.name, cost: parseFloat(m.cost) || 0 })),
          partsTotal: partsSum,
          labourTotal: labourAmt,
          miscTotal: miscSum,
          cgstAmount: cgstAmt,
          sgstAmount: sgstAmt,
          discount: discountAmt,
          grandTotal,
          paymentMode,
        };
        await generateInvoicePDF(invoiceData);
      } catch (pdfErr) {
        console.warn('PDF generation failed', pdfErr);
      }

      navigation.goBack();
      const msg = `Invoice ${invoiceNumber} created successfully!`;
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Success', msg);
    } catch (err: any) {
      const msg = 'Error: ' + err.message;
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.full_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  );

  const filteredVehicles = vehicles.filter(v =>
    `${v.make} ${v.model} ${v.license_plate}`.toLowerCase().includes(vehicleSearch.toLowerCase())
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F5F5F5' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── Customer & Vehicle ── */}
        <Surface style={styles.card} elevation={1}>
          <Text variant="titleMedium" style={styles.headerTitle}>Customer & Vehicle</Text>

          {/* Customer selector */}
          <Text style={styles.fieldLabel}>Customer *</Text>
          <Button
            mode="outlined"
            icon={selectedCustomer ? 'account-check' : 'account-search'}
            onPress={() => setShowCustomerPicker(true)}
            style={styles.selectorBtn}
            contentStyle={{ justifyContent: 'flex-start' }}
          >
            {selectedCustomer ? selectedCustomer.full_name : 'Select Customer…'}
          </Button>
          {selectedCustomer && (
            <Text style={styles.subInfo}>📞 {selectedCustomer.phone}</Text>
          )}

          <View style={{ height: 12 }} />

          {/* Vehicle selector */}
          <Text style={styles.fieldLabel}>Vehicle (optional)</Text>
          <Button
            mode="outlined"
            icon={selectedVehicle ? 'car' : 'car-search'}
            onPress={() => {
              if (!selectedCustomer) {
                const msg = 'Please select a customer first.';
                Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Info', msg);
                return;
              }
              setShowVehiclePicker(true);
            }}
            style={styles.selectorBtn}
            contentStyle={{ justifyContent: 'flex-start' }}
            disabled={!selectedCustomer}
          >
            {selectedVehicle
              ? `${selectedVehicle.make} ${selectedVehicle.model} · ${selectedVehicle.license_plate}`
              : 'Select Vehicle…'}
          </Button>

          <View style={{ height: 12 }} />

          {/* Reference */}
          <TextInput
            mode="outlined"
            label="Reference / Note (optional)"
            value={referenceNote}
            onChangeText={setReferenceNote}
            placeholder="e.g. Walk-in service, Repair #1234"
            style={{ backgroundColor: '#fff' }}
          />
        </Surface>

        {/* ── Parts ── */}
        <Surface style={[styles.card, { marginTop: 16 }]} elevation={1}>
          <Text variant="titleMedium" style={styles.headerTitle}>Parts</Text>
          {partLines.map(part => (
            <View key={part.id} style={styles.lineRow}>
              <TextInput style={[styles.inputSm, { flex: 2 }]} mode="outlined" value={part.name} onChangeText={v => handleUpdatePart(part.id, 'name', v)} placeholder="Part Name" />
              <TextInput style={[styles.inputSm, { flex: 1, marginHorizontal: 8 }]} mode="outlined" value={part.cost} onChangeText={v => handleUpdatePart(part.id, 'cost', v)} placeholder="Price" keyboardType="numeric" />
              <IconButton icon="close" size={20} iconColor="#D32F2F" onPress={() => handleRemovePart(part.id)} style={{ margin: 0, padding: 0 }} />
            </View>
          ))}
          <Button mode="text" onPress={() => setShowPartPicker(true)} icon="plus">Add Part Entry</Button>
          <Text style={styles.subtotalTxt}>Parts Subtotal: ₹{partsSum}</Text>

          <Divider style={styles.divider} />

          {/* Labour */}
          <Text variant="labelLarge" style={styles.tableHead}>Labour Total</Text>
          <TextInput mode="outlined" label="Total Labour Cost" value={labourTotal} onChangeText={setLabourTotal} keyboardType="numeric" left={<TextInput.Affix text="₹" />} style={{ backgroundColor: '#fff' }} />

          <Divider style={styles.divider} />

          {/* Misc */}
          <Text variant="labelLarge" style={styles.tableHead}>Miscellaneous</Text>
          {miscLines.map(misc => (
            <View key={misc.id} style={styles.lineRow}>
              <TextInput style={[styles.inputSm, { flex: 2 }]} mode="outlined" value={misc.name} onChangeText={v => handleUpdateMisc(misc.id, 'name', v)} placeholder="Description" />
              <TextInput style={[styles.inputSm, { flex: 1, marginHorizontal: 8 }]} mode="outlined" value={misc.cost} onChangeText={v => handleUpdateMisc(misc.id, 'cost', v)} placeholder="Price" keyboardType="numeric" />
              <IconButton icon="close" size={20} iconColor="#D32F2F" onPress={() => handleRemoveMisc(misc.id)} style={{ margin: 0, padding: 0 }} />
            </View>
          ))}
          <Button mode="text" onPress={handleAddMisc} icon="plus">Add Misc Entry</Button>
        </Surface>

        {/* ── Taxes & Payment ── */}
        <Surface style={[styles.card, { marginTop: 16 }]} elevation={1}>
          <Text variant="titleMedium" style={styles.headerTitle}>Taxes & Payment</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <TextInput mode="outlined" label="CGST % (Labour)" value={cgstPercent} onChangeText={setCgstPercent} keyboardType="numeric" style={{ flex: 1, backgroundColor: '#fff' }} />
            <TextInput mode="outlined" label="SGST % (Labour)" value={sgstPercent} onChangeText={setSgstPercent} keyboardType="numeric" style={{ flex: 1, backgroundColor: '#fff' }} />
          </View>
          <TextInput mode="outlined" label="Discount Amount" value={discount} onChangeText={setDiscount} keyboardType="numeric" left={<TextInput.Affix text="₹" />} style={{ backgroundColor: '#fff', marginBottom: 16 }} />
          <Text variant="titleMedium" style={{ marginBottom: 8, fontWeight: 'bold' }}>Payment Mode</Text>
          <SegmentedButtons value={paymentMode} onValueChange={setPaymentMode} buttons={[{ value: 'Cash', label: 'Cash' }, { value: 'UPI', label: 'UPI' }, { value: 'Card', label: 'Card' }]} />
        </Surface>

        {/* ── Totals Summary ── */}
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
          disabled={submitting}
          style={{ marginTop: 24, borderRadius: 8 }}
          contentStyle={{ paddingVertical: 8 }}
          buttonColor="#1565C0"
          icon="file-document-plus"
        >
          Generate Invoice
        </Button>
      </ScrollView>

      {/* ── Customer Picker Modal ── */}
      <Modal visible={showCustomerPicker} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowCustomerPicker(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
            <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>Select Customer</Text>
            <Button onPress={() => { setShowCustomerPicker(false); setCustomerSearch(''); }}>Close</Button>
          </View>
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <Searchbar placeholder="Search name or phone…" value={customerSearch} onChangeText={setCustomerSearch} elevation={0} style={{ backgroundColor: '#F5F5F5' }} />
          </View>
          <FlatList
            data={filteredCustomers}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <>
                <List.Item
                  title={item.full_name}
                  description={item.phone}
                  left={props => <List.Icon {...props} icon="account" color="#1976D2" />}
                  onPress={() => {
                    setSelectedCustomer(item);
                    setSelectedVehicle(null);
                    setShowCustomerPicker(false);
                    setCustomerSearch('');
                  }}
                />
                <Divider />
              </>
            )}
            ListEmptyComponent={<Text style={{ padding: 24, textAlign: 'center', color: '#9E9E9E' }}>No customers found.</Text>}
          />
        </SafeAreaView>
      </Modal>

      {/* ── Vehicle Picker Modal ── */}
      <Modal visible={showVehiclePicker} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowVehiclePicker(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
            <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>Select Vehicle</Text>
            <Button onPress={() => { setShowVehiclePicker(false); setVehicleSearch(''); }}>Close</Button>
          </View>
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <Searchbar placeholder="Search vehicle…" value={vehicleSearch} onChangeText={setVehicleSearch} elevation={0} style={{ backgroundColor: '#F5F5F5' }} />
          </View>
          <FlatList
            data={filteredVehicles}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <>
                <List.Item
                  title={`${item.make} ${item.model}`}
                  description={item.license_plate}
                  left={props => <List.Icon {...props} icon="car" color="#388E3C" />}
                  onPress={() => {
                    setSelectedVehicle(item);
                    setShowVehiclePicker(false);
                    setVehicleSearch('');
                  }}
                />
                <Divider />
              </>
            )}
            ListEmptyComponent={<Text style={{ padding: 24, textAlign: 'center', color: '#9E9E9E' }}>No vehicles found for this customer.</Text>}
          />
        </SafeAreaView>
      </Modal>

      {/* ── Parts Picker Modal ── */}
      <Modal visible={showPartPicker} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowPartPicker(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
            <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>Select Part</Text>
            <Button onPress={() => { setShowPartPicker(false); setPartSearch(''); }}>Close</Button>
          </View>
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <Searchbar placeholder="Search parts…" value={partSearch} onChangeText={setPartSearch} elevation={0} style={{ backgroundColor: '#F5F5F5' }} />
          </View>

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
                      onPress={() => handleAddPart(inv.part_name, inv.price)}
                    />
                    <Divider />
                  </React.Fragment>
                ))}
            </>
          )}

          <SectionList
            sections={PART_CATEGORIES.map(cat => ({
              title: cat.title,
              data: cat.data.filter((item: string) => item.toLowerCase().includes(partSearch.toLowerCase())),
            })).filter(cat => cat.data.length > 0)}
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
                  left={props => <List.Icon {...props} icon={item === 'Custom Part' ? 'pencil-outline' : 'cog-outline'} color={item === 'Custom Part' ? '#1976D2' : '#757575'} />}
                  onPress={() => handleAddPart(item)}
                />
                <Divider />
              </>
            )}
            ListEmptyComponent={<Text style={{ padding: 24, textAlign: 'center', color: '#9E9E9E' }}>No parts found.</Text>}
          />
        </SafeAreaView>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 60 },
  card: { padding: 16, borderRadius: 12, backgroundColor: '#FFFFFF' },
  headerTitle: { fontWeight: 'bold', color: '#455A64', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#EEEEEE', paddingBottom: 8 },
  fieldLabel: { fontSize: 13, color: '#616161', marginBottom: 6, fontWeight: '600' },
  selectorBtn: { borderRadius: 8, borderColor: '#BDBDBD' },
  subInfo: { color: '#757575', fontSize: 12, marginTop: 4, marginLeft: 4 },
  divider: { marginVertical: 16 },
  tableHead: { fontWeight: 'bold', color: '#1976D2', marginBottom: 8 },
  lineRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  inputSm: { height: 40, backgroundColor: '#FFFFFF', fontSize: 13 },
  subtotalTxt: { textAlign: 'right', fontWeight: 'bold', color: '#616161', marginTop: 4 },
  totRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
});
