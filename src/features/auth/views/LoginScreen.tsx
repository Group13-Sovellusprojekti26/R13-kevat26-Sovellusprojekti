import React, { useState } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { Text, Divider, Surface, useTheme } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../../shared/components/Screen';
import { TFButton } from '../../../shared/components/TFButton';
import { TFTextField } from '../../../shared/components/TFTextField';
import { useLoginVM } from '../viewmodels/useLoginVM';
import type { AuthStackParamList } from '../../../app/navigation/AuthNavigator';

// Validation schema using Zod
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'auth.emailRequired')
    .email('auth.emailInvalid'),
  password: z
    .string()
    .min(6, 'auth.passwordMinLength'),
});

type LoginFormData = z.infer<typeof loginSchema>;
type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

/**
 * Login screen with form validation
 */
export const LoginScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { loading, error, submitLogin, clearError } = useLoginVM();
  const [showInviteModal, setShowInviteModal] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    clearError();
    await submitLogin(data);
  };

  const handleInviteCode = () => {
    setShowInviteModal(true);
  };

  const handleCompanyInvite = () => {
    setShowInviteModal(false);
    navigation.navigate('InviteCode');
  };

  const handleResidentInvite = () => {
    setShowInviteModal(false);
    navigation.navigate('ResidentInviteCode');
  };

  return (
    <Screen scrollable>
      <View style={styles.container}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Surface style={[styles.logoContainer, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
            <Text variant="displaySmall" style={[styles.logo, { color: theme.colors.primary }]}>
              🏢
            </Text>
          </Surface>
          <Text variant="headlineLarge" style={styles.appName}>TaloFix</Text>
          <Text variant="bodyLarge" style={[styles.tagline, { color: theme.colors.onSurfaceVariant }]}>
            {t('auth.tagline')}
          </Text>
        </View>

        {/* Login Card */}
        <Surface style={styles.loginCard} elevation={1}>
          <Text variant="titleLarge" style={styles.cardTitle}>{t('auth.loginTitle')}</Text>

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TFTextField
                label={t('auth.email')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email ? t(errors.email.message!) : undefined}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                disabled={loading}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TFTextField
                label={t('auth.password')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password ? t(errors.password.message!) : undefined}
                secureTextEntry
                autoComplete="password"
                textContentType="password"
                disabled={loading}
              />
            )}
          />

          {error && (
            <Surface style={[styles.errorContainer, { backgroundColor: theme.colors.errorContainer }]} elevation={0}>
              <Text style={{ color: theme.colors.onErrorContainer }}>{error}</Text>
            </Surface>
          )}

          <TFButton
            title={t('auth.login')}
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            fullWidth
            style={styles.button}
          />
        </Surface>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <Divider style={styles.divider} />
          <Text variant="labelMedium" style={[styles.dividerText, { color: theme.colors.onSurfaceVariant }]}>
            {t('auth.orJoinWithCode')}
          </Text>
          <Divider style={styles.divider} />
        </View>

        {/* Invite Code Button */}
        <TFButton
          title={t('auth.joinWithInviteCode')}
          onPress={handleInviteCode}
          mode="outlined"
          icon="ticket-outline"
          fullWidth
          style={styles.inviteButton}
        />
      </View>

      {/* Invite Type Selection Modal */}
      <Modal
        visible={showInviteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalContent} elevation={5}>
            <Text variant="headlineSmall" style={styles.modalTitle}>
              {t('auth.selectInviteType')}
            </Text>
            <Text variant="bodyMedium" style={[styles.modalSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              {t('auth.selectInviteTypeSubtitle')}
            </Text>

            <TFButton
              title={t('auth.residentInvite')}
              onPress={handleResidentInvite}
              icon="home-account"
              mode="contained"
              fullWidth
              style={styles.modalButton}
            />

            <TFButton
              title={t('auth.companyInvite')}
              onPress={handleCompanyInvite}
              icon="office-building"
              mode="outlined"
              fullWidth
              style={styles.modalButton}
            />

            <TFButton
              title={t('common.cancel')}
              onPress={() => setShowInviteModal(false)}
              mode="text"
              fullWidth
              style={styles.modalButton}
            />
          </Surface>
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    fontSize: 40,
  },
  appName: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tagline: {
    textAlign: 'center',
  },
  loginCard: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
  },
  cardTitle: {
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    marginTop: 16,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
  },
  dividerText: {
    marginHorizontal: 16,
  },
  inviteButton: {
    marginBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 16,
  },
  modalTitle: {
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButton: {
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  orText: {
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.7,
  },
  error: {
    color: '#D32F2F',
    marginTop: 8,
    textAlign: 'center',
  },
});
