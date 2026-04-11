import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Text, Surface, Button } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'BranchManager'>;

export const BranchManagerScreen: React.FC<Props> = ({ route, navigation }) => {
  const { phone, currentGarageId, fullName } = route.params;
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);

  useEffect(() => {
    fetchBranches();
  }, [phone]);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('garages')
        .select('*')
        .eq('phone', phone)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBranches(data || []);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', 'Failed to load branches.');
    } finally {
      setLoading(false);
    }
  };

  const switchBranch = async (targetGarageId: string) => {
    if (targetGarageId === currentGarageId) return;
    setSwitchingTo(targetGarageId);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) throw new Error('Not authenticated.');

      // Update their profile to the new garage_id
      const { error } = await supabase
        .from('profiles')
        .update({ garage_id: targetGarageId })
        .eq('id', userId);

      if (error) throw error;
      
      Alert.alert('Success', 'Switched to new branch!', [
        { text: 'OK', onPress: () => navigation.replace('Home') }
      ]);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', 'Could not switch branch.');
    } finally {
      setSwitchingTo(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text variant="titleLarge" style={styles.title}>Your Branches</Text>
          <Text variant="bodyMedium" style={{ color: '#757575' }}>Manage all your garages</Text>
        </View>
        <Button 
          mode="contained" 
          icon="plus" 
          onPress={() => navigation.navigate('BranchForm', { phone, fullName })}
          style={{ backgroundColor: '#22C55E' }}
        >
          Add Branch
        </Button>
      </View>

      <FlatList
        data={branches}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => {
          const isCurrent = item.id === currentGarageId;
          const isSwitching = switchingTo === item.id;

          return (
            <Surface style={[styles.card, isCurrent && styles.activeCard]} elevation={2}>
              <View style={styles.cardInfo}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', color: '#111827' }}>
                  {item.garage_name}
                </Text>
                <Text variant="bodySmall" style={{ color: '#6B7280' }}>Code: {item.garage_code} • {item.city || 'No City'}</Text>
                {isCurrent && (
                  <Text style={styles.activeBadge}>Current Branch</Text>
                )}
              </View>

              <View style={styles.actions}>
                <Button 
                  mode={isCurrent ? "outlined" : "contained"} 
                  onPress={() => switchBranch(item.id)}
                  loading={isSwitching}
                  disabled={isCurrent || switchingTo !== null}
                  style={isCurrent ? undefined : { backgroundColor: '#3B82F6' }}
                >
                  {isCurrent ? 'Active' : 'Switch To'}
                </Button>
                
                <TouchableOpacity 
                  style={styles.staffBtn}
                  onPress={() => navigation.navigate('StaffList', { garageId: item.id })}
                >
                  <Text style={styles.staffBtnText}>Manage Staff →</Text>
                </TouchableOpacity>
              </View>
            </Surface>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title: { fontWeight: 'bold', color: '#111827' },
  card: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  activeCard: {
    borderColor: '#3B82F6',
    borderWidth: 2,
  },
  cardInfo: { marginBottom: 16 },
  activeBadge: { marginTop: 6, color: '#2563EB', fontSize: 12, fontWeight: '700', backgroundColor: '#EFF6FF', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  staffBtn: { padding: 8 },
  staffBtnText: { color: '#4F46E5', fontWeight: 'bold' }
});
