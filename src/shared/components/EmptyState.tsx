import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TFButton } from './TFButton';

export const EmptyState = ({ onCreate }: { onCreate: () => void }) => (
  <View style={styles.container}>
    <MaterialCommunityIcons name="clipboard-text-outline" size={64} color="#bbb" />
    <Text style={styles.text}>Ei vikailmoituksia</Text>
    <TFButton title="Luo vikailmoitus" onPress={onCreate} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: 120,
    gap: 16,
  },
  text: {
    color: '#777',
  },
});
