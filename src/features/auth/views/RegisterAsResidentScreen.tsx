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
import { joinWithResidentInviteCode } from '../../../data/repositories/residentInvites.repo';
import type { AuthStackParamList } from '../../../app/navigation/AuthNavigator';
import { haptic } from '../../../shared/utils/haptics';

const registerSchema = z.object({
  email: z.string().email('auth.emailInvalid').min(1, 'auth.emailRequired'),
  password: z.string().min(6, 'auth.passwordMinLength'),
  confirmPassword: z.string().min(6, 'auth.passwordMinLength'),
  firstName: z.string().min(1, 'auth.firstNameRequired'),
  lastName: z.string().min(1, 'auth.lastNameRequired'),
  phone: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'auth.passwordsDoNotMatch',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'RegisterAsResident'>;
type RouteProps = RouteProp<AuthStackParamList, 'RegisterAsResident'>;

/**
 * Registration screen for residents using invite code
 * Shows pre-filled apartment data and collects resident information
 */
export const RegisterAsResidentScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { inviteCode, residentData } = route.params;
  
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
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    setError(null);

    try {
      // Register the resident with invite code
      await joinWithResidentInviteCode({
        inviteCode,
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      });

      haptic.success();

      // Show success message and navigate back to login
      Alert.alert(
        t('auth.registrationSuccess'),
        t('auth.residentRegistrationComplete'),
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
        {/* Company Info Card */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.infoTitle}>
              {t('auth.yourApartment')}
            </Text>
            <View style={styles.infoRow}>
              <Text variant="bodyLarge" style={styles.infoLabel}>{t('auth.housingCompany')}:</Text>
              <Text variant="bodyLarge" style={styles.infoValue}>{residentData.housingCompanyName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text variant="bodyLarge" style={styles.infoLabel}>{t('auth.building')}:</Text>
              <Text variant="bodyLarge" style={styles.infoValue}>{residentData.buildingId}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text variant="bodyLarge" style={styles.infoLabel}>{t('auth.apartment')}:</Text>
              <Text variant="bodyLarge" style={styles.infoValue}>{residentData.apartmentNumber}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Registration Form */}
        <Card style={styles.formCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.formTitle}>
              {t('auth.createResidentAccount')}
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
                  autoComplete="name-given"
                  textContentType="givenName"
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
                  autoComplete="name-family"
                  textContentType="familyName"
                  disabled={loading}
                />
              )}
            />

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
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <TFTextField
                  label={t('auth.phone')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.phone ? t(errors.phone.message!) : undefined}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
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
                  autoComplete="password-new"
                  textContentType="newPassword"
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
                  autoComplete="password-new"
                  textContentType="newPassword"
                  disabled={loading}
                />
              )}
            />

            {error && (
              <Card style={[styles.errorCard, { backgroundColor: '#FFEBEE' }]}>
                <Card.Content>
                  <Text style={{ color: '#C62828' }}>{error}</Text>
                </Card.Content>
              </Card>
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
          </Card.Content>
        </Card>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  infoCard: {
    marginBottom: 24,
  },
  infoTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontWeight: '500',
  },
  infoValue: {
    fontWeight: 'bold',
  },
  formCard: {
    marginBottom: 24,
  },
  formTitle: {
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorCard: {
    marginTop: 16,
    marginBottom: 8,
  },
  button: {
    marginTop: 16,
  },
  backButton: {
    marginTop: 8,
  },
});
