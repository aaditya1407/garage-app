import React from 'react';
import { View, StyleSheet, ImageBackground, StatusBar, ScrollView } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'Landing'>;

export const LandingScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <ImageBackground 
      source={{ uri: 'https://images.unsplash.com/photo-1615906655593-ad0386982a0f?q=80&w=1000&auto=format&fit=crop' }} 
      style={styles.background}
    >
      <StatusBar barStyle="light-content" />
      {/* Dark Overlay for elegance */}
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.container}>
          
          <View style={styles.content}>
            <Text style={styles.title}>WorkshopSeva</Text>
            <Text style={styles.subtitle}>Streamlining your garage management with intelligence and ease.</Text>
          </View>

          <View style={styles.bottomSection}>
            <View style={styles.contactContainer}>
              <Text style={styles.contactText}>📞 9755970253</Text>
              <Text style={styles.contactText}>✉️ contact@the3bsolutions.com</Text>
            </View>

            <View style={styles.buttonContainer}>
              <Button 
                mode="contained" 
                style={styles.loginBtn}
                contentStyle={styles.btnContent}
                labelStyle={styles.loginBtnLabel}
                onPress={() => navigation.navigate('Login')}
              >
                Log In to Dashboard
              </Button>
              <Button 
                mode="outlined" 
                style={styles.signupBtn}
                contentStyle={styles.btnContent}
                labelStyle={styles.signupBtnLabel}
                onPress={() => navigation.navigate('GarageOnboarding')}
              >
                Register a New Garage
              </Button>
            </View>
          </View>
          
        </ScrollView>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 20, 35, 0.8)', // Deep blue elegant overlay
  },
  container: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: '20%',
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10
  },
  subtitle: {
    fontSize: 16,
    color: '#D1D5DB',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: '85%',
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  contactContainer: {
    alignItems: 'center',
    marginBottom: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  contactText: {
    color: '#E5E7EB',
    fontSize: 14,
    marginVertical: 4,
    fontWeight: '500'
  },
  buttonContainer: {
    gap: 16,
  },
  btnContent: {
    paddingVertical: 8,
  },
  loginBtn: {
    borderRadius: 8,
    backgroundColor: '#3B82F6', // Vibrant blue
  },
  loginBtnLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  signupBtn: {
    borderRadius: 8,
    borderColor: '#FFFFFF',
    borderWidth: 1.5,
  },
  signupBtnLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
