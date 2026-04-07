import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'SignupChoice'>;

interface SignupChoiceScreenProps {
  navigation: NavigationProp;
}

export const SignupChoiceScreen: React.FC<SignupChoiceScreenProps> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Welcome back!{'\n'}How are you joining us?</Text>
        <Text style={styles.subtitle}>Choose your onboarding path below.</Text>

        <TouchableOpacity 
          style={styles.card} 
          onPress={() => navigation.navigate('GarageOnboarding')}
          activeOpacity={0.8}
        >
          <Text style={styles.cardEmoji}>🏢</Text>
          <View style={styles.cardTextCont}>
            <Text style={styles.cardTitle}>Register a New Garage</Text>
            <Text style={styles.cardDesc}>I am an owner/admin and want to set up my workspace.</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.card} 
          onPress={() => navigation.navigate('StaffSignup')}
          activeOpacity={0.8}
        >
          <Text style={styles.cardEmoji}>🔧</Text>
          <View style={styles.cardTextCont}>
            <Text style={styles.cardTitle}>Join an Existing Garage</Text>
            <Text style={styles.cardDesc}>I have a 4-digit invite code from my admin.</Text>
          </View>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
  container: { flex: 1, paddingHorizontal: 24, paddingVertical: 20 },
  title: { fontSize: 28, fontWeight: '700', color: '#1A202C', marginBottom: 8, lineHeight: 36 },
  subtitle: { fontSize: 16, color: '#718096', marginBottom: 40 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  cardEmoji: {
    fontSize: 40,
    marginRight: 20,
  },
  cardTextCont: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
  }
});
