import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, ActivityIndicator, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { supabase } from '../lib/supabase';
import { Text, Chip } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';

interface AccountantDashboardScreenProps {
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
  teal:     '#2DD4BF',
  tealSoft: '#042F2E',
  text:     '#F0F4FF',
  textMuted:'#8BA0BE',
};

export const AccountantDashboardScreen: React.FC<AccountantDashboardScreenProps> = ({ userId, fullName, garageId, navigation }) => {
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [garageName, setGarageName] = useState('');

  // Metrics
  const [pendingBills, setPendingBills]     = useState(0);
  const [totalBilled, setTotalBilled]       = useState(0);
  const [todayRevenue, setTodayRevenue]     = useState(0);
  const [monthRevenue, setMonthRevenue]     = useState(0);
  const [todayBillCount, setTodayBillCount] = useState(0);
  const [cashCount, setCashCount]   = useState(0);
  const [upiCount, setUpiCount]     = useState(0);
  const [cardCount, setCardCount]   = useState(0);

  // Recent bills
  const [recentBills, setRecentBills] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      // Garage name
      const { data: gd } = await supabase
        .from('garages')
        .select('garage_name')
        .eq('id', garageId)
        .single();
      if (gd) setGarageName(gd.garage_name);

      // Pending bills
      const { count: pb } = await supabase
        .from('job_cards')
        .select('id', { count: 'exact', head: true })
        .eq('garage_id', garageId)
        .eq('status', 'completed')
        .eq('payment_status', 'Unbilled');
      setPendingBills(pb || 0);

      // Total bills ever
      const { count: tb } = await supabase
        .from('bills')
        .select('id', { count: 'exact', head: true })
        .eq('garage_id', garageId);
      setTotalBilled(tb || 0);

      // Today's revenue & count
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: todayData } = await supabase
        .from('bills')
        .select('grand_total, payment_mode')
        .eq('garage_id', garageId)
        .gte('created_at', todayStart.toISOString());
      const tData = todayData || [];
      setTodayRevenue(tData.reduce((s, b) => s + (b.grand_total || 0), 0));
      setTodayBillCount(tData.length);
      setCashCount(tData.filter(b => b.payment_mode === 'Cash').length);
      setUpiCount(tData.filter(b => b.payment_mode === 'UPI').length);
      setCardCount(tData.filter(b => b.payment_mode === 'Card').length);

      // Month's revenue
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const { data: monthData } = await supabase
        .from('bills')
        .select('grand_total')
        .eq('garage_id', garageId)
        .gte('created_at', monthStart.toISOString());
      setMonthRevenue((monthData || []).reduce((s, b) => s + (b.grand_total || 0), 0));

      // Recent bills (last 10)
      const { data: rbData } = await supabase
        .from('bills')
        .select(`
          id, invoice_number, created_at, grand_total, payment_mode,
          job_cards (
            job_card_number,
            vehicles ( license_plate,
              customers ( full_name )
            )
          )
        `)
        .eq('garage_id', garageId)
        .order('created_at', { ascending: false })
        .limit(10);
      setRecentBills(rbData || []);

    } catch (err) {
      console.error('Accountant dashboard error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [garageId]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const fmtCurrency = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}k` : `₹${n}`;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.teal} />
        <Text style={{ color: C.textMuted, marginTop: 12 }}>Loading financials…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.teal} colors={[C.teal]} />}
      >

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {fullName.split(' ')[0]} 👋</Text>
            <Text style={styles.garageName}>{garageName}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>Accountant</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => supabase.auth.signOut()} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* ── Billing Queue Alert ── */}
        <TouchableOpacity
          style={[styles.alertCard, { borderColor: pendingBills > 0 ? C.amber : C.border }]}
          onPress={() => navigation.navigate('BillingQueue', { garageId })}
          activeOpacity={0.75}
        >
          <View style={styles.alertLeft}>
            <Text style={{ fontSize: 28 }}>🧾</Text>
            <View>
              <Text style={[styles.alertCount, { color: pendingBills > 0 ? C.amber : C.textMuted }]}>
                {pendingBills} {pendingBills === 1 ? 'job' : 'jobs'} awaiting billing
              </Text>
              <Text style={styles.alertSub}>Tap to review & generate bills</Text>
            </View>
          </View>
          <Text style={[styles.alertArrow, { color: pendingBills > 0 ? C.amber : C.textMuted }]}>→</Text>
        </TouchableOpacity>

        {/* ── Quick Actions ── */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: C.amberSoft, borderColor: C.amber + '55' }]}
            onPress={() => navigation.navigate('BillingQueue', { garageId })}
            activeOpacity={0.75}
          >
            <Text style={styles.actionBtnIcon}>📝</Text>
            <Text style={[styles.actionBtnLabel, { color: C.amber }]}>Generate Bill</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: C.purpleSoft, borderColor: C.purple + '55' }]}
            onPress={() => navigation.navigate('InvoiceList', { garageId })}
            activeOpacity={0.75}
          >
            <Text style={styles.actionBtnIcon}>📄</Text>
            <Text style={[styles.actionBtnLabel, { color: C.purple }]}>Invoice History</Text>
          </TouchableOpacity>
        </View>

        {/* ── Revenue Overview ── */}
        <Text style={styles.sectionTitle}>Revenue Overview</Text>
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { backgroundColor: C.greenSoft, borderColor: C.green + '33' }]}>
            <Text style={styles.metricIcon}>💰</Text>
            <Text style={[styles.metricValue, { color: C.green }]}>{fmtCurrency(todayRevenue)}</Text>
            <Text style={styles.metricLabel}>Today's Revenue</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: C.tealSoft, borderColor: C.teal + '33' }]}>
            <Text style={styles.metricIcon}>📊</Text>
            <Text style={[styles.metricValue, { color: C.teal }]}>{fmtCurrency(monthRevenue)}</Text>
            <Text style={styles.metricLabel}>This Month</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: C.accentSoft, borderColor: C.accent + '33' }]}>
            <Text style={styles.metricIcon}>🧾</Text>
            <Text style={[styles.metricValue, { color: C.accent }]}>{todayBillCount}</Text>
            <Text style={styles.metricLabel}>Bills Today</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: C.purpleSoft, borderColor: C.purple + '33' }]}>
            <Text style={styles.metricIcon}>📋</Text>
            <Text style={[styles.metricValue, { color: C.purple }]}>{totalBilled}</Text>
            <Text style={styles.metricLabel}>Total Invoices</Text>
          </View>
        </View>

        {/* ── Today's Payment Split ── */}
        {todayBillCount > 0 && (
          <>
            <Text style={styles.sectionTitle}>Today's Payment Split</Text>
            <View style={styles.splitRow}>
              <View style={[styles.splitCard, { borderColor: C.green + '44' }]}>
                <Text style={{ fontSize: 20 }}>💵</Text>
                <Text style={[styles.splitValue, { color: C.green }]}>{cashCount}</Text>
                <Text style={styles.splitLabel}>Cash</Text>
              </View>
              <View style={[styles.splitCard, { borderColor: C.accent + '44' }]}>
                <Text style={{ fontSize: 20 }}>📱</Text>
                <Text style={[styles.splitValue, { color: C.accent }]}>{upiCount}</Text>
                <Text style={styles.splitLabel}>UPI</Text>
              </View>
              <View style={[styles.splitCard, { borderColor: C.purple + '44' }]}>
                <Text style={{ fontSize: 20 }}>💳</Text>
                <Text style={[styles.splitValue, { color: C.purple }]}>{cardCount}</Text>
                <Text style={styles.splitLabel}>Card</Text>
              </View>
            </View>
          </>
        )}

        {/* ── Recent Bills ── */}
        <Text style={styles.sectionTitle}>Recent Invoices</Text>
        {recentBills.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📭</Text>
            <Text style={styles.emptyTitle}>No invoices yet</Text>
            <Text style={styles.emptySub}>Generated bills will appear here</Text>
          </View>
        ) : (
          recentBills.map(bill => {
            const jc: any = bill.job_cards || {};
            const v: any = jc.vehicles || {};
            const c: any = v.customers || {};
            return (
              <View key={bill.id} style={styles.billRow}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Text style={styles.billInvoice}>{bill.invoice_number}</Text>
                    <Chip
                      compact
                      style={{ backgroundColor: C.greenSoft, borderWidth: 1, borderColor: C.green + '55' }}
                      textStyle={{ color: C.green, fontSize: 9, fontWeight: '700' }}
                    >
                      {bill.payment_mode}
                    </Chip>
                  </View>
                  <Text style={styles.billCustomer}>{c.full_name || 'Customer'} • {v.license_plate || 'N/A'}</Text>
                  <Text style={styles.billDate}>{new Date(bill.created_at).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.billAmount}>₹{bill.grand_total}</Text>
              </View>
            );
          })
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
  roleBadge:  { backgroundColor: C.tealSoft, borderRadius: 6, paddingVertical: 3, paddingHorizontal: 10, marginTop: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: C.teal + '55' },
  roleBadgeText: { color: C.teal, fontSize: 11, fontWeight: '700' },

  signOutBtn:  { backgroundColor: C.redSoft, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: C.red + '44' },
  signOutText: { color: C.red, fontSize: 12, fontWeight: '700' },

  sectionTitle: { color: C.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 },

  // Alert card
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  alertLeft:  { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 },
  alertCount: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  alertSub:   { color: C.textMuted, fontSize: 12 },
  alertArrow: { fontSize: 22, fontWeight: '800' },

  // Quick Actions
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

  // Metrics
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  metricCard: {
    width: '47%',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  metricIcon:  { fontSize: 22, marginBottom: 8 },
  metricValue: { fontSize: 24, fontWeight: '800', marginBottom: 2 },
  metricLabel: { fontSize: 11, color: C.textMuted, fontWeight: '600' },

  // Payment split
  splitRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  splitCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  splitValue: { fontSize: 22, fontWeight: '800', marginVertical: 4 },
  splitLabel: { fontSize: 11, color: C.textMuted, fontWeight: '600' },

  // Recent bills
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  billInvoice:  { fontSize: 14, fontWeight: '800', color: C.text },
  billCustomer: { fontSize: 12, color: C.textMuted, marginBottom: 2 },
  billDate:     { fontSize: 11, color: C.textMuted },
  billAmount:   { fontSize: 18, fontWeight: '800', color: C.green },

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
