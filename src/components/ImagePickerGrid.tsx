import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { Text, Surface, IconButton } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';

export type ImageSlots = {
  front: string | null;
  rear: string | null;
  left: string | null;
  right: string | null;
  odometer: string | null;
};

interface Props {
  onChange: (images: ImageSlots) => void;
}

export const ImagePickerGrid: React.FC<Props> = ({ onChange }) => {
  const [images, setImages] = useState<ImageSlots>({
    front: null,
    rear: null,
    left: null,
    right: null,
    odometer: null,
  });

  const pickImage = async (slot: keyof ImageSlots) => {
    // Request permissions dynamically
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      if (Platform.OS === 'web') window.alert('Sorry, we need camera roll permissions to make this work!');
      else Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    if (Platform.OS === 'web') {
      // Alert.alert with custom buttons doesn't work well on standard React Native Web
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
      });
      if (!result.canceled) updateSlot(slot, result.assets[0].uri);
      return;
    }

    Alert.alert(
      "Capture Image",
      "Choose image source",
      [
        {
          text: "Camera",
          onPress: async () => {
             const camStatus = await ImagePicker.requestCameraPermissionsAsync();
             if(camStatus.status !== 'granted') return Alert.alert("Need camera permissions");
             
             let result = await ImagePicker.launchCameraAsync({
               mediaTypes: ImagePicker.MediaTypeOptions.Images,
               allowsEditing: true,
               aspect: [4, 3],
               quality: 0.5,
             });
             if (!result.canceled) updateSlot(slot, result.assets[0].uri);
          }
        },
        {
          text: "Gallery",
          onPress: async () => {
             let result = await ImagePicker.launchImageLibraryAsync({
               mediaTypes: ImagePicker.MediaTypeOptions.Images,
               allowsEditing: true,
               aspect: [4, 3],
               quality: 0.5,
             });
             if (!result.canceled) updateSlot(slot, result.assets[0].uri);
          }
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const updateSlot = (slot: keyof ImageSlots, uri: string) => {
    const updated = { ...images, [slot]: uri };
    setImages(updated);
    onChange(updated);
  };

  const removeImage = (slot: keyof ImageSlots) => {
    const updated = { ...images, [slot]: null };
    setImages(updated);
    onChange(updated);
  };

  const renderSlot = (slotKey: keyof ImageSlots, title: string) => {
    const uri = images[slotKey];
    
    return (
      <View style={styles.slotContainer} key={slotKey}>
        <Text variant="labelSmall" style={styles.slotLabel}>{title}</Text>
        <TouchableOpacity onPress={() => pickImage(slotKey)}>
          <Surface style={styles.imageBox} elevation={1}>
            {uri ? (
              <>
                <Image source={{ uri }} style={styles.image} />
                <View style={styles.removeBtn}>
                   <IconButton icon="close" size={16} iconColor="white" onPress={() => removeImage(slotKey)} />
                </View>
              </>
            ) : (
              <View style={styles.placeholderBox}>
                <IconButton icon="camera-plus" size={24} iconColor="#9E9E9E" />
              </View>
            )}
          </Surface>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.headerTitle}>Vehicle Assets & Intake Photos</Text>
      <View style={styles.grid}>
        {renderSlot('front', 'Front View')}
        {renderSlot('rear', 'Rear View')}
        {renderSlot('left', 'Left Side')}
        {renderSlot('right', 'Right Side')}
        {renderSlot('odometer', 'Odometer')}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
  },
  headerTitle: {
    fontWeight: 'bold', 
    color: '#1976D2', 
    marginBottom: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#EEEEEE', 
    paddingBottom: 8
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  slotContainer: {
    width: '31%', // Fits 3 in a row comfortably
    marginBottom: 16,
  },
  slotLabel: {
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: 'bold',
    color: '#616161'
  },
  imageBox: {
    height: 80,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  placeholderBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderBottomLeftRadius: 8,
  }
});
