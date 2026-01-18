import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Divider, ActivityIndicator, Chip, Surface, useTheme, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../../shared/components/Screen';
import { TFButton } from '../../../shared/components/TFButton';
import { useAdminVM } from '../viewmodels/useAdminVM';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { AdminStackParamList } from '../../../app/navigation/types';
import { signOut } from '../../auth/services/auth.service';

/**
 * Admin dashboard showing all housing companies
 */
export const AdminDashboardScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<AdminStackParamList>>();
  const { companies, isLoading, loadCompanies } = useAdminVM();

  useEffect(() => {
    loadCompanies();
  }, []);

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

  if (isLoading && companies.length === 0) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Surface style={[styles.logoContainer, { backgroundColor: theme.colors.secondaryContainer }]} elevation={0}>
              <Text style={[styles.logo, { color: theme.colors.secondary }]}>⚙️</Text>
            </Surface>
            <View style={styles.headerText}>
              <Text variant="headlineSmall" style={styles.title}>
                {t('admin.dashboard.title')}
              </Text>
              <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                {t('admin.dashboard.subtitle')}
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

        {/* Create Button */}
        <TFButton
          title={t('admin.createCompany')}
          onPress={() => navigation.navigate('CreateCompany')}
          icon="plus"
          mode="contained"
          style={styles.createButton}
        />

        {/* Companies List */}
        {companies.length === 0 ? (
          <Surface style={styles.emptyState} elevation={0}>
            <Text variant="titleMedium" style={[styles.emptyTitle, { color: theme.colors.onSurfaceVariant }]}>
              📋
            </Text>
            <Text variant="bodyLarge" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              {t('admin.noCompanies')}
            </Text>
          </Surface>
        ) : (
          <View style={styles.list}>
            <Text variant="titleMedium" style={styles.listTitle}>
              {t('admin.housingCompanies')} ({companies.length})
            </Text>
            {companies.map((company) => (
              <Card
                key={company.id}
                style={styles.card}
                onPress={() => navigation.navigate('CompanyDetails', { companyId: company.id })}
                mode="elevated"
              >
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <Text variant="titleLarge" style={styles.cardTitle}>{company.name}</Text>
                    <Chip 
                      mode="flat"
                      style={[
                        styles.chip,
                        company.isRegistered 
                          ? { backgroundColor: theme.colors.tertiaryContainer } 
                          : { backgroundColor: theme.colors.surfaceVariant }
                      ]}
                      textStyle={[
                        styles.chipText,
                        { color: company.isRegistered ? theme.colors.onTertiaryContainer : theme.colors.onSurfaceVariant }
                      ]}
                      compact
                    >
                      {company.isRegistered ? '✓ ' + t('admin.registered') : t('admin.notRegistered')}
                    </Chip>
                  </View>
                  <Text variant="bodyMedium" style={[styles.address, { color: theme.colors.onSurfaceVariant }]}>
                    📍 {company.address}, {company.postalCode} {company.city}
                  </Text>
                  {company.inviteCode && !company.isRegistered && (
                    <Surface style={[styles.inviteCodeContainer, { backgroundColor: theme.colors.secondaryContainer }]} elevation={0}>
                      <Text variant="labelSmall" style={[styles.inviteLabel, { color: theme.colors.onSecondaryContainer }]}>
                        {t('admin.inviteCode')}
                      </Text>
                      <Text variant="titleLarge" style={[styles.inviteCode, { color: theme.colors.secondary }]}>
                        🎫 {company.inviteCode}
                      </Text>
                      {company.inviteCodeExpiresAt && (
                        <Text variant="bodySmall" style={[styles.expiresAt, { color: theme.colors.onSecondaryContainer }]}>
                          {t('admin.expiresAt')}: {company.inviteCodeExpiresAt.toLocaleDateString()}
                        </Text>
                      )}
                    </Surface>
                  )}
                </Card.Content>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  createButton: {
    marginBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 32,
    paddingVertical: 40,
    borderRadius: 16,
  },
  emptyTitle: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
  },
  list: {
    paddingBottom: 24,
  },
  listTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    flex: 1,
    fontWeight: '600',
  },
  chip: {
    borderRadius: 8,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  address: {
    marginBottom: 12,
  },
  inviteCodeContainer: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  inviteLabel: {
    marginBottom: 4,
    fontWeight: '600',
  },
  inviteCode: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  expiresAt: {
    opacity: 0.8,
  },
});
