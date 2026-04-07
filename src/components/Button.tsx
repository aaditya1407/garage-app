import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, TouchableOpacityProps } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
}

export const Button: React.FC<ButtonProps> = ({ 
  title, 
  loading = false, 
  variant = 'primary', 
  style,
  ...props 
}) => {
  const isOutline = variant === 'outline';
  
  return (
    <TouchableOpacity
      style={[
        styles.button,
        variant === 'secondary' && styles.secondaryButton,
        isOutline && styles.outlineButton,
        props.disabled && styles.disabledButton,
        style,
      ]}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? '#208AEF' : '#FFFFFF'} />
      ) : (
        <Text style={[
          styles.text, 
          isOutline && styles.outlineText
        ]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#208AEF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginVertical: 8,
  },
  secondaryButton: {
    backgroundColor: '#4A5568',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#208AEF',
  },
  disabledButton: {
    opacity: 0.6,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  outlineText: {
    color: '#208AEF',
  },
});
