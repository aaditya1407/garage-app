import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { AlertModal, AlertVariant } from '../components/AlertModal';
import { supabase } from '../lib/supabase';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';

const forgotSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
});

type ForgotFormData = z.infer<typeof forgotSchema>;
type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

interface ForgotPasswordScreenProps {
  navigation: NavigationProp;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    variant: AlertVariant;
  }>({ title: '', message: '', variant: 'info' });

  const { control, handleSubmit, formState: { errors } } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const showAlert = (title: string, message: string, variant: AlertVariant) => {
    setAlertConfig({ title, message, variant });
    setAlertVisible(true);
  };

  const onSubmit = async (data: ForgotFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email);

      if (error) {
        showAlert('Error', error.message, 'error');
      } else {
        showAlert(
          'Email Sent!',
          'If an account exists with this email, you will receive a password reset link. Please check your inbox and spam folder.',
          'success'
        );
      }
    } catch (err: any) {
      showAlert('Error', err.message || 'Something went wrong. Please try again.', 'error');
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
              title="Back to Login"
              variant="outline"
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
            />
          </View>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>

          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            No worries! Enter the email address associated with your account and we'll send you a link to reset your password.
          </Text>

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email Address"
                placeholder="Enter your registered email"
                autoCapitalize="none"
                keyboardType="email-address"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.email?.message}
              />
            )}
          />

          <Button
            title="Send Reset Link"
            loading={loading}
            onPress={handleSubmit(onSubmit)}
            style={styles.submitBtn}
          />

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
            <Text style={styles.backLinkText}>← Back to Login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <AlertModal
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        variant={alertConfig.variant}
        onClose={() => {
          setAlertVisible(false);
          if (alertConfig.variant === 'success') {
            navigation.navigate('Login');
          }
        }}
      />
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
  backBtn: {
    width: 'auto',
    minWidth: 132,
    marginVertical: 0,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  iconContainer: {
    alignSelf: 'center',
    backgroundColor: '#EEF2FF',
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  lockIcon: { fontSize: 32 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#718096',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
  submitBtn: { marginTop: 16, marginBottom: 12 },
  backLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backLinkText: {
    color: '#4A5568',
    fontSize: 15,
    fontWeight: '600',
  },
});
