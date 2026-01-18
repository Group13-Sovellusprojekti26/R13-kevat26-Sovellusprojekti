import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Surface, useTheme, Divider, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../../shared/components/Screen';
import { TFButton } from '../../../shared/components/TFButton';
import { signOut } from '../../auth/services/auth.service';
import { useAuthVM } from '../../auth/viewmodels/useAuthVM';
import { HousingCompanyStackParamList } from '../../../app/navigation/HousingCompanyStack';

type NavigationProp = NativeStackNavigationProp<HousingCompanyStackParamList>;

/**
 * Dashboard screen for housing company users
 * Shows company info and provides logout functionality
 */
export const HousingCompanyDashboardScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthVM();

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

  return (
    <Screen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Surface style={[styles.logoContainer, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
              <Text style={[styles.logo, { color: theme.colors.primary }]}>🏢</Text>
            </Surface>
            <View style={styles.headerText}>
              <Text variant="headlineSmall" style={styles.title}>
                {t('housingCompany.dashboard.title')}
              </Text>
              <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                {t('housingCompany.dashboard.subtitle')}
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

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <Surface style={[styles.statCard, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
            <Text variant="displaySmall" style={[styles.statNumber, { color: theme.colors.primary }]}>0</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer }}>
              {t('housingCompany.dashboard.faultReports')}
            </Text>
          </Surface>

          <Surface style={[styles.statCard, { backgroundColor: theme.colors.tertiaryContainer }]} elevation={0}>
            <Text variant="displaySmall" style={[styles.statNumber, { color: theme.colors.tertiary }]}>0</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onTertiaryContainer }}>
              {t('housingCompany.dashboard.announcements')}
            </Text>
          </Surface>
        </View>

        {/* Welcome Card */}
        <Surface style={styles.welcomeCard} elevation={1}>
          <Text variant="titleLarge" style={styles.welcomeTitle}>
            {t('housingCompany.dashboard.welcome')}
          </Text>
          <Text variant="bodyMedium" style={[styles.welcomeText, { color: theme.colors.onSurfaceVariant }]}>
            {t('housingCompany.dashboard.welcomeMessage')}
          </Text>
        </Surface>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TFButton
            title={t('housingCompany.residents.inviteResident')}
            onPress={() => navigation.navigate('CreateResidentInvite')}
            icon="account-plus"
            mode="contained"
            fullWidth
            style={styles.actionButton}
          />
          <TFButton
            title={t('housingCompany.residents.residentList')}
            onPress={() => navigation.navigate('ResidentList')}
            icon="account-group"
            mode="outlined"
            fullWidth
            style={styles.actionButton}
          />
          <TFButton
            title={t('housingCompany.dashboard.manageFaults')}
            onPress={() => {}}
            icon="wrench"
            mode="outlined"
            fullWidth
            style={styles.actionButton}
            disabled
          />
          <TFButton
            title={t('housingCompany.dashboard.manageAnnouncements')}
            onPress={() => {}}
            icon="bullhorn"
            mode="outlined"
            fullWidth
            style={styles.actionButton}
            disabled
          />
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
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
  },
  divider: {
    marginBottom: 24,
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
  actions: {
    gap: 12,
  },
  actionButton: {
  },
});
