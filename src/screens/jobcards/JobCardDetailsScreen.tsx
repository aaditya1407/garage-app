import React, { useEffect, useState, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, Alert, SafeAreaView,
  Image, Platform, TouchableOpacity, FlatList, SectionList, Modal,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import {
  Text, Surface, ActivityIndicator, Divider, SegmentedButtons,
  Chip, Avatar, Button, TextInput, IconButton, Searchbar, List,
} from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useFocusEffect } from '@react-navigation/native';
import { InspectionChecklist, InspectionData } from '../../components/InspectionChecklist';
import { ImagePickerGrid, ImageSlots } from '../../components/ImagePickerGrid';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { PART_CATEGORIES } from '../../constants/parts';

type Props = NativeStackScreenProps<RootStackParamList, 'JobCardDetails'>;

interface PartLine { id: string; name: string; isCustom: boolean; cost: string; }

// ─── Helper ──────────────────────────────────────────────────────────────────
const COMPLAINT_KEYS = ['Engine', 'Brake', 'Suspension', 'Electrical', 'AC'];

// ─────────────────────────────────────────────────────────────────────────────
export const JobCardDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { jobId, garageId } = route.params;

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<any>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // ── Edit mode flags ────────────────────────────────────────────────────────
  const [editingDetails, setEditingDetails] = useState(false);
  const [editingFinancials, setEditingFinancials] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Editable: Job Details ──────────────────────────────────────────────────
  const [editOdometer, setEditOdometer] = useState('');
  const [editFuelLevel, setEditFuelLevel] = useState('1/2');
  const [editBayNumber, setEditBayNumber] = useState('');
  const [editComplaints, setEditComplaints] = useState<string[]>([]);
  const [editDescription, setEditDescription] = useState('');
  const [editInternalNotes, setEditInternalNotes] = useState('');
  const [editFinalNote, setEditFinalNote] = useState('');
  const [editJobType, setEditJobType] = useState('General');
  const [editInspectionData, setEditInspectionData] = useState<InspectionData | null>(null);
  const [editImages, setEditImages] = useState<ImageSlots>({ front: null, rear: null, left: null, right: null, odometer: null });

  // ── Editable: Financials ───────────────────────────────────────────────────
  const [editPartLines, setEditPartLines] = useState<PartLine[]>([]);
  const [editLabourCost, setEditLabourCost] = useState('');
  const [editGstPercent, setEditGstPercent] = useState('0');
  const [editApprovalStatus, setEditApprovalStatus] = useState('Pending');

  // Parts picker modal
  const [showPartPicker, setShowPartPicker] = useState(false);
  const [partSearch, setPartSearch] = useState('');

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('job_cards')
        .select(`
          *,
          vehicles!inner(make, model, license_plate, year, color, vin,
            customers!inner(full_name, phone)
          )
        `)
        .eq('id', jobId)
        .eq('garage_id', garageId)
        .single();

      if (error) throw error;
      
      let advisorName = '—';
      let technicianName = 'Unassigned';

      if (data.advisor_id) {
        const { data: staffAd } = await supabase.from('garage_staff').select('full_name').eq('id', data.advisor_id).eq('garage_id', garageId).maybeSingle();
        if (staffAd) advisorName = staffAd.full_name;
        else {
          const { data: profAd } = await supabase.from('profiles').select('full_name').eq('id', data.advisor_id).maybeSingle();
          if (profAd) advisorName = profAd.full_name;
        }
      }

      if (data.assigned_technician_id) {
        const { data: staffTech } = await supabase.from('garage_staff').select('full_name').eq('id', data.assigned_technician_id).eq('garage_id', garageId).maybeSingle();
        if (staffTech) technicianName = staffTech.full_name;
        else {
          const { data: profTech } = await supabase.from('profiles').select('full_name').eq('id', data.assigned_technician_id).maybeSingle();
          if (profTech) technicianName = profTech.full_name;
        }
      }

      data.advisor = { full_name: advisorName };
      data.technician = { full_name: technicianName };

      setJob(data);

      // Seed editable state from fetched data
      setEditOdometer(String(data.odometer || ''));
      setEditFuelLevel(data.fuel_level || '1/2');
      setEditBayNumber(data.bay_number || '');
      setEditComplaints(data.complaint_categories || []);
      setEditDescription(data.description || '');
      setEditInternalNotes(data.internal_notes || '');
      setEditFinalNote(data.final_note || '');
      setEditJobType(data.job_type || 'General');
      setEditInspectionData(data.inspection_data || null);
      if (data.images) setEditImages(data.images);
      setEditPartLines(
        (data.parts_lines || []).map((l: any, i: number) => ({
          id: `${i}-${Date.now()}`,
          name: l.name || '',
          isCustom: l.isCustom || false,
          cost: String(l.cost || ''),
        }))
      );
      setEditLabourCost(String(data.labour_cost || ''));
      setEditGstPercent(String(data.gst_percent || '0'));
      setEditApprovalStatus(data.approval_status || 'Pending');
    } catch (err) {
      console.error('Error fetching job details:', err);
      Alert.alert('Error', 'Could not load job card details.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchJobDetails(); }, [garageId, jobId]));

  // ── Save Details ───────────────────────────────────────────────────────────
  const saveDetails = async () => {
    setSaving(true);
    try {
      let uploadedUrls: Record<string, string> = { ...(job.images || {}) };
      if (editImages) {
          for (const [key, uri] of Object.entries(editImages)) {
              if (uri && uri !== job.images?.[key] && !uri.startsWith('http')) {
                  try {
                      let fileData;
                      if (Platform.OS === 'web') {
                          const response = await fetch(uri);
                          fileData = await response.blob();
                      } else {
                          const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
                          fileData = decode(base64);
                      }
                      const filePath = `${job.garage_id}/${job.job_card_number}/${key}-${Date.now()}.jpg`;
                      const { error: uploadError } = await supabase.storage.from('job_cards_media').upload(filePath, fileData, { contentType: 'image/jpeg' });
                      if (!uploadError) {
                          const { data: { publicUrl } } = supabase.storage.from('job_cards_media').getPublicUrl(filePath);
                          uploadedUrls[key] = publicUrl;
                      }
                  } catch (e) {
                      console.error(`Upload error for ${key}:`, e);
                  }
              }
          }
      }

      const { error } = await supabase.from('job_cards').update({
        odometer: parseInt(editOdometer) || 0,
        fuel_level: editFuelLevel,
        bay_number: editBayNumber || null,
        complaint_categories: editComplaints,
        description: editDescription,
        internal_notes: editInternalNotes || null,
        final_note: editFinalNote || null,
        job_type: editJobType,
        inspection_data: editInspectionData || {},
        images: uploadedUrls
      }).eq('id', jobId).eq('garage_id', garageId);
      if (error) throw error;
      if (job?.vehicles?.customers?.phone) {
        Promise.all([
          import('../../services/whatsappService'),
          import('../../utils/garageInfo').then(m => m.fetchGarageInfo(garageId))
        ]).then(([{ sendMsg91WhatsApp }, garageInfo]) => {
          sendMsg91WhatsApp(job.vehicles.customers.phone, {
            name: 'status_update_template',
            variables: [
              job.vehicles.customers.full_name,
              job.job_card_number,
              'Service Details Updated',
              `Odometer: ${editOdometer} KM | Complaints: ${editComplaints.join(', ') || 'None'}`,
              garageInfo?.garage_name || 'Our Garage',
              garageInfo?.phone || '',
            ],
          });
        });
      }
      setEditingDetails(false);
      fetchJobDetails();
    } catch (err: any) {
      if (Platform.OS === 'web') window.alert('Save failed: ' + err.message);
      else Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Save Financials ────────────────────────────────────────────────────────
  const saveFinancials = async () => {
    const partsCost = editPartLines.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
    const labour = parseFloat(editLabourCost) || 0;
    const gst = parseFloat(editGstPercent) || 0;
    const taxAmount = Math.round(labour * (gst / 100));
    const total = Math.round(partsCost + labour + taxAmount);

    setSaving(true);
    try {
      const { error } = await supabase.from('job_cards').update({
        parts_lines: editPartLines.map(l => ({ name: l.name, isCustom: l.isCustom, cost: parseFloat(l.cost) || 0 })),
        parts_cost: partsCost,
        labour_cost: labour,
        gst_percent: gst,
        estimated_cost: total,
        approval_status: editApprovalStatus,
      }).eq('id', jobId).eq('garage_id', garageId);
      if (error) throw error;
      if (job?.vehicles?.customers?.phone) {
        const partsSummary = editPartLines.map(l => `${l.name || 'Custom'}: ₹${l.cost}`).join(', ') || 'None';
        Promise.all([
          import('../../services/whatsappService'),
          import('../../utils/garageInfo').then(m => m.fetchGarageInfo(garageId))
        ]).then(([{ sendMsg91WhatsApp }, garageInfo]) => {
          sendMsg91WhatsApp(job.vehicles.customers.phone, {
            name: 'status_update_template',
            variables: [
              job.vehicles.customers.full_name,
              job.job_card_number,
              'Estimate & Parts Updated',
              `Parts: ${partsSummary} | Total: ₹${total.toLocaleString('en-IN')}`,
              garageInfo?.garage_name || 'Our Garage',
              garageInfo?.phone || '',
            ],
          });
        });
      }
      setEditingFinancials(false);
      fetchJobDetails();
    } catch (err: any) {
      if (Platform.OS === 'web') window.alert('Save failed: ' + err.message);
      else Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Status progression ─────────────────────────────────────────────────────
  const executeStatusUpdate = async (newStatus: string) => {
    setStatusUpdating(true);
    try {
      const payload: any = { status: newStatus };
      if (newStatus === 'completed') payload.completed_at = new Date().toISOString();
      const { error } = await supabase.from('job_cards').update(payload).eq('id', jobId).eq('garage_id', garageId);
      if (error) throw error;
      if (job?.vehicles?.customers?.phone) {
        Promise.all([
          import('../../services/whatsappService'),
          import('../../utils/garageInfo').then(m => m.fetchGarageInfo(garageId))
        ]).then(([{ sendMsg91WhatsApp }, garageInfo]) => {
          const garageName = garageInfo?.garage_name || 'Our Garage';
          const garagePhone = garageInfo?.phone || '';
          if (newStatus === 'completed') {
            sendMsg91WhatsApp(job.vehicles.customers.phone, {
              name: 'job_completed_template',
              variables: [
                job.vehicles.customers.full_name,
                job.job_card_number,
                job.final_note || 'Your vehicle is ready for pickup.',
                garageName,
                garagePhone,
              ],
            });
          } else {
            sendMsg91WhatsApp(job.vehicles.customers.phone, {
              name: 'status_update_template',
              variables: [
                job.vehicles.customers.full_name,
                job.job_card_number,
                'Job Status Changed',
                newStatus.replace('_', ' ').toUpperCase(),
                garageName,
                garagePhone,
              ],
            });
          }
        });
      }
      fetchJobDetails();
    } catch (err) {
      if (Platform.OS === 'web') window.alert('Failed to update status.');
      else Alert.alert('Error', 'Failed to update status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleStatusChange = (newStatus: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Mark as ${newStatus.toUpperCase()}?`)) executeStatusUpdate(newStatus);
      return;
    }
    Alert.alert('Confirm', `Mark as ${newStatus.toUpperCase()}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => executeStatusUpdate(newStatus) },
    ]);
  };

  // ── Parts helpers ──────────────────────────────────────────────────────────
  const filteredCategories = PART_CATEGORIES.map(cat => ({
    title: cat.title,
    data: cat.data.filter((item: string) => item.toLowerCase().includes(partSearch.toLowerCase()))
  })).filter(cat => cat.data.length > 0);

  const addPart = (name: string) => {
    setEditPartLines(prev => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, name: name === 'Custom Part' ? '' : name, isCustom: name === 'Custom Part', cost: '' },
    ]);
    setShowPartPicker(false);
    setPartSearch('');
  };

  const updateLine = (id: string, field: 'name' | 'cost', value: string) =>
    setEditPartLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));

  const removeLine = (id: string) =>
    setEditPartLines(prev => prev.filter(l => l.id !== id));

  const toggleComplaint = (key: string) =>
    setEditComplaints(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  // ── Derived financial values ───────────────────────────────────────────────
  const calcTotal = () => {
    const parts = editPartLines.reduce((s, l) => s + (parseFloat(l.cost) || 0), 0);
    const labour = parseFloat(editLabourCost) || 0;
    const tax = Math.round(labour * ((parseFloat(editGstPercent) || 0) / 100));
    return { parts, labour, tax, total: Math.round(parts + labour + tax) };
  };
  const fin = calcTotal();

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading || !job) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* ── HEADER ── */}
        <Surface style={[styles.card, { backgroundColor: '#1976D2' }]} elevation={2}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text variant="headlineSmall" style={{ color: 'white', fontWeight: 'bold' }}>{job.job_card_number}</Text>
              <Text variant="bodyMedium" style={{ color: '#BBDEFB' }}>{new Date(job.created_at).toLocaleString()}</Text>
            </View>
            <Chip style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} textStyle={{ color: 'white', fontWeight: 'bold' }}>
              {job.status.toUpperCase()}
            </Chip>
          </View>
        </Surface>

        {/* ── CUSTOMER & VEHICLE (read-only) ── */}
        <Surface style={styles.card} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionHeader}>Customer & Asset Context</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Avatar.Icon size={40} icon="car" style={{ backgroundColor: '#E8F5E9', marginRight: 12 }} color="#388E3C" />
            <View>
              <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{job.vehicles.license_plate.toUpperCase()}</Text>
              <Text variant="bodyMedium">{job.vehicles.make} {job.vehicles.model} {job.vehicles.color ? `(${job.vehicles.color})` : ''}</Text>
              {job.vehicles.vin && <Text variant="labelSmall" style={{ color: 'gray' }}>VIN: {job.vehicles.vin}</Text>}
            </View>
          </View>
          <Divider style={{ marginVertical: 12 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Avatar.Icon size={40} icon="account" style={{ backgroundColor: '#F3E5F5', marginRight: 12 }} color="#8E24AA" />
            <View>
              <Text variant="titleMedium">{job.vehicles.customers.full_name}</Text>
              <Text variant="bodyMedium" style={{ color: '#616161' }}>{job.vehicles.customers.phone}</Text>
            </View>
          </View>
        </Surface>

        {/* ── INTAKE DETAILS (editable) ── */}
        <Surface style={styles.card} elevation={1}>
          <View style={styles.cardTitleRow}>
            <Text variant="titleMedium" style={styles.sectionHeader}>Intake Details</Text>
            {!editingDetails
              ? <Button compact icon="pencil" onPress={() => setEditingDetails(true)}>Edit</Button>
              : <View style={{ flexDirection: 'row' }}>
                  <Button compact onPress={() => { setEditingDetails(false); fetchJobDetails(); }}>Cancel</Button>
                  <Button compact mode="contained" loading={saving} onPress={saveDetails}>Save</Button>
                </View>
            }
          </View>

          {!editingDetails ? (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <View><Text variant="labelMedium" style={styles.subtext}>Odometer</Text>
                  <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{job.odometer?.toLocaleString()} KM</Text></View>
                <View><Text variant="labelMedium" style={styles.subtext}>Fuel Level</Text>
                  <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{job.fuel_level}</Text></View>
                <View><Text variant="labelMedium" style={styles.subtext}>Bay</Text>
                  <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{job.bay_number || 'N/A'}</Text></View>
              </View>
              <Divider style={{ marginVertical: 8 }} />
              <Text variant="labelMedium" style={styles.subtext}>Classification</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, marginBottom: 8 }}>
                <Chip style={{ backgroundColor: '#E3F2FD' }}>{job.job_type || 'General'}</Chip>
                <Text variant="bodyMedium">Advisor: {job.advisor?.full_name || '—'}</Text>
                <Text variant="bodyMedium">Tech: {job.technician?.full_name || 'Unassigned'}</Text>
              </View>
              {job.internal_notes && (
                <View style={styles.noteBox}>
                  <Text variant="labelSmall" style={{ color: '#E65100', fontWeight: 'bold' }}>Internal Notes:</Text>
                  <Text variant="bodySmall" style={{ color: '#E65100' }}>{job.internal_notes}</Text>
                </View>
              )}
              <Divider style={{ marginVertical: 8 }} />
              <Text variant="labelMedium" style={styles.subtext}>Complaints</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
                {job.complaint_categories?.length > 0
                  ? job.complaint_categories.map((c: string) => (
                      <Chip key={c} style={{ marginRight: 8, marginBottom: 8, backgroundColor: '#FFEBEE' }} textStyle={{ color: '#D32F2F', fontWeight: 'bold' }}>{c}</Chip>
                    ))
                  : <Text style={{ color: '#9E9E9E' }}>None specified</Text>}
              </View>
              {job.description ? <Text style={{ marginTop: 8, color: '#424242', fontStyle: 'italic' }}>"{job.description}"</Text> : null}
              {job.final_note && (
                <View style={[styles.noteBox, { backgroundColor: '#E8F5E9', marginTop: 12 }]}>
                  <Text variant="labelSmall" style={{ color: '#2E7D32', fontWeight: 'bold' }}>✅ Final Completion Note:</Text>
                  <Text variant="bodySmall" style={{ color: '#2E7D32' }}>{job.final_note}</Text>
                </View>
              )}
            </>
          ) : (
            <>
              <TextInput mode="outlined" label="Odometer (KM)" keyboardType="numeric" value={editOdometer} onChangeText={setEditOdometer} style={styles.inputSp} right={<TextInput.Affix text="KM" />} />
              <Text variant="bodyMedium" style={styles.subtext}>Fuel Level</Text>
              <SegmentedButtons
                value={editFuelLevel} onValueChange={setEditFuelLevel}
                buttons={['E', '1/4', '1/2', '3/4', 'F'].map(v => ({ value: v, label: v }))}
                style={styles.inputSp}
              />
              <TextInput mode="outlined" label="Bay Number" value={editBayNumber} onChangeText={setEditBayNumber} style={styles.inputSp} />

              <Text variant="bodyMedium" style={styles.subtext}>Job Classification</Text>
              <SegmentedButtons
                value={editJobType} onValueChange={setEditJobType}
                buttons={[{ value: 'Paid Service', label: 'Paid' }, { value: 'Free Service', label: 'Free' }, { value: 'Accident Repair', label: 'Accident' }]}
                style={styles.inputSp}
              />

              <Text variant="bodyMedium" style={styles.subtext}>Complaints</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
                {COMPLAINT_KEYS.map(key => (
                  <Chip
                    key={key}
                    selected={editComplaints.includes(key)}
                    onPress={() => toggleComplaint(key)}
                    style={{ marginRight: 8, marginBottom: 8 }}
                    selectedColor="#1976D2"
                  >{key}</Chip>
                ))}
              </View>
              <TextInput mode="outlined" label="Complaints Description" value={editDescription} onChangeText={setEditDescription} multiline numberOfLines={3} style={styles.inputSp} />
              <TextInput mode="outlined" label="Internal Notes (Staff Only)" value={editInternalNotes} onChangeText={setEditInternalNotes} multiline numberOfLines={2} style={styles.inputSp} />
              
              <Divider style={{ marginVertical: 16 }} />
              <Text variant="titleMedium" style={styles.sectionHeader}>Comprehensive Inspection</Text>
              <InspectionChecklist initialData={editInspectionData || undefined} onChange={setEditInspectionData} />
              
              <Divider style={{ marginVertical: 16 }} />
              <ImagePickerGrid onChange={setEditImages} />
            </>
          )}
        </Surface>

        {/* ── FINANCIALS (editable) ── */}
        <Surface style={styles.card} elevation={1}>
          <View style={styles.cardTitleRow}>
            <Text variant="titleMedium" style={[styles.sectionHeader, { color: '#388E3C' }]}>Estimates & Financials</Text>
            {!editingFinancials
              ? <Button compact icon="pencil" onPress={() => setEditingFinancials(true)}>Edit</Button>
              : <View style={{ flexDirection: 'row' }}>
                  <Button compact onPress={() => { setEditingFinancials(false); fetchJobDetails(); }}>Cancel</Button>
                  <Button compact mode="contained" loading={saving} onPress={saveFinancials}>Save</Button>
                </View>
            }
          </View>

          {!editingFinancials ? (
            <>
              {/* Parts lines read-only */}
              {(job.parts_lines || []).length > 0 && (
                <>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.colHeader, { flex: 2 }]}>Part / Item</Text>
                    <Text style={[styles.colHeader, { flex: 1, textAlign: 'right' }]}>Cost</Text>
                  </View>
                  {(job.parts_lines || []).map((l: any, i: number) => (
                    <View key={i} style={styles.tableRow}>
                      <Text style={{ flex: 2 }}>{l.name || '—'}</Text>
                      <Text style={{ flex: 1, textAlign: 'right' }}>₹ {Number(l.cost || 0).toLocaleString('en-IN')}</Text>
                    </View>
                  ))}
                  <Divider style={{ marginVertical: 8 }} />
                </>
              )}
              <View style={styles.finRow}><Text>Parts Total:</Text><Text>₹ {Number(job.parts_cost || 0).toLocaleString('en-IN')}</Text></View>
              <View style={styles.finRow}><Text>Labour Cost:</Text><Text>₹ {Number(job.labour_cost || 0).toLocaleString('en-IN')}</Text></View>
              <View style={styles.finRow}><Text>GST on Labour ({job.gst_percent || 0}%):</Text>
                <Text>₹ {Math.round(Number(job.labour_cost || 0) * ((job.gst_percent || 0) / 100)).toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.totalBox}>
                <Text style={{ fontWeight: 'bold', color: '#2E7D32' }}>Estimated Total:</Text>
                <Text style={{ fontWeight: 'bold', color: '#2E7D32' }}>₹ {Number(job.estimated_cost || 0).toLocaleString('en-IN')}</Text>
              </View>
              <View style={{ marginTop: 12, alignItems: 'flex-end' }}>
                <Chip
                  style={{ backgroundColor: job.approval_status === 'Approved' ? '#4CAF50' : job.approval_status === 'Rejected' ? '#F44336' : '#FF9800' }}
                  textStyle={{ color: 'white', fontWeight: 'bold' }}>
                  {job.approval_status?.toUpperCase() || 'PENDING'}
                </Chip>
              </View>
            </>
          ) : (
            <>
              {/* Parts Edit Table */}
              <Text variant="bodyMedium" style={styles.subtext}>Parts & Materials</Text>
              {editPartLines.length > 0 && (
                <View style={styles.tableHeader}>
                  <Text style={[styles.colHeader, { flex: 2 }]}>Item</Text>
                  <Text style={[styles.colHeader, { flex: 1, textAlign: 'right' }]}>Cost (₹)</Text>
                  <View style={{ width: 36 }} />
                </View>
              )}
              {editPartLines.map(line => (
                <View key={line.id} style={styles.lineRow}>
                  <View style={{ flex: 2, marginRight: 8 }}>
                    {line.isCustom
                      ? <TextInput mode="outlined" dense placeholder="Part name…" value={line.name} onChangeText={v => updateLine(line.id, 'name', v)} style={styles.lineInput} />
                      : <Chip compact style={{ backgroundColor: '#E3F2FD', alignSelf: 'flex-start' }}>{line.name}</Chip>
                    }
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextInput mode="outlined" dense placeholder="0" keyboardType="numeric" value={line.cost} onChangeText={v => updateLine(line.id, 'cost', v)} left={<TextInput.Affix text="₹" />} style={styles.lineInput} />
                  </View>
                  <IconButton icon="close-circle-outline" iconColor="#E57373" size={20} onPress={() => removeLine(line.id)} style={{ margin: 0 }} />
                </View>
              ))}
              {editPartLines.length > 0 && (
                <View style={styles.subTotalRow}>
                  <Text variant="bodyMedium">Parts Subtotal:</Text>
                  <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: '#1565C0' }}>₹ {fin.parts.toLocaleString('en-IN')}</Text>
                </View>
              )}
              <Button mode="outlined" icon="plus" onPress={() => setShowPartPicker(true)} style={styles.addBtn} compact>Add Part</Button>

              <Divider style={{ marginVertical: 12 }} />

              <TextInput mode="outlined" label="Labour Cost" keyboardType="numeric" value={editLabourCost} onChangeText={setEditLabourCost} left={<TextInput.Affix text="₹" />} style={styles.inputSp} />

              <Text variant="bodyMedium" style={styles.subtext}>GST on Labour (%)</Text>
              <SegmentedButtons
                value={editGstPercent} onValueChange={setEditGstPercent}
                buttons={[{ value: '0', label: '0%' }, { value: '5', label: '5%' }, { value: '12', label: '12%' }, { value: '18', label: '18%' }, { value: '28', label: '28%' }]}
                style={styles.inputSp}
              />

              <View style={styles.totalBox}>
                <Text style={{ fontWeight: 'bold', color: '#2E7D32' }}>Estimated Total:</Text>
                <Text style={{ fontWeight: 'bold', color: '#2E7D32' }}>₹ {fin.total.toLocaleString('en-IN')}</Text>
              </View>

              <Divider style={{ marginVertical: 12 }} />

              <Text variant="bodyMedium" style={styles.subtext}>Customer Approval Status</Text>
              <SegmentedButtons
                value={editApprovalStatus} onValueChange={setEditApprovalStatus}
                buttons={[
                  { value: 'Pending', label: 'Pending', checkedColor: '#FF9800', uncheckedColor: '#757575', style: editApprovalStatus === 'Pending' ? { backgroundColor: '#FFF3E0' } : {} },
                  { value: 'Approved', label: 'Approved', checkedColor: '#4CAF50', uncheckedColor: '#757575', style: editApprovalStatus === 'Approved' ? { backgroundColor: '#E8F5E9' } : {} },
                  { value: 'Rejected', label: 'Rejected', checkedColor: '#F44336', uncheckedColor: '#757575', style: editApprovalStatus === 'Rejected' ? { backgroundColor: '#FFEBEE' } : {} },
                ]}
              />
            </>
          )}
        </Surface>

        {/* ── IMAGES (read-only) ── */}
        {job.images && Object.keys(job.images).length > 0 ? (
          <Surface style={styles.card} elevation={1}>
            <Text variant="titleMedium" style={styles.sectionHeader}>Asset Imagery</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {Object.entries(job.images).map(([key, url]) => (
                <View key={key} style={{ width: '31%', marginRight: '2%', marginBottom: 12 }}>
                  <Text variant="labelSmall" style={{ textAlign: 'center', marginBottom: 4, textTransform: 'capitalize' }}>{key}</Text>
                  <Image source={{ uri: url as string }} style={{ width: '100%', height: 80, borderRadius: 8 }} />
                </View>
              ))}
            </View>
          </Surface>
        ) : null}

        {/* ── FINAL NOTE ── */}
        <Surface style={[styles.card, { borderWidth: 1.5, borderColor: '#A5D6A7' }]} elevation={1}>
          <Text variant="titleMedium" style={[styles.sectionHeader, { color: '#2E7D32' }]}>Final Note Before Completion</Text>
          <TextInput
            mode="outlined"
            label="Completion Sign-off Note"
            value={editFinalNote}
            onChangeText={setEditFinalNote}
            multiline
            numberOfLines={4}
            placeholder="e.g. All repairs completed. Vehicle washed and ready for delivery. Test drive done — no issues found."
            left={<TextInput.Icon icon="check-circle-outline" color="#388E3C" />}
            outlineColor="#A5D6A7"
            activeOutlineColor="#388E3C"
          />
          {editFinalNote.trim().length > 0 && (
            <Button
              mode="contained"
              icon="content-save-check"
              buttonColor="#388E3C"
              loading={saving}
              style={{ marginTop: 12 }}
              onPress={async () => {
                setSaving(true);
                try {
                  let finalNoteUpdateQuery = supabase.from('job_cards').update({ final_note: editFinalNote }).eq('id', jobId);
                  if (job?.garage_id) finalNoteUpdateQuery = finalNoteUpdateQuery.eq('garage_id', job.garage_id);
                  const { error } = await finalNoteUpdateQuery;
                  if (error) throw error;
                  fetchJobDetails();
                } catch (err: any) {
                  if (Platform.OS === 'web') window.alert('Failed: ' + err.message);
                  else Alert.alert('Error', err.message);
                } finally { setSaving(false); }
              }}
            >
              Save Final Note
            </Button>
          )}
        </Surface>

        {/* ── STATUS ENGINE ── */}
        <Surface style={styles.card} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionHeader}>Operational Workflow</Text>
          <SegmentedButtons
            value={job.status}
            onValueChange={handleStatusChange}
            buttons={[
              { value: 'open', label: 'Open' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
            density="small"
          />
          {statusUpdating && <ActivityIndicator style={{ marginTop: 16 }} />}
        </Surface>

      </ScrollView>

      {/* ── PARTS PICKER MODAL ── */}
      <Modal visible={showPartPicker} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowPartPicker(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={styles.modalHeader}>
            <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>Select Part</Text>
            <Button onPress={() => { setShowPartPicker(false); setPartSearch(''); }}>Close</Button>
          </View>
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <Searchbar placeholder="Search parts…" value={partSearch} onChangeText={setPartSearch} elevation={0} style={{ backgroundColor: '#F5F5F5' }} />
          </View>
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
                  left={props => <List.Icon {...props} icon={item === 'Custom Part' ? 'pencil-outline' : 'cog-outline'} color={item === 'Custom Part' ? '#1976D2' : '#757575'} />}
                  onPress={() => addPart(item)}
                />
                <Divider />
              </>
            )}
            ListEmptyComponent={<Text style={{ padding: 24, textAlign: 'center', color: '#9E9E9E' }}>No parts found. Try a different search or use "Custom Part".</Text>}
          />
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, paddingBottom: 60 },
  card: { padding: 16, borderRadius: 12, marginBottom: 16, backgroundColor: '#FFFFFF' },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sectionHeader: { fontWeight: 'bold', color: '#1976D2', borderBottomWidth: 1, borderBottomColor: '#EEEEEE', paddingBottom: 8, flex: 1 },
  subtext: { color: '#757575', marginBottom: 6, fontWeight: '600' },
  inputSp: { marginBottom: 12 },
  noteBox: { backgroundColor: '#FFF3E0', padding: 8, borderRadius: 6, marginTop: 8 },
  finRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#E0E0E0', marginBottom: 8 },
  colHeader: { fontSize: 12, fontWeight: 'bold', color: '#757575', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  lineRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  lineInput: { backgroundColor: '#FAFAFA', fontSize: 13 },
  subTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 4, backgroundColor: '#F5F5F5', borderRadius: 6, marginBottom: 8 },
  addBtn: { borderStyle: 'dashed', borderColor: '#1976D2', marginBottom: 4 },
  totalBox: { backgroundColor: '#E8F5E9', padding: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  modalHeader: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
});
