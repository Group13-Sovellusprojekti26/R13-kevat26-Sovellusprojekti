import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../../shared/components/Screen';
import { TFButton } from '../../../shared/components/TFButton';
import type { AuthStackParamList } from '../../../app/navigation/AuthNavigator';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'InviteTypeSelection'>;

/**
 * Screen for selecting invite code type
 * User can choose between resident, management, service company, or housing company invite
 */
export const InviteTypeSelectionScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();

  return (
    <Screen scrollable>
      <View style={styles.container}>
        {/* Hero Icon */}
        <View style={styles.heroSection}>
          <Surface style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
            <Text style={styles.icon}>🏢</Text>
          </Surface>
        </View>

        {/* Content Card */}
        <Surface style={styles.contentCard} elevation={1}>
          <Text variant="headlineMedium" style={styles.title}>
            {t('auth.selectInviteType')}
          </Text>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            {t('auth.selectInviteTypeSubtitle')}
          </Text>

          <TFButton
            title={t('auth.residentInvite')}
            onPress={() => navigation.navigate('ResidentInviteCode')}
            icon="home-account"
            mode="contained"
            fullWidth
            style={styles.button}
          />

          <TFButton
            title={t('auth.managementInvite')}
            onPress={() => navigation.navigate('ManagementInviteCode')}
            icon="briefcase-account"
            mode="contained"
            fullWidth
            style={styles.button}
          />

          <TFButton
            title={t('auth.serviceCompanyInvite')}
            onPress={() => navigation.navigate('ServiceCompanyInviteCode')}
            icon="wrench"
            mode="contained"
            fullWidth
            style={styles.button}
          />

          <TFButton
            title={t('auth.companyInvite')}
            onPress={() => navigation.navigate('InviteCode')}
            icon="office-building"
            mode="contained"
            fullWidth
            style={styles.button}
          />

          <TFButton
            title={t('common.back')}
            onPress={() => navigation.goBack()}
            mode="text"
            fullWidth
            style={styles.backButton}
          />
        </Surface>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 50,
  },
  contentCard: {
    padding: 24,
    borderRadius: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    marginBottom: 12,
  },
  backButton: {
    marginTop: 8,
  },
});
