import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, SegmentedButtons } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../../../shared/components/Screen';
import { TFButton } from '../../../../shared/components/TFButton';
import { TFTextField } from '../../../../shared/components/TFTextField';
import { useCreateFaultReportVM } from '../viewmodels/useCreateFaultReportVM';
import { UrgencyLevel } from '../../../../data/models/enums';

// Validation schema
const createFaultReportSchema = z.object({
  title: z.string().min(1, 'faults.titleRequired'),
  description: z.string().min(10, 'faults.descriptionRequired'),
  location: z.string().min(1, 'faults.locationRequired'),
  urgency: z.nativeEnum(UrgencyLevel),
});

type CreateFaultReportFormData = z.infer<typeof createFaultReportSchema>;

/**
 * Create Fault Report Screen
 * Form for creating new fault reports
 */
export const CreateFaultReportScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { loading, error, success, submitReport, clearError, reset } = useCreateFaultReportVM();

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset: resetForm,
  } = useForm<CreateFaultReportFormData>({
    resolver: zodResolver(createFaultReportSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      urgency: UrgencyLevel.MEDIUM,
    },
  });

  useEffect(() => {
    if (success) {
      resetForm();
      reset();
      // Navigate back or show success message
      navigation.goBack();
    }
  }, [success]);

  const onSubmit = async (data: CreateFaultReportFormData) => {
    clearError();
    // TODO: Get buildingId from user profile
    await submitReport({
      ...data,
      buildingId: 'default-building',
    });
  };

  return (
    <Screen scrollable>
      <View style={styles.container}>
        <Text variant="headlineSmall" style={styles.title}>{t('faults.createTitle')}</Text>

        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, onBlur, value } }) => (
            <TFTextField
              label={t('faults.title')}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.title ? t(errors.title.message!) : undefined}
              disabled={loading}
            />
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <TFTextField
              label={t('faults.description')}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.description ? t(errors.description.message!) : undefined}
              multiline
              numberOfLines={4}
              disabled={loading}
            />
          )}
        />

        <Controller
          control={control}
          name="location"
          render={({ field: { onChange, onBlur, value } }) => (
            <TFTextField
              label={t('faults.location')}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.location ? t(errors.location.message!) : undefined}
              disabled={loading}
            />
          )}
        />

        <Controller
          control={control}
          name="urgency"
          render={({ field: { onChange, value } }) => (
            <View style={styles.urgencyContainer}>
              <Text style={styles.label}>{t('faults.urgency')}</Text>
              <SegmentedButtons
                value={value}
                onValueChange={onChange}
                buttons={[
                  { value: UrgencyLevel.LOW, label: 'Low' },
                  { value: UrgencyLevel.MEDIUM, label: 'Medium' },
                  { value: UrgencyLevel.HIGH, label: 'High' },
                  { value: UrgencyLevel.URGENT, label: 'Urgent' },
                ]}
                style={styles.segmented}
              />
            </View>
          )}
        />

        {error && (
          <Text style={styles.error}>{error}</Text>
        )}

        <View style={styles.buttonContainer}>
          <TFButton
            title={t('faults.submit')}
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            fullWidth
          />
          <TFButton
            title={t('faults.cancel')}
            onPress={() => navigation.goBack()}
            mode="outlined"
            disabled={loading}
            fullWidth
          />
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  urgencyContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  segmented: {
    marginTop: 8,
  },
  buttonContainer: {
    marginTop: 24,
    gap: 8,
  },
  error: {
    color: '#D32F2F',
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'center',
  },
});
