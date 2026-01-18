import React, { useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Surface, useTheme, Divider, IconButton, Card } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../../shared/components/Screen';
import { TFButton } from '../../../shared/components/TFButton';
import { signOut } from '../../auth/services/auth.service';
import { useAuthVM } from '../../auth/viewmodels/useAuthVM';
import { useHousingCompanyVM } from '../viewmodels/useHousingCompanyVM';
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
  const { 
    managementUser, 
    serviceCompanyUser, 
    loadManagementUser, 
    loadServiceCompanyUser,
    removeManagementUser: removeManagementUserAction,
    removeServiceCompanyUser: removeServiceCompanyUserAction,
  } = useHousingCompanyVM();

  useEffect(() => {
    loadManagementUser();
    loadServiceCompanyUser();
  }, [loadManagementUser, loadServiceCompanyUser]);

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

  const handleRemoveManagement = () => {
    Alert.alert(
      t('housingCompany.management.confirmRemove'),
      t('housingCompany.management.confirmRemoveMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.remove'), 
          style: 'destructive',
          onPress: async () => {
            try {
              await removeManagementUserAction();
              Alert.alert(t('common.success'), t('housingCompany.management.removeSuccess'));
            } catch (error: any) {
              Alert.alert(t('common.error'), error?.message || t('housingCompany.management.removeError'));
            }
          },
        },
      ]
    );
  };

  const handleRemoveServiceCompany = () => {
    Alert.alert(
      t('housingCompany.serviceCompany.confirmRemove'),
      t('housingCompany.serviceCompany.confirmRemoveMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.remove'), 
          style: 'destructive',
          onPress: async () => {
            try {
              await removeServiceCompanyUserAction();
              Alert.alert(t('common.success'), t('housingCompany.serviceCompany.removeSuccess'));
            } catch (error: any) {
              Alert.alert(t('common.error'), error?.message || t('housingCompany.serviceCompany.removeError'));
            }
          },
        },
      ]
    );
  };

  return (
    <Screen scrollable>
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

        {/* Management User Card */}
        {managementUser?.exists && managementUser.user && (
          <Card style={styles.partnerCard}>
            <Card.Content>
              <View style={styles.partnerHeader}>
                <Text variant="titleMedium" style={styles.partnerTitle}>
                  {t('housingCompany.management.current')}
                </Text>
                <IconButton
                  icon="delete"
                  size={20}
                  iconColor={theme.colors.error}
                  onPress={handleRemoveManagement}
                />
              </View>
              <Text variant="bodyLarge">{managementUser.user.firstName} {managementUser.user.lastName}</Text>
              {managementUser.user.companyName && (
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {managementUser.user.companyName}
                </Text>
              )}
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {managementUser.user.email}
              </Text>
              {managementUser.user.phone && (
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {managementUser.user.phone}
                </Text>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Service Company User Card */}
        {serviceCompanyUser?.exists && serviceCompanyUser.user && (
          <Card style={styles.partnerCard}>
            <Card.Content>
              <View style={styles.partnerHeader}>
                <Text variant="titleMedium" style={styles.partnerTitle}>
                  {t('housingCompany.serviceCompany.current')}
                </Text>
                <IconButton
                  icon="delete"
                  size={20}
                  iconColor={theme.colors.error}
                  onPress={handleRemoveServiceCompany}
                />
              </View>
              <Text variant="bodyLarge">{serviceCompanyUser.user.firstName} {serviceCompanyUser.user.lastName}</Text>
              {serviceCompanyUser.user.companyName && (
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {serviceCompanyUser.user.companyName}
                </Text>
              )}
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {serviceCompanyUser.user.email}
              </Text>
              {serviceCompanyUser.user.phone && (
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {serviceCompanyUser.user.phone}
                </Text>
              )}
            </Card.Content>
          </Card>
        )}

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
          {!managementUser?.exists && (
            <TFButton
              title={t('housingCompany.management.inviteManager')}
              onPress={() => navigation.navigate('CreateManagementInvite')}
              icon="briefcase-plus"
              mode="outlined"
              fullWidth
              style={styles.actionButton}
            />
          )}
          {!serviceCompanyUser?.exists && (
            <TFButton
              title={t('housingCompany.serviceCompany.inviteServiceCompany')}
              onPress={() => navigation.navigate('CreateServiceCompanyInvite')}
              icon="tools"
              mode="outlined"
              fullWidth
              style={styles.actionButton}
            />
          )}
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
  partnerCard: {
    marginBottom: 16,
  },
  partnerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  partnerTitle: {
    fontWeight: '600',
  },
});
