import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, SafeAreaView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Text, List, FAB, ActivityIndicator, useTheme, Surface, Avatar, Searchbar } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useFocusEffect } from '@react-navigation/native';

type Props = NativeStackScreenProps<RootStackParamList, 'CustomerList'>;

interface Customer {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
}

export const CustomerListScreen: React.FC<Props> = ({ navigation, route }) => {
  const { garageId } = route.params;
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  const filteredCustomers = customers.filter(customer => {
    const query = searchQuery.toLowerCase();
    return (
      (customer.full_name?.toLowerCase() || '').includes(query) ||
      (customer.phone || '').includes(query)
    );
  });

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('garage_id', garageId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCustomers();
    }, [garageId])
  );

  const renderItem = ({ item }: { item: Customer }) => (
    <Surface style={styles.card} elevation={1}>
      <List.Item
        title={item.full_name}
        description={`📱 ${item.phone} ${item.email ? `\n✉️ ${item.email}` : ''}`}
        titleStyle={{ fontWeight: 'bold' }}
        left={props => <Avatar.Text {...props} size={40} label={item.full_name.substring(0, 2).toUpperCase()} />}
        right={props => <List.Icon {...props} icon="chevron-right" />}
        onPress={() => navigation.navigate('CustomerHistory', { customerId: item.id, garageId })}
      />
    </Surface>
  );

  if (loading && customers.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Searchbar
        placeholder="Search by name or phone"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
        elevation={1}
      />
      {filteredCustomers.length === 0 ? (
        <View style={styles.center}>
           <Text variant="titleMedium" style={{color: '#757575'}}>No customers found.</Text>
           {searchQuery === '' && <Text variant="bodyMedium" style={{color: '#9E9E9E'}}>Click the + button to add one.</Text>}
        </View>
      ) : (
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('CustomerForm', { garageId })}
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
  searchbar: {
    margin: 16,
    marginBottom: 4,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  listContainer: {
    padding: 16,
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
