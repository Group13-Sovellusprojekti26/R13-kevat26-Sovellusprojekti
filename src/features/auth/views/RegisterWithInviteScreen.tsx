import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../../shared/components/Screen';
import { TFButton } from '../../../shared/components/TFButton';
import { TFTextField } from '../../../shared/components/TFTextField';
import { registerWithInviteCode } from '../../../data/repositories/housingCompanies.repo';
import type { AuthStackParamList } from '../../../app/navigation/AuthNavigator';
import { haptic } from '../../../shared/utils/haptics';

const registerSchema = z.object({
  email: z.string().email('auth.emailInvalid').min(1, 'auth.emailRequired'),
  password: z.string().min(6, 'auth.passwordMinLength'),
  confirmPassword: z.string().min(6, 'auth.passwordMinLength'),
  contactPerson: z.string().min(1, 'auth.contactPersonRequired'),
  phone: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'auth.passwordsDoNotMatch',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'RegisterWithInvite'>;
type RouteProps = RouteProp<AuthStackParamList, 'RegisterWithInvite'>;

/**
 * Registration screen for housing companies using invite code
 * Shows pre-filled company data and collects login credentials
 */
export const RegisterWithInviteScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { inviteCode, companyData } = route.params;
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      contactPerson: '',
      phone: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    setError(null);

    try {
      // Register the housing company
      await registerWithInviteCode({
        inviteCode,
        email: data.email,
        password: data.password,
        contactPerson: data.contactPerson,
        phone: data.phone,
      });

      haptic.success();

      // Show success message and navigate back to login
      Alert.alert(
        t('auth.registrationSuccess'),
        t('auth.registrationCompleteMessage'),
        [
          { 
            text: t('common.ok'),
            onPress: () => {
              // Navigate back to login screen
              navigation.navigate('Login');
            },
          },
        ]
      );
    } catch (err: any) {
      haptic.error();
      setError(t(err?.message || 'auth.registerError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scrollable>
      <View style={styles.container}>
        <Text variant="headlineMedium" style={styles.title}>
          {t('auth.registerHousingCompany')}
        </Text>

        {/* Show company info */}
        <Card style={styles.companyCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.companyName}>
              {companyData.name}
            </Text>
            <Text variant="bodyMedium" style={styles.companyAddress}>
              {companyData.address}
            </Text>
            <Text variant="bodyMedium" style={styles.companyAddress}>
              {companyData.postalCode} {companyData.city}
            </Text>
          </Card.Content>
        </Card>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('auth.loginCredentials')}
        </Text>

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
              autoComplete="new-password"
              disabled={loading}
            />
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <TFTextField
              label={t('auth.confirmPassword')}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.confirmPassword ? t(errors.confirmPassword.message!) : undefined}
              secureTextEntry
              autoComplete="new-password"
              disabled={loading}
            />
          )}
        />

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('auth.contactInfo')}
        </Text>

        <Controller
          control={control}
          name="contactPerson"
          render={({ field: { onChange, onBlur, value } }) => (
            <TFTextField
              label={t('auth.contactPerson')}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.contactPerson ? t(errors.contactPerson.message!) : undefined}
              autoCapitalize="words"
              disabled={loading}
            />
          )}
        />

        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <TFTextField
              label={t('auth.phone')}
              value={value || ''}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="phone-pad"
              disabled={loading}
            />
          )}
        />

        {error && (
          <Text style={styles.error}>{error}</Text>
        )}

        <TFButton
          title={t('auth.register')}
          onPress={handleSubmit(onSubmit)}
          loading={loading}
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
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  companyCard: {
    marginBottom: 24,
  },
  companyName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  companyAddress: {
    opacity: 0.7,
  },
  sectionTitle: {
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
  },
  button: {
    marginTop: 24,
  },
  backButton: {
    marginTop: 8,
    marginBottom: 32,
  },
  error: {
    color: '#D32F2F',
    marginTop: 8,
    textAlign: 'center',
  },
});
