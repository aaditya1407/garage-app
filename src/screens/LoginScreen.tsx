import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView, Alert, TouchableOpacity } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import { supabase } from '../lib/supabase';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;
type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

interface LoginScreenProps {
  navigation: NavigationProp;
  onSwitchToStaff?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation, onSwitchToStaff }) => {
  const [loading, setLoading] = useState(false);
  
  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Login Failed', error.message);
    } else {
      Alert.alert('Welcome Back!', 'You have successfully logged in.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.content}>
          {/* Role badge */}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🏢 Admin / Owner</Text>
          </View>

          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your Garage Manager account</Text>

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email Address"
                placeholder="Enter your email"
                autoCapitalize="none"
                keyboardType="email-address"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                placeholder="Enter your password"
                secureTextEntry
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.password?.message}
              />
            )}
          />

          <Button title="Login" loading={loading} onPress={handleSubmit(onSubmit)} style={styles.submitBtn} />
          
          <Button 
            title="Don't have an account? Sign Up" 
            variant="outline" 
            onPress={() => navigation.navigate('SignupChoice')} 
          />

          {onSwitchToStaff && (
            <>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity onPress={onSwitchToStaff} style={styles.switchBtn}>
                <Text style={styles.switchText}>Login as Staff Member →</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
  container: { flex: 1, justifyContent: 'center' },
  content: { paddingHorizontal: 24, paddingVertical: 40 },
  badge: {
    backgroundColor: '#FEF3C7',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  badgeText: { color: '#92400E', fontSize: 13, fontWeight: '700' },
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
