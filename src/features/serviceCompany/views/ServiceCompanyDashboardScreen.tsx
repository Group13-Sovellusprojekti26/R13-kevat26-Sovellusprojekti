import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, Surface, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../../shared/components/Screen';
import { useServiceCompanyVM } from '../viewmodels/useServiceCompanyVM';

/**
 * Main dashboard screen for service company users
 * Shows service company profile and statistics
 */
export const ServiceCompanyDashboardScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { profile, loadProfile, isLoading } = useServiceCompanyVM();

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (isLoading || !profile) {
    return (
      <Screen>
        <View style={styles.container}>
          <Text>{t('common.loading')}</Text>
        </View>
      </Screen>
    );
  }

  const welcomeName = profile.companyName
    ? profile.companyName
    : [profile.firstName, profile.lastName].filter(Boolean).join(' ');

  return (
    <Screen scrollable safeAreaEdges={['right', 'bottom', 'left']}>
      <View style={styles.container}>

        {/* User Info Card */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.infoTitle}>
              {t('serviceCompany.yourInfo')}
            </Text>
            <View style={styles.infoRow}>
              <Text variant="bodyLarge" style={styles.infoLabel}>{t('auth.name')}:</Text>
              <Text variant="bodyLarge" style={styles.infoValue}>
                {profile.firstName} {profile.lastName}
              </Text>
            </View>
            {profile.companyName && (
              <View style={styles.infoRow}>
                <Text variant="bodyLarge" style={styles.infoLabel}>{t('auth.serviceCompanyName')}:</Text>
                <Text variant="bodyLarge" style={styles.infoValue}>{profile.companyName}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text variant="bodyLarge" style={styles.infoLabel}>{t('auth.email')}:</Text>
              <Text variant="bodyLarge" style={styles.infoValue}>{profile.email}</Text>
            </View>
            {profile.phone && (
              <View style={styles.infoRow}>
                <Text variant="bodyLarge" style={styles.infoLabel}>{t('auth.phone')}:</Text>
                <Text variant="bodyLarge" style={styles.infoValue}>{profile.phone}</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <Surface style={[styles.statCard, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
            <Text variant="displaySmall" style={[styles.statNumber, { color: theme.colors.primary }]}>0</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer }}>
              {t('serviceCompany.openFaults')}
            </Text>
          </Surface>

          <Surface style={[styles.statCard, { backgroundColor: theme.colors.tertiaryContainer }]} elevation={0}>
            <Text variant="displaySmall" style={[styles.statNumber, { color: theme.colors.tertiary }]}>0</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onTertiaryContainer }}>
              {t('serviceCompany.completedFaults')}
            </Text>
          </Surface>
        </View>

        {/* Welcome Card */}
        <Surface style={styles.welcomeCard} elevation={1}>
          <Text variant="titleLarge" style={styles.welcomeTitle}>
            {welcomeName
              ? t('serviceCompany.welcomeWithName', { name: welcomeName })
              : t('serviceCompany.welcome')}
          </Text>
          <Text variant="bodyMedium" style={[styles.welcomeText, { color: theme.colors.onSurfaceVariant }]}>
            {t('serviceCompany.welcomeMessage')}
          </Text>
        </Surface>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  infoCard: {
    marginBottom: 16,
  },
  infoTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  infoLabel: {
    fontWeight: '600',
    flex: 1,
  },
  infoValue: {
    flex: 2,
    textAlign: 'right',
  },
  welcomeCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  welcomeTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  welcomeText: {
    lineHeight: 22,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
});