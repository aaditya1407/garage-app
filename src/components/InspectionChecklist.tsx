import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { List, SegmentedButtons, Text, Divider, useTheme } from 'react-native-paper';

export type InspectionStatus = 'OK' | 'Attention' | 'Not OK' | '';

export interface InspectionData {
  exterior: {
    body_condition: InspectionStatus;
    lights: InspectionStatus;
    windshield: InspectionStatus;
    wipers: InspectionStatus;
  };
  interior: {
    seats: InspectionStatus;
    dashboard_lights: InspectionStatus;
    horn: InspectionStatus;
    ac: InspectionStatus;
  };
  engine_bay: {
    oil_level: InspectionStatus;
    coolant: InspectionStatus;
    battery: InspectionStatus;
    leakage: InspectionStatus;
  };
  underbody: {
    brakes: InspectionStatus;
    suspension: InspectionStatus;
    tyres: InspectionStatus;
    exhaust: InspectionStatus;
  };
}

const INITIAL_DATA: InspectionData = {
  exterior: { body_condition: '', lights: '', windshield: '', wipers: '' },
  interior: { seats: '', dashboard_lights: '', horn: '', ac: '' },
  engine_bay: { oil_level: '', coolant: '', battery: '', leakage: '' },
  underbody: { brakes: '', suspension: '', tyres: '', exhaust: '' },
};

interface Props {
  onChange: (data: InspectionData) => void;
  initialData?: InspectionData;
}

const CATEGORY_MAP: Record<keyof InspectionData, { title: string, keys: string[] }> = {
  exterior: { title: "Exterior", keys: ['body_condition', 'lights', 'windshield', 'wipers'] },
  interior: { title: "Interior", keys: ['seats', 'dashboard_lights', 'horn', 'ac'] },
  engine_bay: { title: "Engine Bay", keys: ['oil_level', 'coolant', 'battery', 'leakage'] },
  underbody: { title: "Underbody", keys: ['brakes', 'suspension', 'tyres', 'exhaust'] },
};

export const InspectionChecklist: React.FC<Props> = ({ onChange, initialData }) => {
  const [data, setData] = useState<InspectionData>(() => {
    if (!initialData || Object.keys(initialData).length === 0) return INITIAL_DATA;
    return {
      exterior: { ...INITIAL_DATA.exterior, ...(initialData.exterior || {}) },
      interior: { ...INITIAL_DATA.interior, ...(initialData.interior || {}) },
      engine_bay: { ...INITIAL_DATA.engine_bay, ...(initialData.engine_bay || {}) },
      underbody: { ...INITIAL_DATA.underbody, ...(initialData.underbody || {}) },
    };
  });
  const [expandedId, setExpandedId] = useState<string | number>('');

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setData({
        exterior: { ...INITIAL_DATA.exterior, ...(initialData.exterior || {}) },
        interior: { ...INITIAL_DATA.interior, ...(initialData.interior || {}) },
        engine_bay: { ...INITIAL_DATA.engine_bay, ...(initialData.engine_bay || {}) },
        underbody: { ...INITIAL_DATA.underbody, ...(initialData.underbody || {}) },
      });
    }
  }, [initialData]);

  const handleUpdate = (category: keyof InspectionData, key: string, value: InspectionStatus) => {
    const newData = {
      ...data,
      [category]: {
        ...data[category],
        [key]: value
      }
    };
    setData(newData);
    onChange(newData); // Emit immediately to parent
  };

  const formatLabel = (key: string) => {
    return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const renderSection = (categoryKey: keyof InspectionData) => {
    const { title, keys } = CATEGORY_MAP[categoryKey];
    
    return (
      <List.Accordion
        title={title}
        id={categoryKey}
        left={props => <List.Icon {...props} icon="clipboard-check-outline" />}
        style={styles.accordionHeader}
        titleStyle={{ fontWeight: 'bold' }}
      >
        <View style={styles.sectionContainer}>
          {keys.map((key, index) => {
             const val = data[categoryKey][key as keyof typeof data[typeof categoryKey]] as InspectionStatus;
             
             return (
               <View key={key} style={styles.itemRow}>
                 <Text style={styles.itemTitle}>{formatLabel(key)}</Text>
                 <SegmentedButtons
                   value={val}
                   onValueChange={(v) => handleUpdate(categoryKey, key, v as InspectionStatus)}
                   buttons={[
                     { value: 'OK', label: 'OK', uncheckedColor: '#757575', checkedColor: '#4CAF50', style: val === 'OK' ? { backgroundColor: '#E8F5E9' } : {} },
                     { value: 'Attention', label: 'Warn', uncheckedColor: '#757575', checkedColor: '#FF9800', style: val === 'Attention' ? { backgroundColor: '#FFF3E0' } : {} },
                     { value: 'Not OK', label: 'Bad', uncheckedColor: '#757575', checkedColor: '#F44336', style: val === 'Not OK' ? { backgroundColor: '#FFEBEE' } : {} },
                   ]}
                   density="small"
                   style={styles.segmentedButtons}
                 />
                 {index < keys.length - 1 && <Divider style={{marginVertical: 12}}/>}
               </View>
             );
          })}
        </View>
      </List.Accordion>
    );
  };

  return (
    <View style={styles.container}>
       <List.AccordionGroup
          expandedId={expandedId}
          onAccordionPress={(id) => setExpandedId(expandedId === id ? '' : id)}
       >
          {renderSection('exterior')}
          {renderSection('interior')}
          {renderSection('engine_bay')}
          {renderSection('underbody')}
       </List.AccordionGroup>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  accordionHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  sectionContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  itemRow: {
    marginBottom: 8,
  },
  itemTitle: {
    fontWeight: '600',
    color: '#424242',
    marginBottom: 8,
  },
  segmentedButtons: {
    width: '100%',
  }
});
