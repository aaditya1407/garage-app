import React, { useEffect, useState, useCallback } from 'react';
import {
  View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Dimensions, Alert, Platform, Modal
} from 'react-native';
import { Text } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'OwnerDashboard'>;

// ── Colour tokens ──────────────────────────────────────────────────────────
const C = {
  bg:         '#080E18',
  surface:    '#111827',
  surface2:   '#1A2535',
  border:     '#1F2F45',
  accent:     '#3B82F6',
  accentSoft: '#0F2149',
  green:      '#22C55E',
  greenSoft:  '#0A2E18',
  amber:      '#F59E0B',
  amberSoft:  '#2D1A00',
  purple:     '#A78BFA',
  purpleSoft: '#1C1040',
  cyan:       '#22D3EE',
  cyanSoft:   '#041C25',
  red:        '#F87171',
  redSoft:    '#250808',
  teal:       '#2DD4BF',
  tealSoft:   '#042420',
  text:       '#EFF6FF',
  textMuted:  '#6B8AAD',
  white:      '#FFFFFF',
};

interface GarageStats {
  id: string;
  garage_name: string;
  garage_code: string;
  city: string;
  state: string;
  openJobs: number;
  completedToday: number;
  pendingBills: number;
  todayRevenue: number;
  receivedToday: number;
  staffCount: number;
}

const { width } = Dimensions.get('window');

