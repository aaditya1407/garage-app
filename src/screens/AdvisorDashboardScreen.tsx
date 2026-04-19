import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, ActivityIndicator, ScrollView, TouchableOpacity, RefreshControl, FlatList } from 'react-native';
import { supabase } from '../lib/supabase';
import { Text, Chip } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

interface AdvisorDashboardScreenProps {
  userId: string;
  fullName: string;
  garageId: string;
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
}

// ── Colour tokens (dark theme – same palette as admin for consistency) ──
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
  text:     '#F0F4FF',
  textMuted:'#8BA0BE',
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  open:         { color: '#3B82F6', bg: '#1D3461', label: 'Open' },
  in_progress:  { color: '#F59E0B', bg: '#451A03', label: 'In Progress' },
  completed:    { color: '#22C55E', bg: '#14532D', label: 'Completed' },
  cancelled:    { color: '#F87171', bg: '#450A0A', label: 'Cancelled' },
};

export const AdvisorDashboardScreen: React.FC<AdvisorDashboardScreenProps> = ({ userId, fullName, garageId, navigation }) => {
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [garageName, setGarageName] = useState('');

  // Metrics
  const [myOpenJobs, setMyOpenJobs]         = useState(0);
  const [myCompletedToday, setMyCompletedToday] = useState(0);
  const [totalActiveJobs, setTotalActiveJobs] = useState(0);

  // Active jobs list
  const [activeJobs, setActiveJobs] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      // Garage name
      const { data: gd } = await supabase
        .from('garages')
        .select('garage_name')
        .eq('id', garageId)
        .single();
      if (gd) setGarageName(gd.garage_name);

      // My open jobs (advisor_id = me, not completed/cancelled)
      const { count: moj } = await supabase
        .from('job_cards')
        .select('id', { count: 'exact', head: true })
        .eq('garage_id', garageId)
        .eq('advisor_id', userId)
        .in('status', ['open', 'in_progress']);
      setMyOpenJobs(moj || 0);

      // My completed today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count: mct } = await supabase
        .from('job_cards')
        .select('id', { count: 'exact', head: true })
        .eq('garage_id', garageId)
        .eq('advisor_id', userId)
        .eq('status', 'completed')
        .gte('completed_at', todayStart.toISOString());
      setMyCompletedToday(mct || 0);

      // Total active jobs in the garage
      const { count: taj } = await supabase
        .from('job_cards')
        .select('id', { count: 'exact', head: true })
        .eq('garage_id', garageId)
        .in('status', ['open', 'in_progress']);
      setTotalActiveJobs(taj || 0);

      // Active job cards list (all garage active jobs – advisor can see everything)
      const { data: jobsData, error: jobsErr } = await supabase
        .from('job_cards')
        .select(`
          id, job_card_number, status, created_at, description, advisor_id,
          vehicles!inner(make, model, license_plate,
            customers!inner(full_name, phone)
          )
        `)
        .eq('garage_id', garageId)
        .in('status', ['open', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(20);
      if (jobsErr) console.error('Jobs fetch error:', jobsErr);
      setActiveJobs(jobsData || []);

    } catch (err) {
      console.error('Advisor dashboard fetch error:', err);
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

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={{ color: C.textMuted, marginTop: 12 }}>Loading dashboard…</Text>
      </View>
    );
  }

  const renderJobCard = ({ item }: { item: any }) => {
    const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG['open'];
    const vehicle: any = item.vehicles || {};
    const customer: any = vehicle.customers || {};
    return (
      <TouchableOpacity
        style={styles.jobCard}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('JobCardDetails', { jobId: item.id, garageId })}
      >
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

        <View style={styles.jobCardRow}>
          <Text style={styles.jobCardEmoji}>🚗</Text>
          <Text style={styles.jobCardVehicle}>
            {vehicle.make} {vehicle.model} – {vehicle.license_plate}
          </Text>
        </View>

        <View style={styles.jobCardRow}>
          <Text style={styles.jobCardEmoji}>👤</Text>
          <Text style={styles.jobCardCustomer}>{customer.full_name}</Text>
          <Text style={styles.jobCardPhone}>{customer.phone}</Text>
        </View>

        {item.description ? (
          <Text style={styles.jobCardDesc} numberOfLines={1}>{item.description}</Text>
        ) : null}

        <View style={styles.jobCardFooter}>
          <Text style={styles.jobCardDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
          {item.advisor?.full_name && (
            <Text style={styles.jobCardAdvisor}>by {item.advisor.full_name}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} colors={[C.accent]} />}
      >

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {fullName.split(' ')[0]} 👋</Text>
            <Text style={styles.garageName}>{garageName}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>Service Advisor</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => supabase.auth.signOut()} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: C.accentSoft, borderColor: C.accent + '55' }]}
            onPress={() => navigation.navigate('JobCardForm', { garageId })}
            activeOpacity={0.75}
          >
            <Text style={styles.actionBtnIcon}>➕</Text>
            <Text style={[styles.actionBtnLabel, { color: C.accent }]}>Create Job Card</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: C.amberSoft, borderColor: C.amber + '55' }]}
            onPress={() => navigation.navigate('JobCardList', { garageId })}
            activeOpacity={0.75}
          >
            <Text style={styles.actionBtnIcon}>📋</Text>
            <Text style={[styles.actionBtnLabel, { color: C.amber }]}>All Active Jobs</Text>
          </TouchableOpacity>
        </View>

        {/* ── Metrics ── */}
        <Text style={styles.sectionTitle}>My Performance</Text>
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, { backgroundColor: C.amberSoft, borderColor: C.amber + '33' }]}>
            <Text style={styles.metricIcon}>🔧</Text>
            <Text style={[styles.metricValue, { color: C.amber }]}>{myOpenJobs}</Text>
            <Text style={styles.metricLabel}>My Open Jobs</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: C.greenSoft, borderColor: C.green + '33' }]}>
            <Text style={styles.metricIcon}>✅</Text>
            <Text style={[styles.metricValue, { color: C.green }]}>{myCompletedToday}</Text>
            <Text style={styles.metricLabel}>Completed Today</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: C.accentSoft, borderColor: C.accent + '33' }]}>
            <Text style={styles.metricIcon}>🏪</Text>
            <Text style={[styles.metricValue, { color: C.accent }]}>{totalActiveJobs}</Text>
            <Text style={styles.metricLabel}>Garage Active</Text>
          </View>
        </View>

        {/* ── Active Job Cards List ── */}
        <Text style={styles.sectionTitle}>Active Job Cards</Text>
        {activeJobs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🎉</Text>
            <Text style={styles.emptyTitle}>No active jobs right now</Text>
            <Text style={styles.emptySub}>Create a new job card to get started</Text>
          </View>
        ) : (
          activeJobs.map(job => (
            <View key={job.id}>
              {renderJobCard({ item: job })}
            </View>
          ))
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
  roleBadge:  { backgroundColor: C.accentSoft, borderRadius: 6, paddingVertical: 3, paddingHorizontal: 10, marginTop: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: C.accent + '55' },
  roleBadgeText: { color: C.accent, fontSize: 11, fontWeight: '700' },

  signOutBtn:  { backgroundColor: C.redSoft, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: C.red + '44' },
  signOutText: { color: C.red, fontSize: 12, fontWeight: '700' },

  // Actions
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  actionBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionBtnIcon:  { fontSize: 32, marginBottom: 8 },
  actionBtnLabel: { fontSize: 14, fontWeight: '700' },

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
    marginBottom: 6,
    gap: 8,
  },
  jobCardEmoji:   { fontSize: 14 },
  jobCardVehicle: { fontSize: 14, color: C.text, fontWeight: '600' },
  jobCardCustomer:{ fontSize: 13, color: C.text, fontWeight: '600' },
  jobCardPhone:   { fontSize: 12, color: C.textMuted, marginLeft: 'auto' },
  jobCardDesc:    { fontSize: 12, color: C.textMuted, marginTop: 4, fontStyle: 'italic' },
  jobCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  jobCardDate:    { fontSize: 11, color: C.textMuted },
  jobCardAdvisor: { fontSize: 11, color: C.purple, fontWeight: '600' },

  // Empty
  emptyCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyTitle: { color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  emptySub:   { color: C.textMuted, fontSize: 13 },
});
