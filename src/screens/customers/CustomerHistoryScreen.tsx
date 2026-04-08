import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, SafeAreaView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Text, List, ActivityIndicator, useTheme, Surface, Avatar, Chip } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CustomerHistory'>;

interface JobCardHistory {
  id: string;
  status: string;
  description: string;
  final_cost: number;
  created_at: string;
  vehicles: {
    make: string;
    model: string;
    license_plate: string;
  };
}

export const CustomerHistoryScreen: React.FC<Props> = ({ route, navigation }) => {
  const { customerId, garageId } = route.params;
  const [history, setHistory] = useState<JobCardHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('job_cards')
        .select(`
          id, 
          status, 
          description, 
          final_cost, 
          created_at, 
          vehicles!inner(make, model, license_plate, customer_id)
        `)
        .eq('garage_id', garageId)
        .eq('vehicles.customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory((data as any) || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  }, [customerId, garageId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'in_progress': return '#FF9800';
      case 'open': return '#2196F3';
      case 'cancelled': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const renderItem = ({ item }: { item: JobCardHistory }) => (
    <Surface style={styles.card} elevation={1}>
      <List.Item
        title={`${item.vehicles.make} ${item.vehicles.model} (${item.vehicles.license_plate})`}
        description={`Desc: ${item.description || 'No description'}\nCost: ₹${item.final_cost}\nDate: ${new Date(item.created_at).toLocaleDateString()}`}
        descriptionNumberOfLines={3}
        titleStyle={{ fontWeight: 'bold' }}
        left={props => <Avatar.Icon {...props} size={40} icon="wrench" style={{ backgroundColor: '#E3F2FD' }} color="#1976D2" />}
        right={() => (
           <View style={{ justifyContent: 'center' }}>
               <Chip style={{ backgroundColor: getStatusColor(item.status) }} textStyle={{ color: 'white', fontSize: 12 }}>
                   {item.status.toUpperCase()}
               </Chip>
           </View>
        )}
        onPress={() => navigation.navigate('JobCardDetails', { jobId: item.id })}
      />
    </Surface>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {history.length === 0 ? (
        <View style={styles.center}>
           <Text variant="titleMedium" style={{color: '#757575'}}>No Service History</Text>
           <Text variant="bodyMedium" style={{color: '#9E9E9E'}}>This customer doesn't have any job cards yet.</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: 'white',
  },
});
