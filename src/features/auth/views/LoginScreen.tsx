import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../../shared/components/Screen';
import { TFButton } from '../../../shared/components/TFButton';
import { TFTextField } from '../../../shared/components/TFTextField';
import { useLoginVM } from '../viewmodels/useLoginVM';

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

/**
 * Login screen with form validation
 */
export const LoginScreen: React.FC = () => {
  const { t } = useTranslation();
  const { loading, error, submitLogin, clearError } = useLoginVM();

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

  return (
    <Screen scrollable>
      <View style={styles.container}>
        <Text variant="headlineMedium" style={styles.title}>{t('auth.loginTitle')}</Text>

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
          <Text style={styles.error}>{error}</Text>
        )}

        <TFButton
          title={t('auth.login')}
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          fullWidth
          style={styles.button}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  button: {
    marginTop: 16,
  },
  error: {
    color: '#D32F2F',
    marginTop: 8,
    textAlign: 'center',
  },
});
