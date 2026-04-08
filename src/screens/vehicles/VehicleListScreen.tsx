import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, SafeAreaView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Text, List, FAB, ActivityIndicator, Surface, Avatar } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useFocusEffect } from '@react-navigation/native';

type Props = NativeStackScreenProps<RootStackParamList, 'VehicleList'>;

interface Vehicle {
  id: string;
  license_plate: string;
  make: string;
  model: string;
  color: string | null;
  customers: {
    full_name: string;
  };
}

export const VehicleListScreen: React.FC<Props> = ({ navigation, route }) => {
  const { garageId } = route.params;
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          id, 
          license_plate, 
          make, 
          model, 
          color, 
          customers!inner(full_name)
        `)
        .eq('garage_id', garageId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVehicles(data as any || []);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchVehicles();
    }, [garageId])
  );

  const renderItem = ({ item }: { item: Vehicle }) => (
    <Surface style={styles.card} elevation={1}>
      <List.Item
        title={`${item.license_plate.toUpperCase()}`}
        description={`${item.make} ${item.model} ${item.color ? `(${item.color})` : ''}\n👤 Owner: ${item.customers.full_name}`}
        descriptionNumberOfLines={2}
        titleStyle={{ fontWeight: '900', letterSpacing: 1 }}
        left={props => <Avatar.Icon {...props} size={40} icon="car" style={{ backgroundColor: '#E8F5E9' }} color="#388E3C" />}
        right={props => <List.Icon {...props} icon="chevron-right" />}
        onPress={() => console.log('Vehicle Details', item.id)}
      />
    </Surface>
  );

  if (loading && vehicles.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {vehicles.length === 0 ? (
        <View style={styles.center}>
           <Text variant="titleMedium" style={{color: '#757575'}}>No vehicles found.</Text>
           <Text variant="bodyMedium" style={{color: '#9E9E9E'}}>Register a vehicle to link it to a customer.</Text>
        </View>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('VehicleForm', { garageId })}
      />
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
    paddingBottom: 80,
  },
  card: {
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: 'white',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
