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

const resetSchema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ResetFormData = z.infer<typeof resetSchema>;
type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;

interface ResetPasswordScreenProps {
  navigation: NavigationProp;
  onPasswordResetComplete: () => void;
  onCancel: () => void;
}

export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({
  onPasswordResetComplete,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    variant: AlertVariant;
    onCloseAction?: () => void;
  }>({ title: '', message: '', variant: 'info' });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const showAlert = (
    title: string,
    message: string,
    variant: AlertVariant,
    onCloseAction?: () => void
  ) => {
    setAlertConfig({ title, message, variant, onCloseAction });
    setAlertVisible(true);
  };

  const onSubmit = async (data: ResetFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password.trim(),
      });

      if (error) {
        showAlert('Reset Failed', error.message, 'error');
      } else {
        showAlert(
          'Success!',
          'Your password has been reset successfully. You will now be taken to your dashboard.',
          'success',
          onPasswordResetComplete
        );
      }
    } catch (err: any) {
      showAlert(
        'Error',
        err.message || 'Something went wrong. Please try again.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAlertClose = () => {
    setAlertVisible(false);
    if (alertConfig.onCloseAction) {
      alertConfig.onCloseAction();
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
              title="Cancel"
              variant="outline"
              onPress={onCancel}
              style={styles.backBtn}
            />
          </View>

          {/* Badge */}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🔒 Reset Password</Text>
          </View>

          <Text style={styles.title}>Create New Password</Text>
          <Text style={styles.subtitle}>
            Please enter and confirm your new password below.
          </Text>

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="New Password"
                placeholder="Enter at least 6 characters"
                secureTextEntry
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.password?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Confirm Password"
                placeholder="Re-enter your new password"
                secureTextEntry
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={errors.confirmPassword?.message}
              />
            )}
          />

          <Button
            title="Update Password"
            loading={loading}
            onPress={handleSubmit(onSubmit)}
            style={styles.submitBtn}
          />

          <TouchableOpacity onPress={onCancel} style={styles.backLink}>
            <Text style={styles.backLinkText}>Cancel & Go Back</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <AlertModal
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        variant={alertConfig.variant}
        onClose={handleAlertClose}
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
    minWidth: 100,
    marginVertical: 0,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  badge: {
    backgroundColor: '#EFF6FF',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  badgeText: { color: '#1E40AF', fontSize: 13, fontWeight: '700' },
  title: { fontSize: 32, fontWeight: '700', color: '#1A202C', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#718096', marginBottom: 32 },
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
