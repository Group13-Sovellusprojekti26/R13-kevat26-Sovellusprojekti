import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../../shared/components/Screen';
import { TFButton } from '../../../shared/components/TFButton';
import { TFTextField } from '../../../shared/components/TFTextField';
import { validateServiceCompanyInviteCode } from '../../../data/repositories/serviceCompanyInvites.repo';
import type { AuthStackParamList } from '../../../app/navigation/AuthNavigator';
import { haptic } from '../../../shared/utils/haptics';

const inviteCodeSchema = z.object({
  inviteCode: z.string().min(6, 'auth.inviteCodeMinLength'),
});

type InviteCodeFormData = z.infer<typeof inviteCodeSchema>;

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ServiceCompanyInviteCode'>;

/**
 * Screen for entering service company invite code
 * Validates the code and navigates to registration form
 */
export const ServiceCompanyInviteCodeScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<InviteCodeFormData>({
    resolver: zodResolver(inviteCodeSchema),
    defaultValues: {
      inviteCode: '',
    },
  });

  const onSubmit = async (data: InviteCodeFormData) => {
    setLoading(true);
    setError(null);

    try {
      const serviceCompanyData = await validateServiceCompanyInviteCode(data.inviteCode.toUpperCase());
      haptic.success();
      
      // Navigate to registration with pre-filled data
      navigation.navigate('RegisterAsServiceCompany', {
        inviteCode: data.inviteCode.toUpperCase(),
        serviceCompanyData,
      });
    } catch (err: any) {
      haptic.error();
      setError(t(err?.message || 'auth.invalidInviteCode'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scrollable>
      <View style={styles.container}>
        {/* Hero Icon */}
        <View style={styles.heroSection}>
          <Surface style={[styles.iconContainer, { backgroundColor: theme.colors.tertiaryContainer }]} elevation={0}>
            <Text style={styles.icon}>🔧</Text>
          </Surface>
        </View>

        {/* Content Card */}
        <Surface style={styles.contentCard} elevation={1}>
          <Text variant="headlineMedium" style={styles.title}>
            {t('auth.enterServiceCompanyInviteCode')}
          </Text>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            {t('auth.serviceCompanyInviteCodeSubtitle')}
          </Text>

          <Controller
            control={control}
            name="inviteCode"
            render={({ field: { onChange, onBlur, value } }) => (
              <TFTextField
                label={t('auth.serviceCompanyInviteCode')}
                value={value}
                onChangeText={(text) => onChange(text.toUpperCase())}
                onBlur={onBlur}
                error={errors.inviteCode ? t(errors.inviteCode.message!) : undefined}
                autoCapitalize="characters"
                autoCorrect={false}
                disabled={loading}
                style={styles.input}
              />
            )}
          />

          {error && (
            <Surface style={[styles.errorContainer, { backgroundColor: theme.colors.errorContainer }]} elevation={0}>
              <Text style={{ color: theme.colors.onErrorContainer }}>{error}</Text>
            </Surface>
          )}

          <TFButton
            title={t('auth.validateCode')}
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
  input: {
    marginBottom: 8,
  },
  button: {
    marginTop: 16,
  },
  backButton: {
    marginTop: 8,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
});
