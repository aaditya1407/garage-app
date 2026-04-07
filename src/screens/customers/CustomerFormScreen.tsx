import React from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { CustomerForm } from '../../components/CustomerForm';

type Props = NativeStackScreenProps<RootStackParamList, 'CustomerForm'>;

export const CustomerFormScreen: React.FC<Props> = ({ navigation, route }) => {
  const { garageId } = route.params;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ padding: 24, flex: 1 }}>
         <Text variant="headlineSmall" style={styles.title}>New Customer Details</Text>
         <CustomerForm 
             garageId={garageId} 
             onSuccess={() => navigation.goBack()} 
         />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  title: { marginBottom: 24, fontWeight: 'bold', color: '#212121' },
});
