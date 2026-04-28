import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';
import { Button } from '../components/Button';

type Props = NativeStackScreenProps<AuthStackParamList, 'RegistrationThankYou'>;

export const RegistrationThankYouScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Success Icon */}
        <View style={styles.iconCircle}>
          <Text style={styles.iconEmoji}>🎉</Text>
        </View>

        {/* Heading */}
        <Text style={styles.title}>Thank You for Registering!</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Your garage registration is almost complete.
        </Text>

        {/* Info card */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.cardIcon}>✉️</Text>
            <View style={styles.cardTextWrap}>
              <Text style={styles.cardTitle}>Verify Your Email</Text>
              <Text style={styles.cardDescription}>
                We've sent a verification link to your email address. Please check your inbox and click the link to activate your account.
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.cardRow}>
            <Text style={styles.cardIcon}>🔑</Text>
            <View style={styles.cardTextWrap}>
              <Text style={styles.cardTitle}>Get Your Garage Code</Text>
              <Text style={styles.cardDescription}>
                Once your email is verified, log in to receive your unique Garage Code. Share it with your staff so they can join your workspace.
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <Button
          title="Go to Login"
          onPress={() => navigation.navigate('Login')}
          style={styles.loginBtn}
        />
        <Button
          title="Back to Home"
          variant="outline"
          onPress={() => navigation.navigate('Landing')}
          style={styles.homeBtn}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F0FDF4',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 24px rgba(34,197,94,0.18)',
      },
      default: {
        shadowColor: '#22C55E',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 6,
      },
    }),
  },
  iconEmoji: {
    fontSize: 48,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#166534',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  cardIcon: {
    fontSize: 28,
    marginTop: 2,
  },
  cardTextWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 21,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  loginBtn: {
    width: '100%',
    maxWidth: 420,
    marginBottom: 12,
  },
  homeBtn: {
    width: '100%',
    maxWidth: 420,
  },
});
