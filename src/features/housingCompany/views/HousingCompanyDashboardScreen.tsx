import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Surface, useTheme, Card, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../../shared/components/Screen';
import { TFButton } from '../../../shared/components/TFButton';
import { useHousingCompanyVM } from '../viewmodels/useHousingCompanyVM';
import { HousingCompanyStackParamList } from '../../../app/navigation/HousingCompanyStack';
import { useCompanyFaultReportsVM } from '@/shared/viewmodels/useCompanyFaultReportsVM';
import { isClosedStatus, isOpenStatus } from '@/shared/utils/faultReportStatusActions';

type NavigationProp = NativeStackNavigationProp<HousingCompanyStackParamList>;

/**
 * Dashboard screen for housing company users
 * Shows company info and management actions
 */
export const HousingCompanyDashboardScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { 
    managementUser, 
    serviceCompanyUser, 
    housingCompanyName,
    loadManagementUser, 
    loadServiceCompanyUser,
    loadUserProfile,
    removeManagementUser: removeManagementUserAction,
    removeServiceCompanyUser: removeServiceCompanyUserAction,
  } = useHousingCompanyVM();
  const reports = useCompanyFaultReportsVM(state => state.reports);
  const loadReports = useCompanyFaultReportsVM(state => state.loadReports);

  useEffect(() => {
    loadUserProfile();
    loadManagementUser();
    loadServiceCompanyUser();
  }, [loadManagementUser, loadServiceCompanyUser, loadUserProfile]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports])
  );

  const openCount = reports.filter(report => isOpenStatus(report.status)).length;
  const completedCount = reports.filter(report => isClosedStatus(report.status)).length;

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
    <Screen scrollable safeAreaEdges={['right', 'left']}>
      <View style={styles.container}>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <Surface style={[styles.statCard, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
            <Text variant="displaySmall" style={[styles.statNumber, { color: theme.colors.primary }]}>{openCount}</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer }}>
              {t('housingCompany.dashboard.openFaults')}
            </Text>
          </Surface>

          <Surface style={[styles.statCard, { backgroundColor: theme.colors.tertiaryContainer }]} elevation={0}>
            <Text variant="displaySmall" style={[styles.statNumber, { color: theme.colors.tertiary }]}>{completedCount}</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onTertiaryContainer }}>
              {t('housingCompany.dashboard.completedFaults')}
            </Text>
          </Surface>
        </View>

        {/* Welcome Card */}
        <Surface style={styles.welcomeCard} elevation={1}>
          <Text variant="titleLarge" style={styles.welcomeTitle}>
            {housingCompanyName
              ? t('housingCompany.dashboard.welcomeWithName', { name: housingCompanyName })
              : t('housingCompany.dashboard.welcome')}
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
        </View>
        {(managementUser?.exists || serviceCompanyUser?.exists) && (
          <View style={styles.partnerSection}>
            <Text variant="titleMedium" style={styles.partnerSectionTitle}>
              {t('housingCompany.dashboard.partnersSectionTitle')}
            </Text>

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
          </View>
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  partnerSection: {
    marginTop: 24,
    gap: 12,
  },
  partnerSectionTitle: {
    fontWeight: '600',
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
