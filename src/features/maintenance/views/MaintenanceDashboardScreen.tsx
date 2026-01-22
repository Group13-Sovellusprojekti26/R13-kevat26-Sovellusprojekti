import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface, useTheme, Card } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../../shared/components/Screen';
import { useMaintenanceVM } from '../viewmodels/useMaintenanceVM';
import { useCompanyFaultReportsVM } from '@/shared/viewmodels/useCompanyFaultReportsVM';
import { FaultReportStatus } from '@/data/models/enums';

/**
 * Dashboard screen for maintenance/property manager users
 * Shows company info and statistics
 */
export const MaintenanceDashboardScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { profile, loadProfile } = useMaintenanceVM();
  const reports = useCompanyFaultReportsVM(state => state.reports);
  const loadReports = useCompanyFaultReportsVM(state => state.loadReports);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports])
  );

  const welcomeName = profile?.companyName
    ? profile.companyName
    : [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');

  const openCount = reports.filter(report => report.status === FaultReportStatus.OPEN).length;
  const completedCount = reports.filter(
    report => report.status === FaultReportStatus.CLOSED || report.status === FaultReportStatus.CANCELLED
  ).length;

  return (
    <Screen scrollable safeAreaEdges={['right', 'bottom', 'left']}>
      <View style={styles.container}>

        {/* User Info Card */}
        {profile && (
          <Card style={styles.infoCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.infoTitle}>
                {t('maintenance.dashboard.yourInfo')}
              </Text>
              <View style={styles.infoRow}>
                <Text variant="bodyLarge" style={styles.infoLabel}>{t('maintenance.dashboard.name')}:</Text>
                <Text variant="bodyLarge" style={styles.infoValue}>
                  {profile.firstName} {profile.lastName}
                </Text>
              </View>
              {profile.companyName && (
                <View style={styles.infoRow}>
                  <Text variant="bodyLarge" style={styles.infoLabel}>{t('maintenance.dashboard.companyName')}:</Text>
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
        )}

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <Surface style={[styles.statCard, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
            <Text variant="displaySmall" style={[styles.statNumber, { color: theme.colors.primary }]}>{openCount}</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer }}>
              {t('maintenance.dashboard.openFaults')}
            </Text>
          </Surface>

          <Surface style={[styles.statCard, { backgroundColor: theme.colors.tertiaryContainer }]} elevation={0}>
            <Text variant="displaySmall" style={[styles.statNumber, { color: theme.colors.tertiary }]}>{completedCount}</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onTertiaryContainer }}>
              {t('maintenance.dashboard.completedFaults')}
            </Text>
          </Surface>
        </View>

        {/* Welcome Card */}
        <Surface style={styles.welcomeCard} elevation={1}>
          <Text variant="titleLarge" style={styles.welcomeTitle}>
            {welcomeName
              ? t('maintenance.dashboard.welcomeWithName', { name: welcomeName })
              : t('maintenance.dashboard.welcome')}
          </Text>
          <Text variant="bodyMedium" style={[styles.welcomeText, { color: theme.colors.onSurfaceVariant }]}>
            {t('maintenance.dashboard.welcomeMessage')}
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
    marginBottom: 8,
  },
  infoLabel: {
    fontWeight: '500',
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
