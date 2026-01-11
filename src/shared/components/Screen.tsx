import React from 'react';
import { StyleSheet, ViewStyle, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from 'react-native-paper';

interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
}

/**
 * Base screen component with SafeArea and consistent padding
 */
export const Screen: React.FC<ScreenProps> = ({ 
  children, 
  scrollable = false,
  style 
}) => {
  const theme = useTheme();
  
  const containerStyle = [
    styles.container,
    { backgroundColor: theme.colors.background },
    style,
  ];

  if (scrollable) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={containerStyle}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={containerStyle}>
        {children}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  scrollContent: {
    padding: 16,
  },
});
