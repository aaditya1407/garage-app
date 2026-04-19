import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, Alert, KeyboardAvoidingView } from 'react-native';
import { Text, TextInput, Button, SegmentedButtons } from 'react-native-paper';
import { supabase } from '../../lib/supabase';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'StaffForm'>;

const C = {
  bg: '#0F1923', surface: '#1A2535', border: '#2A3A52',
  accent: '#3B82F6', green: '#22C55E', red: '#F87171',
  text: '#F0F4FF', textMuted: '#8BA0BE',
};

export const StaffFormScreen: React.FC<Props> = ({ route, navigation }) => {
  const { garageId, staff } = route.params;
  const isEdit = !!staff;

  const [fullName, setFullName]   = useState(staff?.full_name || '');
  const [phone, setPhone]         = useState(staff?.phone || '');
  const [email, setEmail]         = useState(staff?.email || '');
  const [password, setPassword]   = useState(staff?.password || '');
  const [role, setRole]           = useState(staff?.role || 'technician');
  const [isActive, setIsActive]   = useState(staff?.is_active !== false ? 'active' : 'inactive');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving]       = useState(false);

  const validate = (): string | null => {
    if (!fullName.trim()) return 'Full name is required';
    if (!phone.trim() || phone.trim().length < 10) return 'Valid phone number is required (min 10 digits)';
    if (!password.trim() || password.trim().length < 4) return 'Password must be at least 4 characters';
    return null;
  };

  const onSave = async () => {
    const err = validate();
    if (err) {
      Platform.OS === 'web' ? window.alert(err) : Alert.alert('Validation', err);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        garage_id: garageId,
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        password: password.trim(),
        role,
        is_active: isActive === 'active',
      };

      if (isEdit) {
        const { data: updated, error } = await supabase
          .from('garage_staff')
          .update(payload)
          .eq('id', staff.id)
          .eq('garage_id', garageId)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        if (!updated) throw new Error('Staff member not found for this garage.');
      } else {
        const { error } = await supabase.from('garage_staff').insert(payload);
        if (error) {
          if (error.message.includes('unique_staff_phone_per_garage')) {
            throw new Error('A staff member with this phone number already exists.');
          }
          throw error;
        }
      }

      const msg = isEdit ? 'Staff updated successfully!' : 'Staff member added!';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Success', msg);
      navigation.goBack();
    } catch (e: any) {
      const msg = e.message || 'Something went wrong';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Staff Details</Text>

          <TextInput
            mode="outlined"
            label="Full Name *"
            value={fullName}
            onChangeText={setFullName}
            style={styles.input}
            outlineColor={C.border}
            activeOutlineColor={C.accent}
            textColor={C.text}
            theme={{ colors: { onSurfaceVariant: C.textMuted } }}
            left={<TextInput.Icon icon="account" color={C.textMuted} />}
          />

          <TextInput
            mode="outlined"
            label="Phone Number (User ID) *"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={styles.input}
            outlineColor={C.border}
            activeOutlineColor={C.accent}
            textColor={C.text}
            theme={{ colors: { onSurfaceVariant: C.textMuted } }}
            left={<TextInput.Icon icon="phone" color={C.textMuted} />}
          />

          <TextInput
            mode="outlined"
            label="Email (optional)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            outlineColor={C.border}
            activeOutlineColor={C.accent}
            textColor={C.text}
            theme={{ colors: { onSurfaceVariant: C.textMuted } }}
            left={<TextInput.Icon icon="email" color={C.textMuted} />}
          />

          <TextInput
            mode="outlined"
            label="Password *"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            style={styles.input}
            outlineColor={C.border}
            activeOutlineColor={C.accent}
            textColor={C.text}
            theme={{ colors: { onSurfaceVariant: C.textMuted } }}
            left={<TextInput.Icon icon="lock" color={C.textMuted} />}
            right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} color={C.textMuted} onPress={() => setShowPassword(!showPassword)} />}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Role</Text>
          <SegmentedButtons
            value={role}
            onValueChange={setRole}
            buttons={[
              { value: 'service_advisor', label: 'Advisor', icon: 'clipboard-text' },
              { value: 'technician',      label: 'Technician', icon: 'wrench' },
              { value: 'accountant',      label: 'Accountant', icon: 'calculator' },
            ]}
            style={{ marginBottom: 8 }}
            theme={{ colors: { onSurface: C.text, secondaryContainer: C.accent, onSecondaryContainer: '#FFF', outline: C.border } }}
          />
          <Text style={styles.roleHint}>
            {role === 'service_advisor' && '↳ Can create job cards and view active jobs'}
            {role === 'technician' && '↳ Can view assigned jobs and update job status'}
            {role === 'accountant' && '↳ Can generate bills and view revenue reports'}
          </Text>
        </View>

        {isEdit && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Status</Text>
            <SegmentedButtons
              value={isActive}
              onValueChange={setIsActive}
              buttons={[
                { value: 'active',   label: 'Active',   icon: 'check-circle' },
                { value: 'inactive', label: 'Inactive', icon: 'close-circle' },
              ]}
              theme={{ colors: { onSurface: C.text, secondaryContainer: C.accent, onSecondaryContainer: '#FFF', outline: C.border } }}
            />
          </View>
        )}

        <Button
          mode="contained"
          onPress={onSave}
          loading={saving}
          style={styles.saveBtn}
          contentStyle={{ paddingVertical: 8 }}
          buttonColor={C.accent}
          icon={isEdit ? 'content-save' : 'account-plus'}
        >
          {isEdit ? 'Update Staff' : 'Add Staff Member'}
        </Button>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 60 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  sectionTitle: { color: C.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 },
  input: { marginBottom: 14, backgroundColor: C.surface },
  roleHint: { color: C.textMuted, fontSize: 12, marginTop: 8, fontStyle: 'italic' },
  saveBtn: { marginTop: 8, borderRadius: 12 },
});
