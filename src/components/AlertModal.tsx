import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';

export type AlertVariant = 'error' | 'success' | 'info' | 'warning';

interface AlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  variant?: AlertVariant;
  onClose: () => void;
  autoDismissMs?: number;
}

const VARIANT_CONFIG: Record<AlertVariant, { icon: string; bg: string; border: string; titleColor: string; iconBg: string }> = {
  error: {
    icon: '✕',
    bg: '#FEF2F2',
    border: '#FECACA',
    titleColor: '#991B1B',
    iconBg: '#FEE2E2',
  },
  success: {
    icon: '✓',
    bg: '#F0FDF4',
    border: '#BBF7D0',
    titleColor: '#166534',
    iconBg: '#DCFCE7',
  },
  info: {
    icon: 'ℹ',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    titleColor: '#1E40AF',
    iconBg: '#DBEAFE',
  },
  warning: {
    icon: '⚠',
    bg: '#FFFBEB',
    border: '#FDE68A',
    titleColor: '#92400E',
    iconBg: '#FEF3C7',
  },
};

export const AlertModal: React.FC<AlertModalProps> = ({
  visible,
  title,
  message,
  variant = 'info',
  onClose,
  autoDismissMs,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const config = VARIANT_CONFIG[variant];

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 65,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      if (autoDismissMs) {
        const timer = setTimeout(onClose, autoDismissMs);
        return () => clearTimeout(timer);
      }
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <TouchableOpacity activeOpacity={1}>
            <View style={[styles.card, { backgroundColor: config.bg, borderColor: config.border }]}>
              {/* Icon circle */}
              <View style={[styles.iconCircle, { backgroundColor: config.iconBg }]}>
                <Text style={[styles.iconText, { color: config.titleColor }]}>
                  {config.icon}
                </Text>
              </View>

              {/* Title */}
              <Text style={[styles.title, { color: config.titleColor }]}>
                {title}
              </Text>

              {/* Message */}
              <Text style={styles.message}>{message}</Text>

              {/* Close button */}
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: config.titleColor }]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.closeBtnText}>OK</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 380,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 30,
        elevation: 12,
      },
    }),
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 24,
    fontWeight: '800',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  closeBtn: {
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
