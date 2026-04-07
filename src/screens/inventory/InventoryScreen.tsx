import React, { useState, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, SafeAreaView, TouchableOpacity, Alert, Platform,
} from 'react-native';
import {
  Text, Surface, Searchbar, Chip, FAB, Divider, ActivityIndicator,
  Avatar, Button, Menu, IconButton,
} from 'react-native-paper';
import { supabase } from '../../lib/supabase';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useFocusEffect } from '@react-navigation/native';

type Props = NativeStackScreenProps<RootStackParamList, 'InventoryList'>;

interface InventoryItem {
  id: string;
  part_name: string;
  part_number: string | null;
  make_name: string | null;
  stock_quantity: number;
  price: number;
  low_stock_threshold: number;
}

export const InventoryScreen: React.FC<Props> = ({ navigation, route }) => {
  const { garageId } = route.params;
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const fetchInventory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('garage_id', garageId)
      .order('part_name', { ascending: true });
    if (!error) setItems(data || []);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { fetchInventory(); }, [garageId]));

  const handleDelete = (item: InventoryItem) => {
    const doDelete = async () => {
      const { error } = await supabase.from('inventory').delete().eq('id', item.id);
      if (error) {
        if (Platform.OS === 'web') window.alert('Delete failed: ' + error.message);
        else Alert.alert('Error', error.message);
      } else {
        fetchInventory();
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${item.part_name}"?`)) doDelete();
    } else {
      Alert.alert('Confirm Delete', `Remove "${item.part_name}" from inventory?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
    setOpenMenuId(null);
  };

  const filtered = items.filter(i =>
    i.part_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (i.part_number?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (i.make_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const isLowStock = (item: InventoryItem) => item.stock_quantity <= item.low_stock_threshold;

  const renderItem = ({ item }: { item: InventoryItem }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('InventoryForm', { garageId, item })}
      activeOpacity={0.85}
    >
      <Surface style={[styles.card, isLowStock(item) && styles.lowStockCard]} elevation={1}>
        <View style={styles.cardRow}>
          {/* Icon */}
          <Avatar.Icon
            size={44}
            icon="cog"
            style={{ backgroundColor: isLowStock(item) ? '#FFEBEE' : '#E3F2FD', marginRight: 12 }}
            color={isLowStock(item) ? '#C62828' : '#1565C0'}
          />

          {/* Details */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
              <Text variant="titleSmall" style={{ fontWeight: 'bold', marginRight: 8 }}>{item.part_name}</Text>
              {item.make_name && (
                <Chip compact style={{ backgroundColor: '#F3E5F5', height: 22 }} textStyle={{ fontSize: 10 }}>
                  {item.make_name}
                </Chip>
              )}
            </View>
            {item.part_number && (
              <Text variant="labelSmall" style={{ color: '#757575' }}>PN: {item.part_number}</Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 12 }}>
              <View style={[styles.badge, { backgroundColor: isLowStock(item) ? '#FFEBEE' : '#E8F5E9' }]}>
                <Text variant="labelSmall" style={{ color: isLowStock(item) ? '#C62828' : '#2E7D32', fontWeight: 'bold' }}>
                  {isLowStock(item) ? '⚠️ ' : '✓ '}{item.stock_quantity} in stock
                </Text>
              </View>
              <Text variant="labelMedium" style={{ color: '#1565C0', fontWeight: 'bold' }}>
                ₹ {Number(item.price).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          {/* Menu */}
          <Menu
            visible={openMenuId === item.id}
            onDismiss={() => setOpenMenuId(null)}
            anchor={
              <IconButton icon="dots-vertical" size={20} onPress={() => setOpenMenuId(item.id)} />
            }
          >
            <Menu.Item
              leadingIcon="pencil"
              onPress={() => { setOpenMenuId(null); navigation.navigate('InventoryForm', { garageId, item }); }}
              title="Edit"
            />
            <Menu.Item
              leadingIcon="delete-outline"
              onPress={() => handleDelete(item)}
              title="Delete"
              titleStyle={{ color: '#C62828' }}
            />
          </Menu>
        </View>
      </Surface>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search by name, part no., make..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          elevation={0}
          style={{ backgroundColor: '#FFFFFF', borderRadius: 12 }}
        />
      </View>

      {/* Summary Strip */}
      <View style={styles.summaryRow}>
        <Surface style={styles.summaryChip} elevation={1}>
          <Text variant="labelSmall" style={{ color: '#616161' }}>Total SKUs</Text>
          <Text variant="titleMedium" style={{ fontWeight: 'bold', color: '#1565C0' }}>{filtered.length}</Text>
        </Surface>
        <Surface style={styles.summaryChip} elevation={1}>
          <Text variant="labelSmall" style={{ color: '#616161' }}>Low Stock</Text>
          <Text variant="titleMedium" style={{ fontWeight: 'bold', color: '#C62828' }}>
            {filtered.filter(isLowStock).length}
          </Text>
        </Surface>
        <Surface style={styles.summaryChip} elevation={1}>
          <Text variant="labelSmall" style={{ color: '#616161' }}>Total Value</Text>
          <Text variant="titleMedium" style={{ fontWeight: 'bold', color: '#388E3C' }}>
            ₹{Math.round(filtered.reduce((s, i) => s + i.price * i.stock_quantity, 0)).toLocaleString('en-IN')}
          </Text>
        </Surface>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text variant="titleMedium" style={{ color: '#BDBDBD' }}>No inventory items found.</Text>
              <Text variant="bodyMedium" style={{ color: '#BDBDBD', textAlign: 'center' }}>
                Tap the + button to add your first part.
              </Text>
            </View>
          }
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('InventoryForm', { garageId })}
        label="Add Part"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  searchContainer: { padding: 16, paddingBottom: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8 },
  summaryChip: { flex: 1, marginHorizontal: 4, padding: 10, borderRadius: 10, backgroundColor: '#FFFFFF', alignItems: 'center' },
  card: { padding: 12, borderRadius: 12, backgroundColor: '#FFFFFF' },
  lowStockCard: { borderWidth: 1, borderColor: '#FFCDD2' },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  empty: { alignItems: 'center', marginTop: 80, gap: 8 },
  fab: { position: 'absolute', right: 16, bottom: 24, backgroundColor: '#1976D2' },
});
