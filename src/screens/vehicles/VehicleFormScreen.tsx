import React from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { VehicleForm } from '../../components/VehicleForm';

type Props = NativeStackScreenProps<RootStackParamList, 'VehicleForm'>;

export const VehicleFormScreen: React.FC<Props> = ({ navigation, route }) => {
  const { garageId } = route.params;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ padding: 24, flex: 1 }}>
         <VehicleForm 
             garageId={garageId} 
             onSuccess={() => navigation.goBack()} 
         />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' }
});
