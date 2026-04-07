import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, ActivityIndicator, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { supabase } from '../lib/supabase';
import { Text, Avatar } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';

interface AdminDashboardScreenProps {
  userId: string;
  fullName: string;
  garageId: string;
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
}

// ── Colour tokens (dark theme) ────────────────────────────────────
const C = {
  bg:       '#0F1923',  // deep navy
  surface:  '#1A2535',  // card surface
  surface2: '#222F42',  // slightly lighter card
  border:   '#2A3A52',
  accent:   '#3B82F6',  // vivid blue
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
  white:    '#FFFFFF',
};

export const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = ({ userId, fullName, garageId, navigation }) => {
  const [loading, setLoading]                   = useState(true);
  const [refreshing, setRefreshing]             = useState(false);
  const [garageName, setGarageName]             = useState('');
  const [garageCode, setGarageCode]             = useState('');

  // Real metrics
  const [staffCount, setStaffCount]             = useState(0);
  const [openJobsCount, setOpenJobsCount]       = useState(0);
  const [completedToday, setCompletedToday]     = useState(0);
  const [pendingBillsCount, setPendingBillsCount] = useState(0);
  const [todayRevenue, setTodayRevenue]         = useState(0);
  const [totalCustomers, setTotalCustomers]     = useState(0);

  const fetchDashboardData = useCallback(async () => {
    try {
      // 1. Garage info
      const { data: gd } = await supabase
        .from('garages')
        .select('garage_name, garage_code')
        .eq('id', garageId)
        .single();
      if (gd) { setGarageName(gd.garage_name); setGarageCode(gd.garage_code); }

      // 2. Staff count
      const { count: sc } = await supabase
        .from('garage_staff')
        .select('id', { count: 'exact', head: true })
        .eq('garage_id', garageId);
      setStaffCount(sc || 0);

      // 3. Open jobs (status = in-progress or pending)
      const { count: oj } = await supabase
        .from('job_cards')
        .select('id', { count: 'exact', head: true })
        .eq('garage_id', garageId)
        .in('status', ['pending', 'in-progress']);
      setOpenJobsCount(oj || 0);

      // 4. Jobs completed today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count: ct } = await supabase
        .from('job_cards')
        .select('id', { count: 'exact', head: true })
        .eq('garage_id', garageId)
        .eq('status', 'completed')
        .gte('completed_at', todayStart.toISOString());
      setCompletedToday(ct || 0);

      // 5. Pending bills (completed but unbilled)
      const { count: pb } = await supabase
        .from('job_cards')
        .select('id', { count: 'exact', head: true })
        .eq('garage_id', garageId)
        .eq('status', 'completed')
        .eq('payment_status', 'Unbilled');
      setPendingBillsCount(pb || 0);

      // 6. Today's revenue from bills
      const { data: revData } = await supabase
        .from('bills')
        .select('grand_total')
        .eq('garage_id', garageId)
        .gte('created_at', todayStart.toISOString());
      const revenue = (revData || []).reduce((sum, b) => sum + (b.grand_total || 0), 0);
      setTodayRevenue(revenue);

      // 7. Total customers
      const { count: tc } = await supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('garage_id', garageId);
      setTotalCustomers(tc || 0);

    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [garageId]);

  useEffect(() => {
    fetchDashboardData();
    const id = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(id);
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: C.bg }]}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={{ color: C.textMuted, marginTop: 12 }}>Loading dashboard…</Text>
      </View>
    );
  }

  // ── Quick Action tiles ─────────────────────────────────────────
  const quickActions = [
    { label: 'New Job Card',    icon: '➕', color: C.accent,  bg: C.accentSoft,  onPress: () => navigation.navigate('JobCardForm',  { garageId }) },
    { label: 'Active Jobs',     icon: '🔧', color: C.amber,   bg: C.amberSoft,   onPress: () => navigation.navigate('JobCardList',  { garageId }) },
    { label: 'Customers',       icon: '👥', color: C.purple,  bg: C.purpleSoft,  onPress: () => navigation.navigate('CustomerList', { garageId }) },
    { label: 'Vehicles',        icon: '🚗', color: C.cyan,    bg: C.cyanSoft,    onPress: () => navigation.navigate('VehicleList',  { garageId }) },
    { label: 'Parts Inventory', icon: '📦', color: C.green,   bg: C.greenSoft,   onPress: () => navigation.navigate('InventoryList',{ garageId }) },
    { label: 'Invoice History', icon: '🧾', color: C.purple,  bg: C.purpleSoft,  onPress: () => navigation.navigate('InvoiceList',  { garageId }) },
    { label: 'Manage Staff',    icon: '🛠️', color: C.cyan,    bg: C.cyanSoft,    onPress: () => navigation.navigate('StaffList',    { garageId }) },
  ];

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
          </View>
          <TouchableOpacity onPress={() => supabase.auth.signOut()} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* ── Invite Code ── */}
        <View style={styles.codeCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.codeLabel}>Garage Invite Code</Text>
            <Text style={styles.codeSubLabel}>Share with staff to join</Text>
          </View>
          <View style={styles.codeBox}>
            <Text style={styles.codeHash}>#</Text>
            <Text style={styles.codeText}>{garageCode}</Text>
          </View>
        </View>

        {/* ── Metrics Row ── */}
        <Text style={styles.sectionTitle}>Live Overview</Text>
        <View style={styles.metricsGrid}>
          <MetricCard value={openJobsCount}    label="Open Jobs"      icon="🔧" color={C.amber}   bg={C.amberSoft}  />
          <MetricCard value={completedToday}   label="Done Today"     icon="✅" color={C.green}   bg={C.greenSoft}  />
          <MetricCard value={pendingBillsCount} label="To Bill"       icon="🧾" color={C.red}     bg={C.redSoft}    />
          <MetricCard value={totalCustomers}   label="Customers"      icon="👥" color={C.purple}  bg={C.purpleSoft} />
          <MetricCard value={staffCount}       label="Staff"          icon="👤" color={C.cyan}    bg={C.cyanSoft}   />
          <MetricCard
            value={`₹${todayRevenue >= 1000 ? (todayRevenue / 1000).toFixed(1) + 'k' : todayRevenue}`}
            label="Today's Revenue"
            icon="💰"
            color={C.green}
            bg={C.greenSoft}
            wide
          />
        </View>

        {/* ── Quick Actions ── */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((a, i) => (
            <TouchableOpacity key={i} style={[styles.actionTile, { backgroundColor: a.bg, borderColor: a.color + '44' }]} onPress={a.onPress} activeOpacity={0.75}>
              <Text style={styles.actionIcon}>{a.icon}</Text>
              <Text style={[styles.actionLabel, { color: a.color }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Billing Queue Card ── */}
        <Text style={styles.sectionTitle}>Billing Queue</Text>
        <TouchableOpacity
          style={[styles.billingCard, { borderColor: pendingBillsCount > 0 ? C.amber : C.border }]}
          onPress={() => navigation.navigate('BillingQueue', { garageId })}
          activeOpacity={0.8}
        >
          <View style={styles.billingCardLeft}>
            <Text style={styles.billingCardIcon}>🧾</Text>
            <View>
              <Text style={[styles.billingCardCount, { color: pendingBillsCount > 0 ? C.amber : C.textMuted }]}>
                {pendingBillsCount} {pendingBillsCount === 1 ? 'job' : 'jobs'} awaiting billing
              </Text>
              <Text style={styles.billingCardSub}>Tap to review &amp; generate bills</Text>
            </View>
          </View>
          <Text style={[styles.billingCardArrow, { color: pendingBillsCount > 0 ? C.amber : C.textMuted }]}>→</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

// ── Metric Card sub-component ────────────────────────────────────
const MetricCard = ({ value, label, icon, color, bg, wide = false }: {
  value: number | string; label: string; icon: string; color: string; bg: string; wide?: boolean;
}) => (
  <View style={[styles.metricCard, wide && { width: '100%' }, { backgroundColor: bg, borderColor: color + '33' }]}>
    <Text style={styles.metricIcon}>{icon}</Text>
    <Text style={[styles.metricValue, { color }]}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

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

  signOutBtn:  { backgroundColor: C.redSoft, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: C.red + '44' },
  signOutText: { color: C.red, fontSize: 12, fontWeight: '700' },

  // Invite Code
  codeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: C.border,
  },
  codeLabel:    { color: C.text, fontWeight: '700', fontSize: 15, marginBottom: 4 },
  codeSubLabel: { color: C.textMuted, fontSize: 12 },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.accentSoft,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.accent + '55',
  },
  codeHash: { color: C.accent, fontSize: 20, fontWeight: '800', marginRight: 4 },
  codeText: { color: C.text,   fontSize: 28, fontWeight: '800', letterSpacing: 4 },

  sectionTitle: { color: C.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 },

  // Metrics Grid
  metricsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  metricCard: {
    width: '47%',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  metricIcon:  { fontSize: 22, marginBottom: 8 },
  metricValue: { fontSize: 28, fontWeight: '800', marginBottom: 2 },
  metricLabel: { fontSize: 12, color: C.textMuted, fontWeight: '600' },

  // Quick Actions
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  actionTile: {
    width: '47%',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionIcon:  { fontSize: 28, marginBottom: 10 },
  actionLabel: { fontSize: 13, fontWeight: '700', textAlign: 'center' },

  // Billing Queue
  billingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 8,
    borderWidth: 1,
  },
  billingCardLeft:  { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 },
  billingCardIcon:  { fontSize: 28 },
  billingCardCount: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  billingCardSub:   { color: C.textMuted, fontSize: 12 },
  billingCardArrow: { fontSize: 22, fontWeight: '800' },
});
