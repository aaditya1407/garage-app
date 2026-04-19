import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, SafeAreaView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Text, List, ActivityIndicator, Surface, Avatar, Chip, SegmentedButtons } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useFocusEffect } from '@react-navigation/native';

type Props = NativeStackScreenProps<RootStackParamList, 'JobCardList'>;

interface JobCard {
  id: string;
  job_card_number: string;
  status: string;
  created_at: string;
  bay_number: string | null;
  vehicles: {
    make: string;
    model: string;
    license_plate: string;
  };
}

export const JobCardListScreen: React.FC<Props> = ({ navigation, route }) => {
  const { garageId } = route.params;
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  const filteredJobCards = jobCards.filter(job => {
    if (activeTab === 'active') {
      return job.status === 'open' || job.status === 'in_progress';
    }
    return job.status === 'completed';
  });

  const fetchJobCards = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('job_cards')
        .select(`
          id, 
          job_card_number, 
          status, 
          created_at, 
          bay_number,
          vehicles!inner(make, model, license_plate)
        `)
        .eq('garage_id', garageId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobCards(data as any || []);
    } catch (error) {
      console.error("Error fetching job cards:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchJobCards();
    }, [garageId])
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#2196F3';
      case 'in_progress': return '#FF9800';
      case 'completed': return '#4CAF50';
      case 'cancelled': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_progress': return 'IN PROGRESS';
      default: return status.toUpperCase();
    }
  };

  const renderItem = ({ item }: { item: JobCard }) => (
    <Surface style={styles.card} elevation={1}>
      <List.Item
        title={`${item.job_card_number} | ${item.vehicles?.license_plate?.toUpperCase()}`}
        description={`${item.vehicles?.make} ${item.vehicles?.model}\n${item.bay_number ? `📍 ${item.bay_number}  •  ` : ''}🕒 ${new Date(item.created_at).toLocaleDateString()}`}
        descriptionNumberOfLines={2}
        titleStyle={{ fontWeight: 'bold' }}
        left={props => <Avatar.Icon {...props} size={40} icon="clipboard-text" style={{ backgroundColor: '#E3F2FD' }} color="#1976D2" />}
        right={() => (
           <View style={{ justifyContent: 'center' }}>
               <Chip style={{ backgroundColor: getStatusColor(item.status) }} textStyle={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                   {getStatusLabel(item.status)}
               </Chip>
           </View>
        )}
        onPress={() => navigation.navigate('JobCardDetails', { jobId: item.id, garageId })}
      />
    </Surface>
  );

  if (loading && jobCards.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabContainer}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={value => setActiveTab(value as 'active' | 'completed')}
          buttons={[
            { value: 'active', label: 'Active Jobs' },
            { value: 'completed', label: 'Completed' },
          ]}
        />
      </View>

      {filteredJobCards.length === 0 ? (
        <View style={styles.center}>
           <Text variant="titleMedium" style={{color: '#757575'}}>No {activeTab} jobs.</Text>
           {activeTab === 'active' && <Text variant="bodyMedium" style={{color: '#9E9E9E'}}>Create a Job Card from the Dashboard to see it here.</Text>}
        </View>
      ) : (
        <FlatList
          data={filteredJobCards}
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
  tabContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
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
