import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface StatCardProps {
  title: string;
  value: string | number;
  iconName: keyof typeof Feather.glyphMap;
  color?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, iconName, color = '#208AEF' }) => {
  return (
    <View style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
        <Feather name={iconName} size={24} color={color} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '47%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A202C',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
});
