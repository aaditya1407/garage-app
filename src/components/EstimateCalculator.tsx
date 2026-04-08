import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, Modal, FlatList, SectionList,
  TouchableOpacity, SafeAreaView, Platform,
} from 'react-native';
import {
  TextInput, Text, SegmentedButtons, Divider, Surface,
  Button, IconButton, List, Searchbar, Chip,
} from 'react-native-paper';

import { PART_CATEGORIES } from '../constants/parts';

export interface PartLineItem {
  id: string;
  name: string;
  isCustom: boolean;
  cost: string;
  inventoryItemId?: string; // set when selected from inventory — triggers stock deduction
}

export interface EstimatePayload {
  partLines: PartLineItem[];
  partsCost: number;
  labourCost: number;
  gstPercent: number;
  totalCost: number;
  approvalStatus: 'Pending' | 'Approved' | 'Rejected';
}

interface Props {
  onChange: (payload: EstimatePayload) => void;
  garageId?: string; // optional: when provided, shows inventory items in picker
}

// ─── Component ────────────────────────────────────────────────────────────────
export const EstimateCalculator: React.FC<Props> = ({ onChange, garageId }) => {
  const [partLines, setPartLines] = useState<PartLineItem[]>([]);
  const [labourCost, setLabourCost] = useState('');
  const [gstPercent, setGstPercent] = useState('0');
  const [approvalStatus, setApprovalStatus] = useState('Pending');

  // Parts picker modal state
  const [showPartPicker, setShowPartPicker] = useState(false);
  const [partSearch, setPartSearch] = useState('');

  // Inventory items from DB
  const [inventoryItems, setInventoryItems] = useState<{id: string; part_name: string; price: number; stock_quantity: number}[]>([]);

  // ── Derived: total parts cost
  const partsCost = partLines.reduce(
    (sum, l) => sum + (parseFloat(l.cost) || 0),
    0,
  );

  // ── Derived: grand total
  const labour = parseFloat(labourCost) || 0;
  const gstRate = parseFloat(gstPercent) || 0;
  const taxAmount = Math.round(labour * (gstRate / 100)); // GST on labour only
  const totalCost = Math.round(partsCost + labour + taxAmount);

  // ── Bubble up changes
  useEffect(() => {
    onChange({
      partLines,
      partsCost,
      labourCost: parseFloat(labourCost) || 0,
      gstPercent: parseFloat(gstPercent) || 0,
      totalCost,
      approvalStatus: approvalStatus as EstimatePayload['approvalStatus'],
    });
  }, [partLines, labourCost, gstPercent, approvalStatus]);

  // ── Fetch inventory when picker opens
  useEffect(() => {
    if (showPartPicker && garageId) {
      import('../lib/supabase').then(({ supabase }) => {
        supabase.from('inventory').select('id, part_name, price, stock_quantity').eq('garage_id', garageId)
          .then(({ data }) => setInventoryItems(data || []));
      });
    }
  }, [showPartPicker, garageId]);

  // ── Helpers: add from catalogue or custom
  const addPart = (name: string, inventoryItemId?: string, price?: number) => {
    const newLine: PartLineItem = {
      id: `${Date.now()}-${Math.random()}`,
      name: name === 'Custom Part' ? '' : name,
      isCustom: name === 'Custom Part',
      cost: price != null ? String(price) : '',
      inventoryItemId,
    };
    setPartLines(prev => [...prev, newLine]);
    setShowPartPicker(false);
    setPartSearch('');
  };

  const updateLine = (id: string, field: 'name' | 'cost', value: string) => {
    setPartLines(prev =>
      prev.map(l => (l.id === id ? { ...l, [field]: value } : l)),
    );
  };

  const removeLine = (id: string) => {
    setPartLines(prev => prev.filter(l => l.id !== id));
  };

  const filteredCategories = PART_CATEGORIES.map(cat => ({
    title: cat.title,
    data: cat.data.filter((item: string) => item.toLowerCase().includes(partSearch.toLowerCase()))
  })).filter(cat => cat.data.length > 0);

  // ── Render
  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.headerTitle}>
        Financial Estimate & Approval
      </Text>

      {/* ── PARTS SECTION ───────────────────────────────────────── */}
      <Text variant="bodyMedium" style={styles.subtext}>Parts & Materials</Text>

      {/* Column headers */}
      {partLines.length > 0 && (
        <View style={styles.tableHeader}>
          <Text style={[styles.colHeader, { flex: 2 }]}>Item</Text>
          <Text style={[styles.colHeader, { flex: 1, textAlign: 'right' }]}>
            Cost (₹)
          </Text>
          <View style={{ width: 36 }} />
        </View>
      )}

      {/* Line items */}
      {partLines.map((line, index) => (
        <View key={line.id} style={styles.lineRow}>
          {/* Item column */}
          <View style={{ flex: 2, marginRight: 8 }}>
            {line.isCustom ? (
              <TextInput
                mode="outlined"
                dense
                placeholder="Part name…"
                value={line.name}
                onChangeText={val => updateLine(line.id, 'name', val)}
                style={styles.lineInput}
              />
            ) : (
              <View style={styles.partChipWrap}>
                <Chip compact style={styles.partChip}>
                  {line.name}
                </Chip>
              </View>
            )}
          </View>

          {/* Cost column */}
          <View style={{ flex: 1 }}>
            <TextInput
              mode="outlined"
              dense
              placeholder="0"
              keyboardType="numeric"
              value={line.cost}
              onChangeText={val => updateLine(line.id, 'cost', val)}
              left={<TextInput.Affix text="₹" />}
              style={styles.lineInput}
            />
          </View>

          {/* Remove */}
          <IconButton
            icon="close-circle-outline"
            iconColor="#E57373"
            size={20}
            onPress={() => removeLine(line.id)}
            style={{ margin: 0 }}
          />
        </View>
      ))}

      {/* Parts subtotal */}
      {partLines.length > 0 && (
        <View style={styles.subTotalRow}>
          <Text variant="bodyMedium" style={{ color: '#424242' }}>
            Parts Subtotal:
          </Text>
          <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: '#1565C0' }}>
            ₹ {partsCost.toLocaleString('en-IN')}
          </Text>
        </View>
      )}

      {/* Add part button */}
      <Button
        mode="outlined"
        icon="plus"
        onPress={() => setShowPartPicker(true)}
        style={styles.addBtn}
        compact
      >
        Add Part / Item
      </Button>

      <Divider style={{ marginVertical: 16 }} />

      {/* ── LABOUR ────────────────────────────────────────────────── */}
      <Text variant="bodyMedium" style={styles.subtext}>Labour Charges</Text>
      <TextInput
        mode="outlined"
        label="Labour Cost"
        keyboardType="numeric"
        value={labourCost}
        onChangeText={setLabourCost}
        left={<TextInput.Affix text="₹" />}
        style={styles.inputSpacing}
      />

      {/* ── GST ───────────────────────────────────────────────────── */}
      <Text variant="bodyMedium" style={styles.subtext}>GST on Labour (%)</Text>
      <SegmentedButtons
        value={gstPercent}
        onValueChange={setGstPercent}
        buttons={[
          { value: '0', label: '0%' },
          { value: '5', label: '5%' },
          { value: '12', label: '12%' },
          { value: '18', label: '18%' },
          { value: '28', label: '28%' },
        ]}
        style={styles.inputSpacing}
        density="regular"
      />

      {/* ── TOTAL ─────────────────────────────────────────────────── */}
      <Surface style={styles.totalBox} elevation={0}>
        <Text variant="titleMedium" style={{ color: '#FFFFFF', fontWeight: 'bold' }}>
          Estimated Total:
        </Text>
        <Text variant="headlineSmall" style={{ color: '#FFFFFF', fontWeight: 'bold' }}>
          ₹ {totalCost.toLocaleString('en-IN')}
        </Text>
      </Surface>

      <Divider style={{ marginVertical: 16 }} />

      {/* ── APPROVAL ──────────────────────────────────────────────── */}
      <Text variant="bodyMedium" style={styles.subtext}>Customer Approval Status</Text>
      <SegmentedButtons
        value={approvalStatus}
        onValueChange={setApprovalStatus}
        buttons={[
          {
            value: 'Pending',
            label: 'Pending',
            checkedColor: '#FF9800',
            uncheckedColor: '#757575',
            style: approvalStatus === 'Pending' ? { backgroundColor: '#FFF3E0' } : {},
          },
          {
            value: 'Approved',
            label: 'Approved',
            checkedColor: '#4CAF50',
            uncheckedColor: '#757575',
            style: approvalStatus === 'Approved' ? { backgroundColor: '#E8F5E9' } : {},
          },
          {
            value: 'Rejected',
            label: 'Rejected',
            checkedColor: '#F44336',
            uncheckedColor: '#757575',
            style: approvalStatus === 'Rejected' ? { backgroundColor: '#FFEBEE' } : {},
          },
        ]}
      />
      <Text variant="labelSmall" style={{ color: '#9E9E9E', marginTop: 8, textAlign: 'center' }}>
        SMS / WhatsApp Integration APIs mapped for V2
      </Text>

      {/* ── PARTS PICKER MODAL ────────────────────────────────────── */}
      <Modal
        visible={showPartPicker}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowPartPicker(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={styles.modalHeader}>
            <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>Select Part</Text>
            <Button onPress={() => { setShowPartPicker(false); setPartSearch(''); }}>
              Close
            </Button>
          </View>
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <Searchbar
              placeholder="Search parts…"
              value={partSearch}
              onChangeText={setPartSearch}
              elevation={0}
              style={{ backgroundColor: '#F5F5F5' }}
            />
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
                      onPress={() => addPart(inv.part_name, inv.id, inv.price)}
                    />
                    <Divider />
                  </React.Fragment>
                ))}
            </>
          )}

          {/* ── Common Parts Catalogue */}
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
                  onPress={() => addPart(item)}
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
        </SafeAreaView>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 16,
    marginBottom: 16,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#388E3C',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingBottom: 8,
  },
  subtext: {
    marginBottom: 8,
    color: '#616161',
    fontWeight: 'bold',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginBottom: 8,
  },
  colHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#757575',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  lineInput: {
    backgroundColor: '#FAFAFA',
    fontSize: 13,
  },
  partChipWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingLeft: 4,
  },
  partChip: {
    backgroundColor: '#E3F2FD',
  },
  subTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    marginBottom: 8,
  },
  addBtn: {
    borderStyle: 'dashed',
    borderColor: '#1976D2',
    marginBottom: 4,
  },
  inputSpacing: {
    marginBottom: 16,
  },
  totalBox: {
    backgroundColor: '#43A047',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  modalHeader: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
});
