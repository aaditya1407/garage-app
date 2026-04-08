import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Text, Searchbar, Chip, IconButton } from 'react-native-paper';
import { supabase } from '../../lib/supabase';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useFocusEffect } from '@react-navigation/native';

type Props = NativeStackScreenProps<RootStackParamList, 'StaffList'>;

const ROLE_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  service_advisor: { color: '#3B82F6', bg: '#1D3461', label: 'Service Advisor' },
  technician:      { color: '#FB923C', bg: '#431407', label: 'Technician' },
  accountant:      { color: '#2DD4BF', bg: '#042F2E', label: 'Accountant' },
};

const C = {
  bg: '#0F1923', surface: '#1A2535', border: '#2A3A52',
  accent: '#3B82F6', green: '#22C55E', red: '#F87171',
  text: '#F0F4FF', textMuted: '#8BA0BE',
};

export const StaffListScreen: React.FC<Props> = ({ route, navigation }) => {
  const { garageId } = route.params;
  const [staff, setStaff] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchStaff = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('garage_staff')
      .select('*')
      .eq('garage_id', garageId)
      .order('created_at', { ascending: false });
    if (!error) {
      setStaff(data || []);
      setFiltered(data || []);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => { fetchStaff(); }, [garageId])
  );

  const handleSearch = (q: string) => {
    setSearch(q);
    const lower = q.toLowerCase();
    setFiltered(staff.filter(s =>
      s.full_name.toLowerCase().includes(lower) ||
      s.phone.includes(lower) ||
      s.role.toLowerCase().includes(lower)
    ));
  };

  const handleDelete = (id: string, name: string) => {
    const doDelete = async () => {
      const { error } = await supabase.from('garage_staff').delete().eq('id', id);
      if (!error) fetchStaff();
      else {
        const msg = 'Failed to delete: ' + error.message;
        Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete ${name}? This cannot be undone.`)) doDelete();
    } else {
      Alert.alert('Delete Staff', `Remove ${name}? This cannot be undone.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const rc = ROLE_CONFIG[item.role] || ROLE_CONFIG['technician'];
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('StaffForm', { garageId, staff: item })}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.staffName}>{item.full_name}</Text>
            <Text style={styles.staffPhone}>📞 {item.phone}</Text>
            {item.email ? <Text style={styles.staffEmail}>✉️ {item.email}</Text> : null}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 8 }}>
            <Chip
              compact
              style={{ backgroundColor: rc.bg, borderWidth: 1, borderColor: rc.color + '55' }}
              textStyle={{ color: rc.color, fontSize: 10, fontWeight: '700' }}
            >
              {rc.label}
            </Chip>
            {!item.is_active && (
              <Chip compact style={{ backgroundColor: '#450A0A', borderWidth: 1, borderColor: '#F8717155' }}
                textStyle={{ color: '#F87171', fontSize: 9, fontWeight: '700' }}>
                Inactive
              </Chip>
            )}
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>Added {new Date(item.created_at).toLocaleDateString()}</Text>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <IconButton
              icon="pencil"
              size={18}
              iconColor={C.accent}
              style={{ margin: 0 }}
              onPress={() => navigation.navigate('StaffForm', { garageId, staff: item })}
            />
            <IconButton
              icon="delete"
              size={18}
              iconColor={C.red}
              style={{ margin: 0 }}
              onPress={() => handleDelete(item.id, item.full_name)}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <Searchbar
          placeholder="Search by name, phone, role..."
          value={search}
          onChangeText={handleSearch}
          style={styles.searchbar}
          inputStyle={{ color: C.text }}
          iconColor={C.textMuted}
          placeholderTextColor={C.textMuted}
        />
      </View>

      {/* Summary strip */}
      <View style={styles.summaryStrip}>
        <Text style={styles.summaryText}>
          {filtered.length} staff member{filtered.length !== 1 ? 's' : ''}
        </Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('StaffForm', { garageId })}
        >
          <Text style={styles.addBtnText}>+ Add Staff</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={C.accent} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>👥</Text>
              <Text style={styles.emptyTitle}>No staff members yet</Text>
              <Text style={styles.emptySub}>Tap "+ Add Staff" to create your first team member</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  headerBar: { padding: 16, paddingBottom: 8 },
  searchbar: { backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  summaryStrip: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  summaryText: { color: C.textMuted, fontSize: 13, fontWeight: '600', flex: 1 },
  addBtn: { backgroundColor: '#1D3461', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: '#3B82F655' },
  addBtnText: { color: '#3B82F6', fontSize: 13, fontWeight: '700' },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  staffName: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 4 },
  staffPhone: { fontSize: 13, color: C.textMuted, marginBottom: 2 },
  staffEmail: { fontSize: 12, color: C.textMuted },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10,
  },
  dateText: { fontSize: 11, color: C.textMuted },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  emptySub: { color: C.textMuted, fontSize: 13, textAlign: 'center' },
});
