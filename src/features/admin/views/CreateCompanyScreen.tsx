import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../../shared/components/Screen';
import { TFButton } from '../../../shared/components/TFButton';
import { TFTextField } from '../../../shared/components/TFTextField';
import { useAdminVM } from '../viewmodels/useAdminVM';
import { haptic } from '../../../shared/utils/haptics';

const createCompanySchema = z.object({
  name: z.string().min(1, 'admin.nameRequired'),
  address: z.string().min(1, 'admin.addressRequired'),
  city: z.string().min(1, 'admin.cityRequired'),
  postalCode: z.string().min(5, 'admin.postalCodeRequired'),
});

type CreateCompanyFormData = z.infer<typeof createCompanySchema>;

/**
 * Screen for creating a new housing company
 * Admin creates shell company, then generates invite code for housing company to register
 */
export const CreateCompanyScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { createCompany, isLoading } = useAdminVM();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateCompanyFormData>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      postalCode: '',
    },
  });

  const onSubmit = async (data: CreateCompanyFormData) => {
    setSubmitError(null);
    try {
      await createCompany(data);
      haptic.success();
      
      Alert.alert(
        t('admin.success'),
        t('admin.companyCreatedSuccess'),
        [
          {
            text: t('common.ok'),
            onPress: () => {
              reset();
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error: any) {
      haptic.error();
      setSubmitError(error?.message || 'admin.createCompanyError');
    }
  };

  return (
    <Screen scrollable safeAreaEdges={['left', 'right', 'bottom']}>
      <View style={styles.container}>
        <Text variant="headlineMedium" style={styles.title}>
          {t('admin.createCompany')}
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {t('admin.createCompanySubtitle')}
        </Text>

        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <TFTextField
              label={t('admin.companyName')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.name ? t(errors.name.message!) : undefined}
              disabled={isLoading}
            />
          )}
        />

        <Controller
          control={control}
          name="address"
          render={({ field }) => (
            <TFTextField
              label={t('admin.address')}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors.address ? t(errors.address.message!) : undefined}
              disabled={isLoading}
            />
          )}
        />

        <View style={styles.row}>
          <Controller
            control={control}
            name="postalCode"
            render={({ field }) => (
              <TFTextField
                label={t('admin.postalCode')}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.postalCode ? t(errors.postalCode.message!) : undefined}
                disabled={isLoading}
                style={styles.postalCodeInput}
              />
            )}
          />

          <Controller
            control={control}
            name="city"
            render={({ field }) => (
              <TFTextField
                label={t('admin.city')}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.city ? t(errors.city.message!) : undefined}
                disabled={isLoading}
                style={styles.cityInput}
              />
            )}
          />
        </View>

        {submitError && (
          <Text variant="bodyMedium" style={styles.errorText}>
            {t(submitError)}
          </Text>
        )}

        <TFButton
          title={t('admin.createCompany')}
          onPress={handleSubmit(onSubmit)}
          loading={isLoading}
          disabled={isLoading}
          mode="contained"
          style={styles.submitButton}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
  },
  title: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subtitle: {
    marginBottom: 24,
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  postalCodeInput: {
    flex: 1,
  },
  cityInput: {
    flex: 2,
  },
  errorText: {
    color: 'red',
    marginTop: 8,
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 24,
    marginBottom: 32,
  },
});
