import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, ActivityIndicator, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { supabase } from '../lib/supabase';
import { Text, Chip } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

interface TechnicianDashboardScreenProps {
  userId: string;
  fullName: string;
  garageId: string;
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
}

// ── Colour tokens (dark theme) ──────────────────────────────────
const C = {
  bg:       '#0F1923',
  surface:  '#1A2535',
  surface2: '#222F42',
  border:   '#2A3A52',
  accent:   '#3B82F6',
  accentSoft:'#1D3461',
  green:    '#22C55E',
  greenSoft:'#14532D',
  amber:    '#F59E0B',
  amberSoft:'#451A03',
  purple:   '#A78BFA',
  purpleSoft:'#2E1065',
  cyan:     '#22D3EE',
  cyanSoft: '#083344',
  red:      '#F87171',
  redSoft:  '#450A0A',
  orange:   '#FB923C',
  orangeSoft:'#431407',
  text:     '#F0F4FF',
  textMuted:'#8BA0BE',
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  open:         { color: '#3B82F6', bg: '#1D3461', label: 'Open' },
  in_progress:  { color: '#F59E0B', bg: '#451A03', label: 'In Progress' },
  completed:    { color: '#22C55E', bg: '#14532D', label: 'Completed' },
  cancelled:    { color: '#F87171', bg: '#450A0A', label: 'Cancelled' },
};

