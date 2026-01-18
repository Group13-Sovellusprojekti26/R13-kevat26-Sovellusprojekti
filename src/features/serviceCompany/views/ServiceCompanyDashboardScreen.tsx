import React, { useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Card, Surface, Divider, useTheme, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../../shared/components/Screen';
import { signOut } from '../../auth/services/auth.service';
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

  const handleLogout = () => {
    Alert.alert(
      t('common.logout'),
      '',
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.logout'), 
          style: 'destructive',
          onPress: () => signOut(),
        },
      ]
    );
  };

  if (isLoading || !profile) {
    return (
      <Screen>
        <View style={styles.container}>
          <Text>{t('common.loading')}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Surface style={[styles.logoContainer, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
              <Text style={[styles.logo, { color: theme.colors.primary }]}>🔧</Text>
            </Surface>
            <View style={styles.headerText}>
              <Text variant="headlineSmall" style={styles.title}>
                {t('serviceCompany.dashboard')}
              </Text>
              <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                {t('serviceCompany.dashboardSubtitle')}
              </Text>
            </View>
          </View>
          <IconButton
            icon="logout"
            size={24}
            onPress={handleLogout}
          />
        </View>

        <Divider style={styles.divider} />

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

        {/* Welcome Card */}
        <Surface style={styles.welcomeCard} elevation={1}>
          <Text variant="titleLarge" style={styles.welcomeTitle}>
            {t('serviceCompany.welcomeBack')}, {profile.firstName}!
          </Text>
          <Text variant="bodyMedium" style={[styles.welcomeText, { color: theme.colors.onSurfaceVariant }]}>
            {t('serviceCompany.dashboardSubtitle')}
          </Text>
        </Surface>

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
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
  },
  subtitle: {
    marginTop: 4,
  },
  divider: {
    marginBottom: 16,
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
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  welcomeText: {
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
});