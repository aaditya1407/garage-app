import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { AdminDashboardScreen } from './AdminDashboardScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'BranchDashboard'>;

/**
 * BranchDashboardScreen
 * Thin wrapper so BranchDashboard can live as a proper stack screen.
 * The admin taps "Open →" on any branch card in OwnerDashboardScreen
 * and lands here, seeing the full branch dashboard with navigation.
 */
export const BranchDashboardScreen: React.FC<Props> = ({ route, navigation }) => {
  const { garageId, phone, fullName, userId } = route.params;

  return (
    <AdminDashboardScreen
      userId={userId}
      fullName={fullName}
      garageId={garageId}
      phone={phone}
      navigation={navigation as any}
      showBackToOwner
    />
  );
};
