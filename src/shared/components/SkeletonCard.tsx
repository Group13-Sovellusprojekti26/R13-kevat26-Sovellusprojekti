import React from 'react';
import { View, StyleSheet } from 'react-native';

export const SkeletonCard = () => (
  <View style={styles.card}>
    <View style={styles.title} />
    <View style={styles.line} />
    <View style={styles.lineShort} />
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f2f2f2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    height: 20,
    width: '60%',
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    marginBottom: 12,
  },
  line: {
    height: 14,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    marginBottom: 8,
  },
  lineShort: {
    height: 14,
    width: '40%',
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
  },
});
