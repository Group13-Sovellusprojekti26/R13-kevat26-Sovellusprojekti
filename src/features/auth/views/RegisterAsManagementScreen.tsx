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
import { joinWithManagementInviteCode } from '../../../data/repositories/managementInvites.repo';
import type { AuthStackParamList } from '../../../app/navigation/AuthNavigator';
import { haptic } from '../../../shared/utils/haptics';

const registerSchema = z.object({
  email: z.string().email('auth.emailInvalid').min(1, 'auth.emailRequired'),
  password: z.string().min(6, 'auth.passwordMinLength'),
  confirmPassword: z.string().min(6, 'auth.passwordMinLength'),
  firstName: z.string().min(1, 'auth.firstNameRequired'),
  lastName: z.string().min(1, 'auth.lastNameRequired'),
  phone: z.string().optional(),
  companyName: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'auth.passwordsDoNotMatch',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'RegisterAsManagement'>;
type RouteProps = RouteProp<AuthStackParamList, 'RegisterAsManagement'>;

/**
 * Registration screen for property management using invite code
 * Shows pre-filled company data and collects personal info
 */
export const RegisterAsManagementScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { inviteCode, managementData } = route.params;
  
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
      firstName: '',
      lastName: '',
      phone: '',
      companyName: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    setError(null);

    try {
      // Register as maintenance user
      await joinWithManagementInviteCode({
        inviteCode,
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        companyName: data.companyName,
      });

      haptic.success();

      // Show success message and navigate back to login
      Alert.alert(
        t('auth.registrationSuccess'),
        t('auth.managementRegistrationComplete'),
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
          {t('auth.createManagementAccount')}
        </Text>

        {/* Show company info */}
        <Card style={styles.companyCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.companyName}>
              {managementData.housingCompanyName}
            </Text>
            <Text variant="bodyMedium" style={styles.companySubtitle}>
              {t('auth.managingThisCompany')}
            </Text>
          </Card.Content>
        </Card>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('auth.personalInfo')}
        </Text>

        <Controller
          control={control}
          name="firstName"
          render={({ field: { onChange, onBlur, value } }) => (
            <TFTextField
              label={t('auth.firstName')}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.firstName ? t(errors.firstName.message!) : undefined}
              autoCapitalize="words"
              disabled={loading}
            />
          )}
        />

        <Controller
          control={control}
          name="lastName"
          render={({ field: { onChange, onBlur, value } }) => (
            <TFTextField
              label={t('auth.lastName')}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.lastName ? t(errors.lastName.message!) : undefined}
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
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.phone ? t(errors.phone.message!) : undefined}
              keyboardType="phone-pad"
              disabled={loading}
            />
          )}
        />

        <Controller
          control={control}
          name="companyName"
          render={({ field: { onChange, onBlur, value } }) => (
            <TFTextField
              label={t('auth.managementCompanyName')}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.companyName ? t(errors.companyName.message!) : undefined}
              disabled={loading}
            />
          )}
        />

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
    flex: 1,
    padding: 24,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  companyCard: {
    marginBottom: 24,
  },
  companyName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  companySubtitle: {
    opacity: 0.7,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 16,
    marginTop: 8,
  },
  button: {
    marginTop: 24,
  },
  backButton: {
    marginTop: 8,
  },
  error: {
    color: 'red',
    marginTop: 12,
    textAlign: 'center',
  },
});
