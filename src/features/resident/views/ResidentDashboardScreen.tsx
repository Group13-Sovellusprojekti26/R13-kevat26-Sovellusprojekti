import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, Alert, Pressable } from 'react-native';
import { Text, Surface, useTheme, Card } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Screen } from '../../../shared/components/Screen';
import { TFButton } from '../../../shared/components/TFButton';
import { useResidentVM } from '../viewmodels/useResidentVM';
import { useFaultReportListVM } from '../faultReports/viewmodels/useFaultReportListVM';

/**
 * Dashboard screen for resident users
 * Shows apartment info for the resident
 */
export const ResidentDashboardScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { profile, loadProfile, deleteAccount, isDeleting } = useResidentVM();
  const { reports, loadReports } = useFaultReportListVM();

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports])
  );

  const handleDeleteAccount = () => {
    Alert.alert(
      t('resident.dashboard.deleteAccount'),
      t('resident.dashboard.deleteAccountMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              Alert.alert(t('common.success'), t('resident.dashboard.deleteAccountSuccess'));
            } catch (error: any) {
              Alert.alert(t('common.error'), t(error?.message || 'resident.dashboard.deleteAccountError'));
            }
          },
        },
      ]
    );
  };

  return (
    <Screen scrollable safeAreaEdges={['right', 'bottom', 'left']}>
      <View style={styles.container}>
        {/* User Info Card */}
        {profile && (
          <Card style={styles.infoCard}>
            <Card.Content style={styles.infoContent}>
              <Text variant="titleMedium" style={styles.infoTitle}>
                {t('resident.dashboard.yourInfo')}
              </Text>
              <View style={styles.infoRow}>
                <Text variant="bodyLarge" style={styles.infoLabel}>{t('resident.dashboard.name')}:</Text>
                <Text variant="bodyLarge" style={styles.infoValue}>
                  {profile.firstName} {profile.lastName}
                </Text>
              </View>
              {profile.buildingId && (
                <View style={styles.infoRow}>
                  <Text variant="bodyLarge" style={styles.infoLabel}>{t('auth.building')}:</Text>
                  <Text variant="bodyLarge" style={styles.infoValue}>{profile.buildingId}</Text>
                </View>
              )}
              {profile.apartmentNumber && (
                <View style={styles.infoRow}>
                  <Text variant="bodyLarge" style={styles.infoLabel}>{t('auth.apartment')}:</Text>
                  <Text variant="bodyLarge" style={styles.infoValue}>{profile.apartmentNumber}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Text variant="bodyLarge" style={styles.infoLabel}>{t('auth.email')}:</Text>
                <Text variant="bodyLarge" style={styles.infoValue}>{profile.email}</Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <Pressable style={styles.statPressable} onPress={() => navigation.navigate('FaultReports')}>
            <Surface style={[styles.statCard, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
              <Text variant="displaySmall" style={[styles.statNumber, { color: theme.colors.primary }]}>
                {reports.length}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer }}>
                {t('resident.dashboard.faultReports')}
              </Text>
              <Text style={[styles.statHelper, { color: theme.colors.onPrimaryContainer }]}>
                {t('resident.dashboard.faultReportsHelper')}
              </Text>
            </Surface>
          </Pressable>
        </View>

        {/* Welcome Card */}
        <Surface style={styles.welcomeCard} elevation={1}>
          <Text variant="titleLarge" style={styles.welcomeTitle}>
            {profile?.firstName
              ? t('resident.dashboard.welcomeWithName', { name: profile.firstName })
              : t('resident.dashboard.welcome')}
          </Text>
          <Text variant="bodyMedium" style={[styles.welcomeText, { color: theme.colors.onSurfaceVariant }]}>
            {t('resident.dashboard.welcomeCreateMessage')}
          </Text>
          <TFButton
            title={t('resident.dashboard.createFaultReport')}
            onPress={() => navigation.navigate('CreateFaultReport')}
            fullWidth
            style={styles.welcomeButton}
          />
        </Surface>

        <TFButton
          title={t('resident.dashboard.deleteAccount')}
          onPress={handleDeleteAccount}
          mode="outlined"
          icon="delete"
          textColor={theme.colors.error}
          loading={isDeleting}
          disabled={isDeleting}
          fullWidth
          style={styles.deleteButton}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  infoCard: {
    marginBottom: 24,
    borderRadius: 16,
  },
  infoContent: {
    paddingVertical: 10,
  },
  infoTitle: {
    fontWeight: '600',
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  infoLabel: {
    fontWeight: '500',
  },
  infoValue: {
    fontWeight: 'bold',
  },
  welcomeCard: {
    padding: 18,
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
  welcomeButton: {
    marginTop: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statPressable: {
    flex: 1,
  },
  statCard: {
    flex: 1,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statHelper: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },
  deleteButton: {
    marginTop: 28,
    opacity: 0.9,
  },
});