export const OwnerDashboardScreen: React.FC<Props> = ({ route, navigation }) => {
  const { phone, fullName, userId } = route.params;
  const [branches, setBranches]   = useState<GarageStats[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Custom modal state for deletion
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Aggregates across all branches
  const agg = branches.reduce(
    (acc, b) => ({
      openJobs:       acc.openJobs       + b.openJobs,
      completedToday: acc.completedToday + b.completedToday,
      pendingBills:   acc.pendingBills   + b.pendingBills,
      todayRevenue:   acc.todayRevenue   + b.todayRevenue,
      receivedToday:  acc.receivedToday  + b.receivedToday,
      staffCount:     acc.staffCount     + b.staffCount,
    }),
    { openJobs: 0, completedToday: 0, pendingBills: 0, todayRevenue: 0, receivedToday: 0, staffCount: 0 }
  );

  const fetchAllBranches = useCallback(async () => {
    try {
      // 1. Get all garages owned by this auth user (UUID-based, robust)
      const { data: garages, error: gError } = await supabase
        .from('garages')
        .select('id, garage_name, garage_code, city, state')
        .eq('owner_user_id', userId)
        .order('created_at', { ascending: true });

      if (gError) throw gError;
      if (!garages || garages.length === 0) {
        setBranches([]);
        return;
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayISO = todayStart.toISOString();

      // 2. Fetch all stats in parallel for every branch
      const statsPromises = garages.map(async (g) => {
        const [
          { count: openJobs },
          { count: completedToday },
          { count: pendingBills },
          { data: revData },
          { data: receivedData },
          { count: staffCount },
        ] = await Promise.all([
          supabase.from('job_cards').select('id', { count: 'exact', head: true })
            .eq('garage_id', g.id).in('status', ['open', 'in_progress']),

          supabase.from('job_cards').select('id', { count: 'exact', head: true })
            .eq('garage_id', g.id).eq('status', 'completed')
            .gte('completed_at', todayISO),

          supabase.from('job_cards').select('id', { count: 'exact', head: true })
            .eq('garage_id', g.id).eq('status', 'completed')
            .eq('payment_status', 'Unbilled'),

          supabase.from('bills').select('grand_total')
            .eq('garage_id', g.id).gte('created_at', todayISO),

          supabase.from('bills').select('grand_total')
            .eq('garage_id', g.id).gte('created_at', todayISO)
            .eq('status', 'Paid'),

          supabase.from('garage_staff').select('id', { count: 'exact', head: true })
            .eq('garage_id', g.id),
        ]);

        const todayRevenue = (revData || []).reduce((s: number, b: any) => s + (b.grand_total || 0), 0);
        const receivedToday = (receivedData || []).reduce((s: number, b: any) => s + (b.grand_total || 0), 0);

        return {
          ...g,
          openJobs:       openJobs       || 0,
          completedToday: completedToday || 0,
          pendingBills:   pendingBills   || 0,
          todayRevenue,
          receivedToday,
          staffCount:     staffCount     || 0,
        } as GarageStats;
      });

      const results = await Promise.all(statsPromises);
      setBranches(results);
    } catch (err) {
      console.error('OwnerDashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [phone]);

  const requestDeleteBranch = (garageId: string, garageName: string) => {
    setBranchToDelete({ id: garageId, name: garageName });
    setDeleteError(null);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!branchToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const { data, error } = await supabase.from('garages').delete().eq('id', branchToDelete.id).select();
      
      if (error) {
        if (error.code === '23503') {
          throw new Error('This branch cannot be deleted because it contains active Staff, Job Cards, or Invoices. You must remove all branch data first.');
        }
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('Silently blocked by Database Security. Your Supabase RLS policies do not allow deleting garages.');
      }

      setDeleteModalVisible(false);
      setBranchToDelete(null);
      fetchAllBranches();
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    fetchAllBranches();
    const id = setInterval(fetchAllBranches, 60000);
    return () => clearInterval(id);
  }, [fetchAllBranches]);

  const onRefresh = () => { setRefreshing(true); fetchAllBranches(); };

  const fmt = (n: number) =>
    n >= 100000 ? `₹${(n / 100000).toFixed(1)}L`
    : n >= 1000 ? `₹${(n / 1000).toFixed(1)}k`
    : `₹${n}`;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={{ color: C.textMuted, marginTop: 14, fontSize: 14 }}>Loading your empire…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} colors={[C.accent]} />}
      >
        {/* ── Top Header ── */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.greetSmall}>{greeting()},</Text>
            <Text style={styles.greetName}>{fullName.split(' ')[0]} 👋</Text>
            <Text style={styles.greetSub}>{branches.length} Branch{branches.length !== 1 ? 'es' : ''} · All India</Text>
          </View>
          <TouchableOpacity onPress={() => supabase.auth.signOut()} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* ── Aggregate Banner ── */}
        <View style={styles.aggBanner}>
          <View style={styles.aggBannerRow}>
            <View style={styles.aggRevenueBlock}>
              <Text style={styles.aggRevenueLabel}>Today's Total Revenue</Text>
              <Text style={styles.aggRevenueValue}>{fmt(agg.todayRevenue)}</Text>
              <Text style={styles.aggRevenueReceived}>Collected: {fmt(agg.receivedToday)}</Text>
            </View>
            <View style={styles.aggDivider} />
            <View style={styles.aggSmallGrid}>
              <AggPill label="Open Jobs"   value={agg.openJobs}       color={C.amber} />
              <AggPill label="Done Today"  value={agg.completedToday} color={C.green} />
              <AggPill label="To Bill"     value={agg.pendingBills}   color={C.red} />
              <AggPill label="Staff"       value={agg.staffCount}     color={C.cyan} />
            </View>
          </View>
        </View>

        {/* ── Section: Branches ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>YOUR BRANCHES</Text>
          <TouchableOpacity
            style={styles.addBranchBtn}
            onPress={() => navigation.navigate('BranchForm', { phone, fullName })}
          >
            <Text style={styles.addBranchText}>＋ New Branch</Text>
          </TouchableOpacity>
        </View>

        {branches.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>🏗️</Text>
            <Text style={{ color: C.text, fontSize: 16, fontWeight: '700' }}>No branches yet</Text>
            <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 6, textAlign: 'center' }}>Tap "New Branch" to create your first garage location</Text>
          </View>
        ) : (
          branches.map((b) => (
            <BranchCard
              key={b.id}
              branch={b}
              fmt={fmt}
              onEnter={() =>
                navigation.navigate('BranchDashboard', {
                  garageId: b.id,
                  phone,
                  fullName,
                  userId,
                })
              }
              onStaff={() => navigation.navigate('StaffList', { garageId: b.id })}
              onJobs={() => navigation.navigate('JobCardList', { garageId: b.id })}
              onDelete={() => requestDeleteBranch(b.id, b.garage_name)}
            />
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Custom Delete Confirmation Modal ── */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Branch</Text>
            {branchToDelete && (
              <Text style={styles.modalText}>
                Are you sure you want to permanently delete <Text style={{fontWeight: 'bold', color: C.red}}>"{branchToDelete.name}"</Text>? This action cannot be undone.
              </Text>
            )}
            {deleteError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{deleteError}</Text>
              </View>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setBranchToDelete(null);
                }}
                disabled={deleting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDeleteBtn}
                onPress={confirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.modalDeleteText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

// ── Sub-component: Aggregate Pill ────────────────────────────────────────
const AggPill = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <View style={[aggStyles.pill, { borderColor: color + '40' }]}>
    <Text style={[aggStyles.pillValue, { color }]}>{value}</Text>
    <Text style={aggStyles.pillLabel}>{label}</Text>
  </View>
);
const aggStyles = StyleSheet.create({
  pill:       { width: '48%', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, backgroundColor: '#111827', marginBottom: 8 },
  pillValue:  { fontSize: 20, fontWeight: '800' },
  pillLabel:  { fontSize: 11, color: '#6B8AAD', marginTop: 2, fontWeight: '600' },
});

// ── Sub-component: Branch Card ───────────────────────────────────────────
const BranchCard = ({
  branch, fmt, onEnter, onStaff, onJobs, onDelete
}: {
  branch: GarageStats;
  fmt: (n: number) => string;
  onEnter: () => void;
  onStaff: () => void;
  onJobs: () => void;
  onDelete: () => void;
}) => (
  <View style={branchStyles.card}>
    {/* Card header */}
    <View style={branchStyles.cardHeader}>
      <View style={branchStyles.brandDot} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={branchStyles.branchName}>{branch.garage_name}</Text>
        <Text style={branchStyles.branchSub}>
          {branch.city}{branch.state ? `, ${branch.state}` : ''}  ·  Code #{branch.garage_code}
        </Text>
      </View>
      <TouchableOpacity style={branchStyles.deleteBtn} onPress={onDelete}>
        <Text style={branchStyles.deleteBtnText}>🗑️</Text>
      </TouchableOpacity>
      <TouchableOpacity style={branchStyles.enterBtn} onPress={onEnter}>
        <Text style={branchStyles.enterBtnText}>Open →</Text>
      </TouchableOpacity>
    </View>

    {/* Stats Grid */}
    <View style={branchStyles.statsGrid}>
      <StatBox label="Open Jobs"   value={branch.openJobs}       color="#F59E0B" />
      <StatBox label="Done Today"  value={branch.completedToday} color="#22C55E" />
      <StatBox label="Pending Bill" value={branch.pendingBills}  color="#F87171" />
      <StatBox label="Staff"       value={branch.staffCount}     color="#22D3EE" />
    </View>

    {/* Revenue row */}
    <View style={branchStyles.revenueRow}>
      <View>
        <Text style={branchStyles.revLabel}>Today's Revenue</Text>
        <Text style={branchStyles.revValue}>{fmt(branch.todayRevenue)}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={branchStyles.revLabel}>Collected</Text>
        <Text style={[branchStyles.revValue, { color: '#22C55E' }]}>{fmt(branch.receivedToday)}</Text>
      </View>
    </View>

    {/* Quick actions */}
    <View style={branchStyles.quickRow}>
      <TouchableOpacity style={branchStyles.quickBtn} onPress={onJobs}>
        <Text style={branchStyles.quickBtnText}>🔧 View Jobs</Text>
      </TouchableOpacity>
      <TouchableOpacity style={branchStyles.quickBtn} onPress={onStaff}>
        <Text style={branchStyles.quickBtnText}>👤 Staff</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const StatBox = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <View style={[branchStyles.statBox, { borderColor: color + '33' }]}>
    <Text style={[branchStyles.statValue, { color }]}>{value}</Text>
    <Text style={branchStyles.statLabel}>{label}</Text>
  </View>
);

const branchStyles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderRadius: 20,
    marginBottom: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1F2F45',
  },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  brandDot:    { width: 10, height: 10, borderRadius: 999, backgroundColor: '#3B82F6' },
  branchName:  { fontSize: 17, fontWeight: '800', color: '#EFF6FF' },
  branchSub:   { fontSize: 12, color: '#6B8AAD', marginTop: 3 },
  deleteBtn:   { padding: 8, marginRight: 8, borderRadius: 8, backgroundColor: '#250808', borderWidth: 1, borderColor: '#F8717144' },
  deleteBtnText:{ fontSize: 14 },
  enterBtn:    { backgroundColor: '#3B82F6', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 },
  enterBtnText:{ color: '#fff', fontWeight: '700', fontSize: 13 },

  statsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statBox:    { width: '47%', backgroundColor: '#080E18', borderRadius: 12, padding: 14, borderWidth: 1 },
  statValue:  { fontSize: 24, fontWeight: '800' },
  statLabel:  { fontSize: 11, color: '#6B8AAD', marginTop: 4, fontWeight: '600' },

  revenueRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#080E18', borderRadius: 14, padding: 16, marginBottom: 14 },
  revLabel:   { fontSize: 11, color: '#6B8AAD', fontWeight: '600', marginBottom: 4 },
  revValue:   { fontSize: 22, fontWeight: '800', color: '#EFF6FF' },

  quickRow:   { flexDirection: 'row', gap: 10 },
  quickBtn:   { flex: 1, backgroundColor: '#1A2535', borderRadius: 10, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: '#1F2F45' },
  quickBtnText:{ color: '#8BA0BE', fontSize: 13, fontWeight: '700' },
});

