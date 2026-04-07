import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, SafeAreaView } from 'react-native';

interface SelectOption {
  label: string;
  value: string;
}

interface DropdownProps {
  label: string;
  options: SelectOption[];
  value: string;
  onSelect: (val: string) => void;
  error?: string;
  placeholder?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({ label, options, value, onSelect, error, placeholder = "Select an option" }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedOption = options.find(o => o.value === value);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      <TouchableOpacity 
        style={[styles.input, error && styles.inputError]} 
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={selectedOption ? styles.valueText : styles.placeholderText}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
      </TouchableOpacity>
      
      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <Text style={styles.closeText}>Done</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.optionItem, value === item.value && styles.optionItemSelected]}
                  onPress={() => {
                    onSelect(item.value);
                    setModalVisible(false);
                  }}
                >
                  <Text style={[styles.optionText, value === item.value && styles.optionTextSelected]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <SafeAreaView />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
    height: 48,
  },
  inputError: {
    borderColor: '#E53E3E',
  },
  valueText: {
    color: '#333',
    fontSize: 16,
  },
  placeholderText: {
    color: '#999',
    fontSize: 16,
  },
  errorText: {
    color: '#E53E3E',
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: '50%',
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    color: '#208AEF',
    fontWeight: '600',
    fontSize: 16,
  },
  optionItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth:1,
    borderBottomColor: '#F5F5F5',
  },
  optionItemSelected: {
    backgroundColor: '#F0F8FF',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  optionTextSelected: {
    color: '#208AEF',
    fontWeight: '600',
  },
});
