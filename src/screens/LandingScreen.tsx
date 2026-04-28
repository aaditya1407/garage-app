import React from 'react';
import {
  Image,
  ImageBackground,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Button, Text } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'Landing'>;

const highlights = [
  { value: 'Fast', label: 'job card intake' },
  { value: 'Live', label: 'parts and billing visibility' },
  { value: 'Easy', label: 'staff-ready workflow' },
];

const features = [
  'Customer and vehicle records in one place',
  'Digital job cards from intake to delivery',
  'Inventory, billing, and invoice history built in',
];

export const LandingScreen: React.FC<Props> = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isWide = width >= 860;

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?q=80&w=1800&auto=format&fit=crop' }}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.shell}>
            <View style={styles.topBar}>
              <View style={styles.brandWrap}>
                <Image source={require('../../assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
                <Text style={styles.brandName}>WorkshopSeva</Text>
              </View>
              <Button
                mode="text"
                compact
                textColor="#FFFFFF"
                labelStyle={styles.topLoginLabel}
                onPress={() => navigation.navigate('Login')}
              >
                Log in
              </Button>
            </View>

            <View style={[styles.hero, isWide ? styles.heroWide : styles.heroNarrow]}>
              <View style={styles.heroCopy}>
                <Text style={styles.eyebrow}>Garage management made practical</Text>
                <Text style={[styles.title, isWide ? styles.titleWide : styles.titleNarrow]}>
                  Run every service bay with less paperwork.
                </Text>
                <Text style={styles.subtitle}>
                  WorkshopSeva helps garages manage customers, vehicles, job cards, parts, staff, and billing from one simple dashboard.
                </Text>

                <View style={[styles.actions, isWide ? styles.actionsWide : styles.actionsNarrow]}>
                  <Button
                    mode="contained"
                    style={styles.primaryButton}
                    contentStyle={styles.buttonContent}
                    labelStyle={styles.primaryButtonLabel}
                    onPress={() => navigation.navigate('GarageOnboarding')}
                  >
                    Register Garage
                  </Button>
                  <Button
                    mode="outlined"
                    style={styles.secondaryButton}
                    contentStyle={styles.buttonContent}
                    labelStyle={styles.secondaryButtonLabel}
                    onPress={() => navigation.navigate('Login')}
                  >
                    Open Dashboard
                  </Button>
                </View>

                <View style={[styles.contactRow, isWide ? styles.contactRowWide : styles.contactRowNarrow]}>
                  <Text style={styles.contactItem}>Call: 9755970253</Text>
                  {isWide && <Text style={styles.contactDivider}>|</Text>}
                  <Text style={styles.contactItem}>Email: contact@the3bsolutions.com</Text>
                </View>
              </View>

              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Built for daily workshop flow</Text>
                <View style={styles.highlightGrid}>
                  {highlights.map((item) => (
                    <View style={styles.highlight} key={item.value}>
                      <Text style={styles.highlightValue}>{item.value}</Text>
                      <Text style={styles.highlightLabel}>{item.label}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.featureList}>
                  {features.map((feature) => (
                    <View style={styles.featureItem} key={feature}>
                      <View style={styles.featureDot} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              </View>
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
    backgroundColor: '#111827',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 18, 32, 0.76)',
  },
  scrollContent: {
    flexGrow: 1,
  },
  shell: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'web' ? 28 : 44,
    paddingBottom: 32,
  },
  topBar: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  brandName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  topLoginLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 32,
    paddingTop: Platform.OS === 'web' ? 74 : 52,
    paddingBottom: 24,
  },
  heroWide: {
    flexDirection: 'row',
  },
  heroNarrow: {
    flexDirection: 'column',
  },
  heroCopy: {
    flex: 1,
    width: '100%',
    maxWidth: 660,
  },
  eyebrow: {
    color: '#FACC15',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0,
    marginBottom: 14,
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 18,
  },
  titleWide: {
    fontSize: 56,
    lineHeight: 64,
  },
  titleNarrow: {
    fontSize: 40,
    lineHeight: 48,
  },
  subtitle: {
    color: '#E5E7EB',
    fontSize: 18,
    lineHeight: 29,
    maxWidth: 600,
    marginBottom: 30,
  },
  actions: {
    gap: 14,
    marginBottom: 22,
  },
  actionsWide: {
    flexDirection: 'row',
  },
  actionsNarrow: {
    flexDirection: 'column',
  },
  buttonContent: {
    minHeight: 52,
    paddingHorizontal: 16,
  },
  primaryButton: {
    borderRadius: 8,
    backgroundColor: '#F59E0B',
  },
  primaryButtonLabel: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    borderRadius: 8,
    borderColor: '#FFFFFF',
    borderWidth: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  secondaryButtonLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  contactRow: {
    gap: 4,
  },
  contactRowWide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactRowNarrow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  contactItem: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  contactDivider: {
    color: '#94A3B8',
    fontSize: 14,
  },
  panel: {
    width: '100%',
    maxWidth: 430,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    padding: 22,
  },
  panelTitle: {
    color: '#111827',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    marginBottom: 18,
  },
  highlightGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  highlight: {
    flex: 1,
    minHeight: 92,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    justifyContent: 'center',
  },
  highlightValue: {
    color: '#0F766E',
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
  },
  highlightLabel: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  featureList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
    marginTop: 7,
  },
  featureText: {
    flex: 1,
    color: '#334155',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
});