export const TechnicianDashboardScreen: React.FC<TechnicianDashboardScreenProps> = ({ userId, fullName, garageId, navigation }) => {
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [garageName, setGarageName] = useState('');

  // Metrics
  const [assignedCount, setAssignedCount] = useState(0);
  const [inProgressCount, setInProgressCount] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);

  // Job lists
  const [assignedJobs, setAssignedJobs] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      // Garage name
      const { data: gd } = await supabase
        .from('garages')
        .select('garage_name')
        .eq('id', garageId)
        .single();
      if (gd) setGarageName(gd.garage_name);

      // Assigned to me (open + in_progress)
      const { count: ac } = await supabase
        .from('job_cards')
        .select('id', { count: 'exact', head: true })
        .eq('garage_id', garageId)
        .eq('assigned_technician_id', userId)
        .in('status', ['open', 'in_progress']);
      setAssignedCount(ac || 0);

      // In progress (mine)
      const { count: ip } = await supabase
        .from('job_cards')
        .select('id', { count: 'exact', head: true })
        .eq('garage_id', garageId)
        .eq('assigned_technician_id', userId)
        .eq('status', 'in_progress');
      setInProgressCount(ip || 0);

      // Completed today (mine)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count: ct } = await supabase
        .from('job_cards')
        .select('id', { count: 'exact', head: true })
        .eq('garage_id', garageId)
        .eq('assigned_technician_id', userId)
        .eq('status', 'completed')
        .gte('completed_at', todayStart.toISOString());
      setCompletedToday(ct || 0);

      // Full list of my assigned active jobs
      const { data: jobsData, error: jobsErr } = await supabase
        .from('job_cards')
        .select(`
          id, job_card_number, status, created_at, description, bay_number,
          job_type, internal_notes,
          vehicles!inner(make, model, license_plate,
            customers!inner(full_name, phone)
          )
        `)
        .eq('garage_id', garageId)
        .eq('assigned_technician_id', userId)
        .in('status', ['open', 'in_progress'])
        .order('created_at', { ascending: false });
      if (jobsErr) console.error('Tech jobs fetch error:', jobsErr);
      setAssignedJobs(jobsData || []);

    } catch (err) {
      console.error('Technician dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [garageId, userId]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.orange} />
        <Text style={{ color: C.textMuted, marginTop: 12 }}>Loading your tasks…</Text>
      </View>
    );
  }

  const renderJobCard = (item: any) => {
    const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG['open'];
    const vehicle: any = item.vehicles || {};
    const customer: any = vehicle.customers || {};
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.jobCard}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('JobCardDetails', { jobId: item.id })}
      >
        {/* Top row: JC number + status */}
        <View style={styles.jobCardTop}>
          <Text style={styles.jobCardNumber}>{item.job_card_number}</Text>
          <Chip
            compact
            style={{ backgroundColor: sc.bg, borderWidth: 1, borderColor: sc.color + '55' }}
            textStyle={{ color: sc.color, fontSize: 10, fontWeight: '700' }}
          >
            {sc.label}
          </Chip>
        </View>

        {/* Vehicle */}
        <View style={styles.jobCardRow}>
          <Text style={styles.emoji}>🚗</Text>
          <Text style={styles.vehicleText}>
            {vehicle.make} {vehicle.model} – {vehicle.license_plate}
          </Text>
        </View>

        {/* Customer */}
        <View style={styles.jobCardRow}>
          <Text style={styles.emoji}>👤</Text>
          <Text style={styles.customerText}>{customer.full_name}</Text>
          <Text style={styles.phoneText}>{customer.phone}</Text>
        </View>

        {/* Job type & bay */}
        <View style={[styles.jobCardRow, { marginTop: 6 }]}>
          {item.job_type ? (
            <View style={styles.tagPill}>
              <Text style={styles.tagText}>{item.job_type}</Text>
            </View>
          ) : null}
          {item.bay_number ? (
            <View style={[styles.tagPill, { backgroundColor: C.cyanSoft, borderColor: C.cyan + '55' }]}>
              <Text style={[styles.tagText, { color: C.cyan }]}>Bay {item.bay_number}</Text>
            </View>
          ) : null}
        </View>

        {/* Internal notes preview */}
        {item.internal_notes ? (
          <View style={styles.notesRow}>
            <Text style={styles.emoji}>📝</Text>
            <Text style={styles.notesText} numberOfLines={2}>{item.internal_notes}</Text>
          </View>
        ) : null}

        {/* Description */}
        {item.description ? (
          <Text style={styles.descText} numberOfLines={1}>{item.description}</Text>
        ) : null}

        {/* Footer */}
        <View style={styles.jobCardFooter}>
          <Text style={styles.dateText}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
          {item.advisor?.full_name && (
            <Text style={styles.advisorText}>Advisor: {item.advisor.full_name}</Text>
          )}
        </View>

        {/* Tap prompt */}
        <View style={styles.tapPrompt}>
          <Text style={styles.tapPromptText}>Tap to open workspace →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.orange} colors={[C.orange]} />}
      >

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {fullName.split(' ')[0]} 👋</Text>
            <Text style={styles.garageName}>{garageName}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>Technician</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => supabase.auth.signOut()} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* ── Metrics ── */}
        <Text style={styles.sectionTitle}>My Workload</Text>
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, { backgroundColor: C.orangeSoft, borderColor: C.orange + '33' }]}>
            <Text style={styles.metricIcon}>📋</Text>
            <Text style={[styles.metricValue, { color: C.orange }]}>{assignedCount}</Text>
            <Text style={styles.metricLabel}>Assigned</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: C.amberSoft, borderColor: C.amber + '33' }]}>
            <Text style={styles.metricIcon}>🔧</Text>
            <Text style={[styles.metricValue, { color: C.amber }]}>{inProgressCount}</Text>
            <Text style={styles.metricLabel}>In Progress</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: C.greenSoft, borderColor: C.green + '33' }]}>
            <Text style={styles.metricIcon}>✅</Text>
            <Text style={[styles.metricValue, { color: C.green }]}>{completedToday}</Text>
            <Text style={styles.metricLabel}>Done Today</Text>
          </View>
        </View>

        {/* ── My Assigned Jobs ── */}
        <Text style={styles.sectionTitle}>My Tasks ({assignedJobs.length})</Text>
        {assignedJobs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>☕</Text>
            <Text style={styles.emptyTitle}>No tasks assigned right now</Text>
            <Text style={styles.emptySub}>New jobs will appear here when assigned to you</Text>
          </View>
        ) : (
          assignedJobs.map(job => renderJobCard(job))
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

// ── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea:        { flex: 1, backgroundColor: C.bg },
  loadingContainer:{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  scrollContent:   { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting:   { fontSize: 14, color: C.textMuted, marginBottom: 4 },
  garageName: { fontSize: 22, fontWeight: '800', color: C.text },
  roleBadge:  { backgroundColor: C.orangeSoft, borderRadius: 6, paddingVertical: 3, paddingHorizontal: 10, marginTop: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: C.orange + '55' },
  roleBadgeText: { color: C.orange, fontSize: 11, fontWeight: '700' },

  signOutBtn:  { backgroundColor: C.redSoft, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: C.red + '44' },
  signOutText: { color: C.red, fontSize: 12, fontWeight: '700' },

  sectionTitle: { color: C.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 },

  // Metrics
  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  metricCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  metricIcon:  { fontSize: 20, marginBottom: 6 },
  metricValue: { fontSize: 26, fontWeight: '800', marginBottom: 2 },
  metricLabel: { fontSize: 10, color: C.textMuted, fontWeight: '600', textAlign: 'center' },

  // Job Cards
  jobCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  jobCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  jobCardNumber: { fontSize: 16, fontWeight: '800', color: C.text },
  jobCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  emoji:        { fontSize: 14 },
  vehicleText:  { fontSize: 14, color: C.text, fontWeight: '600' },
  customerText: { fontSize: 13, color: C.text, fontWeight: '600' },
  phoneText:    { fontSize: 12, color: C.textMuted, marginLeft: 'auto' },

  tagPill: {
    backgroundColor: C.purpleSoft,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: C.purple + '55',
    marginRight: 8,
  },
  tagText: { color: C.purple, fontSize: 10, fontWeight: '700' },

  notesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
    backgroundColor: C.surface2,
    borderRadius: 8,
    padding: 10,
  },
  notesText: { fontSize: 12, color: C.textMuted, flex: 1, lineHeight: 18 },

  descText: { fontSize: 12, color: C.textMuted, marginTop: 6, fontStyle: 'italic' },

  jobCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  dateText:    { fontSize: 11, color: C.textMuted },
  advisorText: { fontSize: 11, color: C.purple, fontWeight: '600' },

  tapPrompt: {
    marginTop: 10,
    alignItems: 'center',
  },
  tapPromptText: { fontSize: 11, color: C.accent, fontWeight: '600' },

  // Empty state
  emptyCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyTitle: { color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  emptySub:   { color: C.textMuted, fontSize: 13, textAlign: 'center' },
});
