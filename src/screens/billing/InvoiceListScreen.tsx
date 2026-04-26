import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Alert, Platform } from 'react-native';
import { Text, Surface, Button, IconButton, Searchbar, Chip, SegmentedButtons } from 'react-native-paper';
import { supabase } from '../../lib/supabase';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/types';
import { generateInvoicePDF, generateAndUploadInvoicePDF, InvoiceData } from '../../utils/invoiceGenerator';
import { fetchGarageInfo } from '../../utils/garageInfo';

type Props = NativeStackScreenProps<RootStackParamList, 'InvoiceList'>;

interface BillSummary {
  id: string;
  invoice_number: string;
  created_at: string;
  grand_total: number;
  payment_mode: string;
  status: string;
  parts_total: number;
  labour_total: number;
  cgst_amount: number;
  sgst_amount: number;
  discount: number;
  manual_parts: any[];
  misc_items: any[];
  customer_name?: string;
  customer_phone?: string;
  vehicle_info?: string;
  reference_note?: string;
  job_cards: {
    job_card_number: string;
    vehicles: {
      make: string;
      model: string;
      license_plate: string;
      customers: {
        full_name: string;
        phone: string;
      };
    };
  };
}

export const InvoiceListScreen: React.FC<Props> = ({ route, navigation }) => {
  const { garageId } = route.params;
  const [bills, setBills] = useState<BillSummary[]>([]);
  const [filteredBills, setFilteredBills] = useState<BillSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [sendingWhatsAppFor, setSendingWhatsAppFor] = useState<string | null>(null);
  const [garageName, setGarageName] = useState('Garage Manager');
  const [statusFilter, setStatusFilter] = useState('All');

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [garageId])
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch Garage name
      const { data: gData } = await supabase.from('garages').select('garage_name').eq('id', garageId).single();
      if (gData) setGarageName(gData.garage_name);

      const { data, error } = await supabase
        .from('bills')
        .select(`
          id, invoice_number, created_at, grand_total, payment_mode, status,
          parts_total, labour_total, cgst_amount, sgst_amount, discount,
          manual_parts, misc_items, customer_name, customer_phone, vehicle_info, reference_note,
          job_cards (
            job_card_number,
            vehicles (
              make, model, license_plate,
              customers (full_name, phone)
            )
          )
        `)
        .eq('garage_id', garageId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const formattedData = (data || []) as unknown as BillSummary[];
      setBills(formattedData);
      setFilteredBills(formattedData);
    } catch (err) {
      console.error('Error fetching bills:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = bills;
    if (statusFilter !== 'All') {
      filtered = filtered.filter(b => b.status === statusFilter);
    }
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      filtered = filtered.filter(b => 
        b.invoice_number.toLowerCase().includes(lowerQ) ||
        b.customer_name?.toLowerCase().includes(lowerQ) ||
        b.vehicle_info?.toLowerCase().includes(lowerQ) ||
        b.reference_note?.toLowerCase().includes(lowerQ) ||
        b.job_cards?.job_card_number?.toLowerCase().includes(lowerQ) ||
        b.job_cards?.vehicles?.license_plate?.toLowerCase().includes(lowerQ) ||
        b.job_cards?.vehicles?.customers?.full_name?.toLowerCase().includes(lowerQ)
      );
    }
    setFilteredBills(filtered);
  }, [bills, searchQuery, statusFilter]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const buildInvoiceData = (bill: BillSummary): InvoiceData => {
    const v = bill.job_cards?.vehicles as any;
    const c = v?.customers as any;
    return {
      garageName,
      invoiceNumber: bill.invoice_number,
      date: bill.created_at,
      customerName: bill.customer_name || c?.full_name || 'Customer',
      customerPhone: bill.customer_phone || c?.phone || 'N/A',
      vehicleMake: bill.vehicle_info || v?.make || 'Unknown',
      vehicleModel: bill.vehicle_info ? '' : (v?.model || 'Vehicle'),
      licensePlate: bill.vehicle_info ? '' : (v?.license_plate || 'N/A'),
      jobCardNumber: bill.reference_note || bill.job_cards?.job_card_number || 'Direct Invoice',
      partsLines: Array.isArray(bill.manual_parts) ? bill.manual_parts.map((p: any) => ({ name: p.name, cost: parseFloat(p.cost) || 0 })) : [],
      miscLines: Array.isArray(bill.misc_items) ? bill.misc_items.map((m: any) => ({ name: m.name, cost: parseFloat(m.cost) || 0 })) : [],
      partsTotal: bill.parts_total || 0,
      labourTotal: bill.labour_total || 0,
      miscTotal: Array.isArray(bill.misc_items) ? bill.misc_items.reduce((s: number, i: any) => s + (parseFloat(i.cost) || 0), 0) : 0,
      cgstAmount: bill.cgst_amount || 0,
      sgstAmount: bill.sgst_amount || 0,
      discount: bill.discount || 0,
      grandTotal: bill.grand_total || 0,
      paymentMode: bill.payment_mode || 'Cash',
    };
  };

  const handleViewInvoice = async (bill: BillSummary) => {
    setGeneratingFor(bill.id);
    try {
      await generateInvoicePDF(buildInvoiceData(bill));
    } catch (err: any) {
      if (Platform.OS === 'web') window.alert('Failed to generate PDF: ' + err.message);
      else Alert.alert('Error', 'Failed to generate PDF: ' + err.message);
      console.log(err);
    } finally {
      setGeneratingFor(null);
    }
  };

  const handleWhatsAppInvoice = async (bill: BillSummary) => {
    const phone = bill.customer_phone || bill.job_cards?.vehicles?.customers?.phone;
    if (!phone) {
      Alert.alert('Error', 'No customer phone number available to send WhatsApp.');
      return;
    }

    setSendingWhatsAppFor(bill.id);
    try {
      const invoiceData = buildInvoiceData(bill);
      
      const [whatsappService, garageInfo, pdfUrl] = await Promise.all([
        import('../../services/whatsappService'),
        fetchGarageInfo(garageId),
        generateAndUploadInvoicePDF(invoiceData, garageId)
      ]);

      const success = await whatsappService.sendMsg91WhatsApp(phone, {
        name: 'invoice_generated_template',
        variables: [
          invoiceData.customerName,
          invoiceData.invoiceNumber,
          invoiceData.jobCardNumber,
          `₹${invoiceData.grandTotal.toLocaleString('en-IN')}`,
          garageInfo?.garage_name || 'Our Garage',
          garageInfo?.phone || ''
        ],
        documentUrl: pdfUrl || undefined,
        documentFileName: `Invoice_${invoiceData.invoiceNumber}.pdf`
      });

      if (success) {
        if (bill.status === 'Draft') {
          await supabase.from('bills').update({ status: 'Unpaid' }).eq('id', bill.id);
          setBills(prev => prev.map(b => b.id === bill.id ? { ...b, status: 'Unpaid' } : b));
        }
        if (Platform.OS !== 'web') Alert.alert('Success', 'Invoice sent via WhatsApp!');
      } else {
        throw new Error('Failed to send WhatsApp message. Check console for details.');
      }
    } catch (err: any) {
      if (Platform.OS === 'web') window.alert('Failed to send WhatsApp: ' + err.message);
      else Alert.alert('Error', 'Failed to send WhatsApp: ' + err.message);
      console.error(err);
    } finally {
      setSendingWhatsAppFor(null);
    }
  };

  const handleRecordPayment = async (bill: BillSummary) => {
    try {
      const { error } = await supabase.from('bills').update({ status: 'Paid' }).eq('id', bill.id);
      if (error) throw error;
      setBills(prev => prev.map(b => b.id === bill.id ? { ...b, status: 'Paid' } : b));
      if (Platform.OS === 'web') window.alert('Payment recorded successfully!');
      else Alert.alert('Success', 'Payment recorded successfully!');
    } catch (err: any) {
      if (Platform.OS === 'web') window.alert('Error recording payment: ' + err.message);
      else Alert.alert('Error', 'Error recording payment: ' + err.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976D2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Surface style={styles.header} elevation={1}>
        <Searchbar
          placeholder="Search by invoice, customer, plate..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchbar}
          elevation={0}
        />
        <SegmentedButtons
          value={statusFilter}
          onValueChange={setStatusFilter}
          buttons={[
            { value: 'All', label: 'All' },
            { value: 'Draft', label: 'Draft' },
            { value: 'Unpaid', label: 'Unpaid' },
            { value: 'Paid', label: 'Paid' },
          ]}
          style={{ marginTop: 12 }}
        />
      </Surface>

      <FlatList
        data={filteredBills}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={{ color: '#757575', fontSize: 16 }}>No invoices found.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const v = item.job_cards?.vehicles as any;
          const c = v?.customers as any;
          const isGenerating = generatingFor === item.id;
          const customerName = item.customer_name || c?.full_name || 'Unknown';
          const vehicleLabel = item.vehicle_info || v?.license_plate || 'N/A';

          return (
            <Surface style={styles.card} elevation={1}>
              <View style={styles.cardHeader}>
                <View>
                  <Text variant="titleMedium" style={styles.invoiceNumber}>{item.invoice_number}</Text>
                  <Text variant="bodySmall" style={styles.dateText}>{new Date(item.created_at).toLocaleDateString()}</Text>
                </View>
                <Text variant="titleMedium" style={styles.amount}>₹{item.grand_total}</Text>
              </View>

              <View style={styles.detailsRow}>
                <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{customerName}</Text>
                <Chip icon="car" compact style={styles.plateChip}>
                  {vehicleLabel}
                </Chip>
              </View>

              <View style={styles.footerRow}>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <Text variant="bodySmall" style={{ color: '#757575' }}>{item.payment_mode}</Text>
                  {item.status === 'Paid' && (
                    <Chip compact style={{ backgroundColor: '#E8F5E9' }} textStyle={{ color: '#2E7D32', fontSize: 10 }}>Paid</Chip>
                  )}
                  {item.status === 'Unpaid' && (
                    <Chip compact style={{ backgroundColor: '#FFF3E0' }} textStyle={{ color: '#E65100', fontSize: 10 }}>Unpaid</Chip>
                  )}
                  {item.status === 'Draft' && (
                    <Chip compact style={{ backgroundColor: '#ECEFF1' }} textStyle={{ color: '#607D8B', fontSize: 10 }}>Draft</Chip>
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {item.status === 'Unpaid' && (
                    <Button
                      mode="contained-tonal"
                      buttonColor="#E8F5E9"
                      textColor="#2E7D32"
                      onPress={() => handleRecordPayment(item)}
                      icon="cash-check"
                      compact
                    >
                      Pay
                    </Button>
                  )}
                  {(item.status === 'Draft' || item.status === 'Unpaid') && (
                    <Button 
                      mode="contained-tonal" 
                      onPress={() => navigation.navigate('CreateInvoice', { garageId, editBillId: item.id })} 
                      icon="pencil"
                      compact
                    >
                      Edit
                    </Button>
                  )}
                  <Button 
                    mode="contained-tonal" 
                    onPress={() => handleViewInvoice(item)} 
                    loading={isGenerating}
                    disabled={generatingFor !== null || sendingWhatsAppFor !== null}
                    icon="file-document-outline"
                    compact
                  >
                    View
                  </Button>
                  <Button 
                    mode="contained" 
                    buttonColor="#25D366" // WhatsApp green
                    onPress={() => handleWhatsAppInvoice(item)} 
                    loading={sendingWhatsAppFor === item.id}
                    disabled={sendingWhatsAppFor !== null || generatingFor !== null}
                    icon="whatsapp"
                    compact
                  >
                    Send
                  </Button>
                </View>
              </View>
            </Surface>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  searchbar: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  listContent: {
    padding: 16,
  },
  card: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  invoiceNumber: {
    fontWeight: 'bold',
    color: '#1565C0',
  },
  dateText: {
    color: '#757575',
    marginTop: 2,
  },
  amount: {
    fontWeight: 'bold',
    color: '#212121',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  plateChip: {
    backgroundColor: '#E3F2FD',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 48,
  }
});
