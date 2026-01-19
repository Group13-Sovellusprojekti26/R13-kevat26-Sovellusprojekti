import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, useTheme, Surface } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen } from '../../../shared/components/Screen';
import { useSettingsVM } from '../viewmodels/useSettingsVM';
import type { ThemeMode, LanguageCode } from '../types/settings.types';

/**
 * Settings Screen
 * Allows users to change app theme and language
 * Settings are persisted to AsyncStorage
 */
export const SettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { theme: currentTheme, language, setTheme, setLanguage } = useSettingsVM();

  const handleThemeChange = async (value: ThemeMode) => {
    try {
      await setTheme(value);
    } catch (error) {
      console.error('Failed to change theme:', error);
    }
  };

  const handleLanguageChange = async (value: LanguageCode) => {
    try {
      await setLanguage(value);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Theme Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons 
              name="theme-light-dark" 
              size={24} 
              color={theme.colors.primary}
              style={styles.sectionIcon}
            />
            <View style={styles.sectionHeaderText}>
              <Text variant="titleLarge" style={styles.sectionTitle}>
                {t('settings.theme.title')}
              </Text>
              <Text
                variant="bodyMedium"
                style={[styles.sectionDescription, { color: theme.colors.onSurfaceVariant }]}
              >
                {t('settings.theme.description')}
              </Text>
            </View>
          </View>

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              onPress={() => handleThemeChange('light')}
              activeOpacity={0.7}
            >
              <Surface 
                style={[
                  styles.optionCard,
                  { backgroundColor: theme.colors.surface },
                  currentTheme === 'light' && {
                    borderColor: theme.colors.primary,
                    borderWidth: 2,
                  }
                ]} 
                elevation={currentTheme === 'light' ? 2 : 1}
              >
                <View style={styles.optionContent}>
                  <View style={[
                    styles.iconContainer,
                    { backgroundColor: theme.colors.primaryContainer }
                  ]}>
                    <MaterialCommunityIcons 
                      name="white-balance-sunny" 
                      size={28} 
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={styles.optionText}>
                    <Text variant="titleMedium" style={styles.optionTitle}>
                      {t('settings.theme.light')}
                    </Text>
                  </View>
                  {currentTheme === 'light' && (
                    <MaterialCommunityIcons 
                      name="check-circle" 
                      size={24} 
                      color={theme.colors.primary}
                    />
                  )}
                </View>
              </Surface>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleThemeChange('dark')}
              activeOpacity={0.7}
            >
              <Surface 
                style={[
                  styles.optionCard,
                  { backgroundColor: theme.colors.surface },
                  currentTheme === 'dark' && {
                    borderColor: theme.colors.primary,
                    borderWidth: 2,
                  }
                ]} 
                elevation={currentTheme === 'dark' ? 2 : 1}
              >
                <View style={styles.optionContent}>
                  <View style={[
                    styles.iconContainer,
                    { backgroundColor: theme.colors.primaryContainer }
                  ]}>
                    <MaterialCommunityIcons 
                      name="moon-waning-crescent" 
                      size={28} 
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={styles.optionText}>
                    <Text variant="titleMedium" style={styles.optionTitle}>
                      {t('settings.theme.dark')}
                    </Text>
                  </View>
                  {currentTheme === 'dark' && (
                    <MaterialCommunityIcons 
                      name="check-circle" 
                      size={24} 
                      color={theme.colors.primary}
                    />
                  )}
                </View>
              </Surface>
            </TouchableOpacity>
          </View>
        </View>

        {/* Language Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons 
              name="translate" 
              size={24} 
              color={theme.colors.primary}
              style={styles.sectionIcon}
            />
            <View style={styles.sectionHeaderText}>
              <Text variant="titleLarge" style={styles.sectionTitle}>
                {t('settings.language.title')}
              </Text>
              <Text
                variant="bodyMedium"
                style={[styles.sectionDescription, { color: theme.colors.onSurfaceVariant }]}
              >
                {t('settings.language.description')}
              </Text>
            </View>
          </View>

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              onPress={() => handleLanguageChange('fi')}
              activeOpacity={0.7}
            >
              <Surface 
                style={[
                  styles.optionCard,
                  { backgroundColor: theme.colors.surface },
                  language === 'fi' && {
                    borderColor: theme.colors.primary,
                    borderWidth: 2,
                  }
                ]} 
                elevation={language === 'fi' ? 2 : 1}
              >
                <View style={styles.optionContent}>
                  <View style={[
                    styles.iconContainer,
                    { backgroundColor: theme.colors.primaryContainer }
                  ]}>
                    <Text style={[styles.flagEmoji, { color: theme.colors.primary }]}>🇫🇮</Text>
                  </View>
                  <View style={styles.optionText}>
                    <Text variant="titleMedium" style={styles.optionTitle}>
                      {t('settings.language.finnish')}
                    </Text>
                  </View>
                  {language === 'fi' && (
                    <MaterialCommunityIcons 
                      name="check-circle" 
                      size={24} 
                      color={theme.colors.primary}
                    />
                  )}
                </View>
              </Surface>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleLanguageChange('en')}
              activeOpacity={0.7}
            >
              <Surface 
                style={[
                  styles.optionCard,
                  { backgroundColor: theme.colors.surface },
                  language === 'en' && {
                    borderColor: theme.colors.primary,
                    borderWidth: 2,
                  }
                ]} 
                elevation={language === 'en' ? 2 : 1}
              >
                <View style={styles.optionContent}>
                  <View style={[
                    styles.iconContainer,
                    { backgroundColor: theme.colors.primaryContainer }
                  ]}>
                    <Text style={[styles.flagEmoji, { color: theme.colors.primary }]}>🇬🇧</Text>
                  </View>
                  <View style={styles.optionText}>
                    <Text variant="titleMedium" style={styles.optionTitle}>
                      {t('settings.language.english')}
                    </Text>
                  </View>
                  {language === 'en' && (
                    <MaterialCommunityIcons 
                      name="check-circle" 
                      size={24} 
                      color={theme.colors.primary}
                    />
                  )}
                </View>
              </Surface>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sectionIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionDescription: {
    lineHeight: 20,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontWeight: '600',
  },
  flagEmoji: {
    fontSize: 24,
  },
});
