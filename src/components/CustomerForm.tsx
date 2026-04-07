import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { TextInput, Button, HelperText } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const customerSchema = z.object({
  fullName: z.string().min(1, 'Name is required'),
  phone: z.string().length(10, 'Mobile number must be exactly 10 digits').regex(/^\d+$/, 'Must contain only numbers'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  address: z.string().min(1, 'Address is required'),
  gstNumber: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface Props {
  garageId: string;
  onSuccess: (customerId: string) => void;
  onCancel?: () => void;
}

export const CustomerForm: React.FC<Props> = ({ garageId, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: { fullName: '', phone: '', email: '', address: '', gstNumber: '' }
  });

  const onSubmit = async (data: CustomerFormData) => {
    setLoading(true);
    try {
      const { data: newCust, error } = await supabase.from('customers').insert({
        garage_id: garageId,
        full_name: data.fullName,
        phone: data.phone,
        email: data.email || null,
        address: data.address,
        gst_number: data.gstNumber || null,
      }).select().single();

      if (error) throw error;
      
      if (Platform.OS !== 'web') Alert.alert("Success", "Customer added successfully!");
      onSuccess(newCust.id);

    } catch (error: any) {
      console.error(error);
      if(Platform.OS === 'web') window.alert("Failed to add customer: " + error.message);
      else Alert.alert("Error", error.message || "Failed to add customer");
    } finally {
      setLoading(false);
    }
  };

  const onInvalid = () => {
    if (Platform.OS === 'web') window.alert("Please fill in all mandatory fields correctly.");
    else Alert.alert("Validation Error", "Please fill in all mandatory fields correctly.");
  };

  return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Controller
          control={control}
          name="fullName"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.inputContainer}>
              <TextInput mode="outlined" label="Full Name *" onBlur={onBlur} onChangeText={onChange} value={value} error={!!errors.fullName} />
              {errors.fullName && <HelperText type="error" visible={true}>{errors.fullName.message}</HelperText>}
            </View>
          )}
        />
        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.inputContainer}>
              <TextInput mode="outlined" label="Mobile Number (10 Digits) *" keyboardType="numeric" maxLength={10} onBlur={onBlur} onChangeText={onChange} value={value} error={!!errors.phone} />
              {errors.phone && <HelperText type="error" visible={true}>{errors.phone.message}</HelperText>}
            </View>
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.inputContainer}>
              <TextInput mode="outlined" label="Email Address" keyboardType="email-address" autoCapitalize="none" onBlur={onBlur} onChangeText={onChange} value={value} error={!!errors.email} />
              {errors.email && <HelperText type="error" visible={true}>{errors.email.message}</HelperText>}
            </View>
          )}
        />
        <Controller
          control={control}
          name="address"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.inputContainer}>
              <TextInput mode="outlined" label="Address *" multiline numberOfLines={3} onBlur={onBlur} onChangeText={onChange} value={value} error={!!errors.address} />
              {errors.address && <HelperText type="error" visible={true}>{errors.address.message}</HelperText>}
            </View>
          )}
        />
        <Controller
          control={control}
          name="gstNumber"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.inputContainer}>
              <TextInput mode="outlined" label="GST Number (Optional)" autoCapitalize="characters" onBlur={onBlur} onChangeText={onChange} value={value} error={!!errors.gstNumber} />
              {errors.gstNumber && <HelperText type="error" visible={true}>{errors.gstNumber.message}</HelperText>}
            </View>
          )}
        />

        <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 16}}>
           {onCancel && <Button mode="outlined" onPress={onCancel} style={{width: '48%'}}>Cancel</Button>}
           <Button mode="contained" onPress={handleSubmit(onSubmit, onInvalid)} loading={loading} style={{width: onCancel ? '48%' : '100%'}}>
             Save Customer
           </Button>
        </View>
      </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: { padding: 4 },
  inputContainer: { marginBottom: 12 },
});
