import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView, Alert, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

interface StaffLoginScreenProps {
  onLoginSuccess: () => void;
  onSwitchToAdmin: () => void;
}

export const StaffLoginScreen: React.FC<StaffLoginScreenProps> = ({ onLoginSuccess, onSwitchToAdmin }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone.trim() || phone.trim().length < 10) {
      const msg = 'Please enter a valid phone number (min 10 digits)';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Validation', msg);
      return;
    }
    if (!password.trim()) {
      const msg = 'Please enter your password';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Validation', msg);
      return;
    }

    setLoading(true);
    try {
      // Query garage_staff by phone
      const { data, error } = await supabase
        .from('garage_staff')
        .select('id, full_name, phone, role, garage_id, is_active, password')
        .eq('phone', phone.trim())
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Staff login query error:', error);
        throw new Error('Unable to connect. Please try again.');
      }

      if (!data) {
        throw new Error('No account found with this phone number.');
      }

      // Check password
      if (data.password !== password.trim()) {
        throw new Error('Incorrect password. Please try again.');
      }

      // Check active status
      if (!data.is_active) {
        throw new Error('Your account has been deactivated. Contact your admin.');
      }

      // Save staff session to AsyncStorage
      const staffSession = {
        id: data.id,
        full_name: data.full_name,
        phone: data.phone,
        role: data.role,
        garage_id: data.garage_id,
        loginType: 'staff',
      };
      await AsyncStorage.setItem('staffSession', JSON.stringify(staffSession));

      onLoginSuccess();

    } catch (err: any) {
      const msg = err.message || 'Login failed';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={styles.brandText}>WorkshopSeva</Text>
            <Button
              title="Back to Home"
              variant="outline"
              onPress={onSwitchToAdmin}
              style={styles.backBtn}
            />
          </View>

          {/* Role badge */}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>👤 Staff Login</Text>
          </View>

          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in with your phone number & password</Text>

          <Input
            label="Phone Number"
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Button
            title="Login"
            loading={loading}
            onPress={handleLogin}
            style={styles.submitBtn}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity onPress={onSwitchToAdmin} style={styles.switchBtn}>
            <Text style={styles.switchText}>Login as Admin / Owner →</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
  container: { flex: 1, justifyContent: 'center' },
  content: { paddingHorizontal: 24, paddingVertical: 40 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  brandText: { fontSize: 18, fontWeight: '800', color: '#1A202C' },
  backBtn: { width: 'auto', minWidth: 132, marginVertical: 0, paddingVertical: 10, paddingHorizontal: 14 },
  badge: {
    backgroundColor: '#EEF2FF',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  badgeText: { color: '#4338CA', fontSize: 13, fontWeight: '700' },
  title: { fontSize: 32, fontWeight: '700', color: '#1A202C', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#718096', marginBottom: 32 },
  submitBtn: { marginTop: 16, marginBottom: 8 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  dividerText: { marginHorizontal: 16, color: '#A0AEC0', fontSize: 13, fontWeight: '600' },
  switchBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  switchText: { color: '#4A5568', fontSize: 15, fontWeight: '600' },
});