// ── Main Stylesheet ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 40 },

  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greetSmall: { fontSize: 13, color: C.textMuted, fontWeight: '600' },
  greetName:  { fontSize: 28, fontWeight: '900', color: C.text, marginTop: 2 },
  greetSub:   { fontSize: 12, color: C.textMuted, marginTop: 4 },
  signOutBtn: { backgroundColor: C.redSoft, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: C.red + '44' },
  signOutText:{ color: C.red, fontSize: 12, fontWeight: '700' },

  // Aggregate banner
  aggBanner: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: C.border,
  },
  aggBannerRow:      { flexDirection: 'row', alignItems: 'flex-start' },
  aggRevenueBlock:   { flex: 1, paddingRight: 16 },
  aggRevenueLabel:   { fontSize: 11, color: C.textMuted, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  aggRevenueValue:   { fontSize: 36, fontWeight: '900', color: C.green },
  aggRevenueReceived:{ fontSize: 12, color: C.textMuted, marginTop: 6 },
  aggDivider:        { width: 1, backgroundColor: C.border, alignSelf: 'stretch', marginHorizontal: 16 },
  aggSmallGrid:      { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  // Section header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle:  { fontSize: 11, color: C.textMuted, fontWeight: '700', letterSpacing: 1.2 },
  addBranchBtn:  { backgroundColor: C.accentSoft, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: C.accent + '55' },
  addBranchText: { color: C.accent, fontWeight: '700', fontSize: 13 },

  emptyCard: { backgroundColor: C.surface, borderRadius: 20, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: C.border },

  // Delete Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: C.surface, padding: 24, borderRadius: 16, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: C.border },
  modalTitle:   { fontSize: 20, fontWeight: 'bold', color: C.text, marginBottom: 16 },
  modalText:    { fontSize: 14, color: C.textMuted, lineHeight: 22, marginBottom: 24 },
  errorBox:     { backgroundColor: C.redSoft, padding: 12, borderRadius: 8, marginBottom: 20, borderWidth: 1, borderColor: C.red + '40' },
  errorText:    { color: C.red, fontSize: 13, lineHeight: 18 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalCancelBtn:{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: C.surface2 },
  modalCancelText:{ color: C.text, fontWeight: '600' },
  modalDeleteBtn:{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: C.red, minWidth: 80, alignItems: 'center' },
  modalDeleteText:{ color: '#FFF', fontWeight: '600' },
});
