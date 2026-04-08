import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Alert, Platform } from 'react-native';
import { Text, Surface, Button, IconButton, Searchbar, Chip } from 'react-native-paper';
import { supabase } from '../../lib/supabase';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { generateInvoicePDF, InvoiceData } from '../../utils/invoiceGenerator';

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

export const InvoiceListScreen: React.FC<Props> = ({ route }) => {
  const { garageId } = route.params;
  const [bills, setBills] = useState<BillSummary[]>([]);
  const [filteredBills, setFilteredBills] = useState<BillSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [garageName, setGarageName] = useState('Garage Manager');

  useEffect(() => {
    fetchData();
  }, [garageId]);

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
          manual_parts, misc_items,
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

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const lowerQ = query.toLowerCase();
    const filtered = bills.filter(b => 
      b.invoice_number.toLowerCase().includes(lowerQ) ||
      b.job_cards?.job_card_number?.toLowerCase().includes(lowerQ) ||
      b.job_cards?.vehicles?.license_plate?.toLowerCase().includes(lowerQ) ||
      b.job_cards?.vehicles?.customers?.full_name?.toLowerCase().includes(lowerQ)
    );
    setFilteredBills(filtered);
  };

  const handleViewInvoice = async (bill: BillSummary) => {
    setGeneratingFor(bill.id);
    try {
      const v = bill.job_cards?.vehicles as any;
      const c = v?.customers as any;

      const invoiceData: InvoiceData = {
        garageName,
        invoiceNumber: bill.invoice_number,
        date: bill.created_at,
        customerName: c?.full_name || 'Customer',
        customerPhone: c?.phone || 'N/A',
        vehicleMake: v?.make || 'Unknown',
        vehicleModel: v?.model || 'Vehicle',
        licensePlate: v?.license_plate || 'N/A',
        jobCardNumber: bill.job_cards?.job_card_number || 'N/A',
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

      await generateInvoicePDF(invoiceData);
    } catch (err: any) {
      if (Platform.OS === 'web') window.alert('Failed to generate PDF: ' + err.message);
      else Alert.alert('Error', 'Failed to generate PDF: ' + err.message);
      console.log(err);
    } finally {
      setGeneratingFor(null);
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
                <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{c?.full_name || 'Unknown'}</Text>
                <Chip icon="car" compact style={styles.plateChip}>
                  {v?.license_plate || 'N/A'}
                </Chip>
              </View>

              <View style={styles.footerRow}>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <Text variant="bodySmall" style={{ color: '#757575' }}>{item.payment_mode}</Text>
                  {item.status === 'Paid' && (
                    <Chip compact style={{ backgroundColor: '#E8F5E9' }} textStyle={{ color: '#2E7D32', fontSize: 10 }}>Paid</Chip>
                  )}
                </View>
                <Button 
                  mode="contained-tonal" 
                  onPress={() => handleViewInvoice(item)} 
                  loading={isGenerating}
                  disabled={generatingFor !== null}
                  icon="file-document-outline"
                >
                  View PDF
                </Button>
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
