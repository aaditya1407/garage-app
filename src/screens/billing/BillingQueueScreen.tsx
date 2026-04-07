import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Surface, Chip, Avatar } from 'react-native-paper';
import { supabase } from '../../lib/supabase';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useFocusEffect } from '@react-navigation/native';

type Props = NativeStackScreenProps<RootStackParamList, 'BillingQueue'>;

export const BillingQueueScreen: React.FC<Props> = ({ route, navigation }) => {
  const { garageId } = route.params;
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('job_cards')
      .select(`
        id, job_card_number, estimated_cost, created_at,
        vehicles!inner ( 
          license_plate, 
          customers!inner ( full_name, phone ) 
        )
      `)
      .eq('garage_id', garageId)
      .eq('status', 'completed')
      .eq('payment_status', 'Unbilled')
      .order('created_at', { ascending: false });
    
    if (!error) {
      setJobs(data || []);
    } else {
      console.error(error);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchQueue();
    }, [garageId])
  );

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => navigation.navigate('BillingForm', { garageId, jobId: item.id })}
    >
      <Surface style={styles.card} elevation={1}>
        <View style={styles.cardHeader}>
          <Text variant="titleMedium" style={styles.jobText}>JC: {item.job_card_number}</Text>
          <Chip compact style={{ backgroundColor: '#FFF3E0' }} textStyle={{ color: '#E65100', fontSize: 10 }}>UNBILLED</Chip>
        </View>
        
        <View style={styles.row}>
          <Avatar.Icon size={32} icon="account" style={{ backgroundColor: '#E3F2FD', marginRight: 12 }} color="#1976D2" />
          <View>
            <Text variant="bodyMedium" style={styles.customerName}>{item.vehicles?.customers?.full_name}</Text>
            <Text variant="bodySmall" style={styles.mobile}>{item.vehicles?.customers?.phone}</Text>
          </View>
        </View>

        <View style={[styles.row, { marginTop: 12 }]}>
          <Avatar.Icon size={32} icon="car" style={{ backgroundColor: '#E8F5E9', marginRight: 12 }} color="#388E3C" />
          <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: '#424242' }}>
            {item.vehicles?.license_plate || 'Unknown Vehicle'}
          </Text>
        </View>
      </Surface>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Avatar.Icon size={64} icon="check-all" style={{ backgroundColor: '#F5F5F5' }} color="#BDBDBD" />
              <Text variant="titleMedium" style={styles.emptyTitle}>All Caught Up!</Text>
              <Text variant="bodyMedium" style={styles.emptySub}>There are no completed jobs waiting to be billed.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  listContent: { padding: 16 },
  card: { padding: 16, borderRadius: 12, backgroundColor: '#FFFFFF', marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  jobText: { fontWeight: 'bold', color: '#424242' },
  row: { flexDirection: 'row', alignItems: 'center' },
  customerName: { fontWeight: 'bold', color: '#212121' },
  mobile: { color: '#757575' },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { color: '#616161', marginTop: 16, fontWeight: 'bold' },
  emptySub: { color: '#9E9E9E', marginTop: 8, textAlign: 'center' },
});
