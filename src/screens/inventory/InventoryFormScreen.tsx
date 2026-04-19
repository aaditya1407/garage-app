import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, Alert, KeyboardAvoidingView } from 'react-native';
import {
  Text, TextInput, Button, HelperText, Surface, Divider, SegmentedButtons,
} from 'react-native-paper';
import { supabase } from '../../lib/supabase';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

type Props = NativeStackScreenProps<RootStackParamList, 'InventoryForm'>;

const schema = z.object({
  partName: z.string().min(1, 'Part name is required'),
  partNumber: z.string().optional(),
  makeName: z.string().optional(),
  stockQuantity: z.string().regex(/^\d+$/, 'Must be a whole number').min(1, 'Required'),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid price').min(1, 'Required'),
  lowStockThreshold: z.string().regex(/^\d+$/, 'Must be a whole number').optional(),
});

type FormData = z.infer<typeof schema>;

export const InventoryFormScreen: React.FC<Props> = ({ navigation, route }) => {
  const { garageId, item } = route.params; // item = existing record for edit mode
  const isEdit = !!item;
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      partName: item?.part_name || '',
      partNumber: item?.part_number || '',
      makeName: item?.make_name || '',
      stockQuantity: item?.stock_quantity != null ? String(item.stock_quantity) : '',
      price: item?.price != null ? String(item.price) : '',
      lowStockThreshold: item?.low_stock_threshold != null ? String(item.low_stock_threshold) : '5',
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const payload = {
        garage_id: garageId,
        part_name: data.partName,
        part_number: data.partNumber || null,
        make_name: data.makeName || null,
        stock_quantity: parseInt(data.stockQuantity),
        price: parseFloat(data.price),
        low_stock_threshold: parseInt(data.lowStockThreshold || '5'),
      };

      let error;
      if (isEdit) {
        const { data: updated, error: updateError } = await supabase
          .from('inventory')
          .update(payload)
          .eq('id', item.id)
          .eq('garage_id', garageId)
          .select('id')
          .maybeSingle();
        error = updateError;
        if (!error && !updated) throw new Error('Inventory item not found for this garage.');
      } else {
        ({ error } = await supabase.from('inventory').insert(payload));
      }

      if (error) throw error;

      if (Platform.OS !== 'web') {
        Alert.alert('Success', isEdit ? 'Part updated successfully!' : 'Part added to inventory!');
      }
      navigation.goBack();
    } catch (err: any) {
      const msg = err.message || 'Something went wrong';
      if (Platform.OS === 'web') window.alert('Error: ' + msg);
      else Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const onInvalid = () => {
    if (Platform.OS === 'web') window.alert('Please fill in all required fields correctly.');
    else Alert.alert('Validation Error', 'Please fill in all required fields correctly.');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F5F5F5' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Part Identity */}
        <Surface style={styles.section} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Part Identity</Text>

          <Controller control={control} name="partName"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.fieldWrap}>
                <TextInput mode="outlined" label="Part Name *" value={value} onBlur={onBlur} onChangeText={onChange} error={!!errors.partName} />
                {errors.partName && <HelperText type="error">{errors.partName.message}</HelperText>}
              </View>
            )}
          />

          <Controller control={control} name="partNumber"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.fieldWrap}>
                <TextInput mode="outlined" label="Part Number (OEM / SKU)" value={value} onBlur={onBlur} onChangeText={onChange} autoCapitalize="characters" />
              </View>
            )}
          />

          <Controller control={control} name="makeName"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.fieldWrap}>
                <TextInput mode="outlined" label="Vehicle Make / Brand (Optional)" value={value} onBlur={onBlur} onChangeText={onChange} placeholder="e.g. Maruti, Honda, Universal" />
                <HelperText type="info">Leave blank if this part fits all makes.</HelperText>
              </View>
            )}
          />
        </Surface>

        {/* Stock & Pricing */}
        <Surface style={styles.section} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Stock & Pricing</Text>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Controller control={control} name="stockQuantity"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View>
                    <TextInput mode="outlined" label="Stock Qty *" keyboardType="numeric" value={value} onBlur={onBlur} onChangeText={onChange} error={!!errors.stockQuantity} />
                    {errors.stockQuantity && <HelperText type="error">{errors.stockQuantity.message}</HelperText>}
                  </View>
                )}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Controller control={control} name="price"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View>
                    <TextInput mode="outlined" label="Unit Price *" keyboardType="numeric" value={value} onBlur={onBlur} onChangeText={onChange} left={<TextInput.Affix text="₹" />} error={!!errors.price} />
                    {errors.price && <HelperText type="error">{errors.price.message}</HelperText>}
                  </View>
                )}
              />
            </View>
          </View>

          <Divider style={{ marginVertical: 12 }} />

          <Controller control={control} name="lowStockThreshold"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.fieldWrap}>
                <TextInput
                  mode="outlined"
                  label="Low Stock Alert Threshold"
                  keyboardType="numeric"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  right={<TextInput.Affix text="units" />}
                />
                <HelperText type="info">Show warning when stock falls at or below this number (default: 5).</HelperText>
              </View>
            )}
          />
        </Surface>

        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit, onInvalid)}
          loading={loading}
          style={styles.submitBtn}
          contentStyle={{ paddingVertical: 8 }}
          icon={isEdit ? 'content-save' : 'plus'}
        >
          {isEdit ? 'Update Part' : 'Add to Inventory'}
        </Button>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 60 },
  section: { padding: 16, borderRadius: 12, backgroundColor: '#FFFFFF', marginBottom: 16 },
  sectionTitle: { fontWeight: 'bold', color: '#1976D2', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#EEEEEE', paddingBottom: 8 },
  fieldWrap: { marginBottom: 12 },
  row: { flexDirection: 'row' },
  submitBtn: { marginTop: 8, marginBottom: 24, borderRadius: 8 },
});
