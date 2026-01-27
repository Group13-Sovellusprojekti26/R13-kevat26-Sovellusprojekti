import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, useTheme, SegmentedButtons, Button, Checkbox } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import i18n from '@/app/i18n/i18n';

import { Screen } from '@/shared/components/Screen';
import { TFButton } from '@/shared/components/TFButton';
import { TFTextField } from '@/shared/components/TFTextField';
import { useAnnouncementsVM } from '../viewmodels/useAnnouncementsVM';
import { AnnouncementType } from '@/data/models/enums';
import { haptic } from '@/shared/utils/haptics';
import type { HousingCompanyStackParamList } from '@/app/navigation/HousingCompanyStack';

const MIN_TITLE_LENGTH = 3;
const MAX_TITLE_LENGTH = 100;
const MIN_CONTENT_LENGTH = 10;
const MAX_CONTENT_LENGTH = 1000;

const createAnnouncementSchema = z.object({
  title: z
    .string()
    .min(1, 'announcements.titleRequired')
    .min(MIN_TITLE_LENGTH, 'announcements.titleMinLength')
    .max(MAX_TITLE_LENGTH, 'announcements.titleMaxLength'),
  content: z
    .string()
    .min(1, 'announcements.contentRequired')
    .min(MIN_CONTENT_LENGTH, 'announcements.contentMinLength')
    .max(MAX_CONTENT_LENGTH, 'announcements.contentMaxLength'),
  type: z.nativeEnum(AnnouncementType),
  isPinned: z.boolean(),
  startDate: z.instanceof(Date).optional(),
  startTime: z.string().optional(),
  endDate: z.instanceof(Date, { message: 'announcements.endDateRequired' }),
  endTime: z.string().optional(),
});

type CreateAnnouncementFormData = z.infer<typeof createAnnouncementSchema>;

export const CreateAnnouncementScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<HousingCompanyStackParamList>>();
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Get current language for DateTimePicker locale
  const currentLanguage = i18n.language;
  const locale = currentLanguage === 'fi' ? 'fi' : 'en';

  const { createAnnouncement, loading } = useAnnouncementsVM();

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CreateAnnouncementFormData>({
    resolver: zodResolver(createAnnouncementSchema),
    defaultValues: {
      title: '',
      content: '',
      type: AnnouncementType.GENERAL,
      isPinned: false,
      startDate: undefined,
      startTime: '',
      endDate: new Date(),
      endTime: '',
    },
  });

  const titleValue = watch('title');
  const contentValue = watch('content');
  const startDate = watch('startDate');
  const startTime = watch('startTime');
  const endDate = watch('endDate');
  const endTime = watch('endTime');

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setValue('startDate', selectedDate);
    }
  };

  const handleStartTimeChange = (event: any, selectedTime?: Date) => {
    setShowStartTimePicker(false);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      setValue('startTime', `${hours}:${minutes}`);
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setValue('endDate', selectedDate);
    }
  };

  const handleEndTimeChange = (event: any, selectedTime?: Date) => {
    setShowEndTimePicker(false);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      setValue('endTime', `${hours}:${minutes}`);
    }
  };

  const onSubmit = useCallback(
    async (data: CreateAnnouncementFormData) => {
      haptic.medium();
      try {
        await createAnnouncement({
          title: data.title,
          content: data.content,
          type: data.type,
          isPinned: data.isPinned,
          startDate: data.startDate || undefined,
          startTime: data.startTime,
          endDate: data.endDate,
          endTime: data.endTime,
        });
        haptic.success();
        navigation.goBack();
      } catch (error) {
        haptic.error();
        Alert.alert(t('common.error'), t('announcements.createFailed'));
      }
    },
    [createAnnouncement, navigation, t]
  );

  return (
    <Screen scrollable>
      <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text variant="headlineSmall" style={styles.title}>
              {t('announcements.createTitle')}
            </Text>

            {/* Title Field */}
            <Controller
              control={control}
              name="title"
              render={({ field: { value, onChange } }) => (
                <TFTextField
                  label={t('common.title')}
                  value={value}
                  onChangeText={onChange}
                  error={errors.title?.message ? t(errors.title.message as any) : undefined}
                  style={styles.field}
                  placeholder={t('announcements.title')}
                />
              )}
            />
            <Text variant="labelSmall" style={styles.counter}>
              {titleValue.length}/{MAX_TITLE_LENGTH}
            </Text>

            {/* Content Field */}
            <Controller
              control={control}
              name="content"
              render={({ field: { value, onChange } }) => (
                <TFTextField
                  label={t('announcements.content')}
                  value={value}
                  onChangeText={onChange}
                  error={errors.content?.message ? t(errors.content.message as any) : undefined}
                  multiline
                  numberOfLines={6}
                  style={styles.field}
                  placeholder={t('announcements.content')}
                />
              )}
            />
            <Text variant="labelSmall" style={styles.counter}>
              {contentValue.length}/{MAX_CONTENT_LENGTH}
            </Text>

            {/* Type Selection */}
            <Text variant="labelLarge" style={styles.fieldLabel}>
              {t('announcements.type')}
            </Text>
            <Controller
              control={control}
              name="type"
              render={({ field: { value, onChange } }) => (
                <SegmentedButtons
                  value={value}
                  onValueChange={(val) => onChange(val as AnnouncementType)}
                  buttons={[
                    {
                      value: AnnouncementType.GENERAL,
                      label: t('announcements.types.general'),
                    },
                    {
                      value: AnnouncementType.MAINTENANCE,
                      label: t('announcements.types.maintenance'),
                    },
                    {
                      value: AnnouncementType.EMERGENCY,
                      label: t('announcements.types.emergency'),
                    },
                    {
                      value: AnnouncementType.EVENT,
                      label: t('announcements.types.event'),
                    },
                  ]}
                  style={styles.segmentedButtons}
                />
              )}
            />

            {/* Start Date */}
            <Text variant="labelLarge" style={styles.fieldLabel}>
              {t('announcements.startDate')}
            </Text>
            <Button
              mode="outlined"
              onPress={() => {
                setShowStartDatePicker(true);
                if (!startDate) {
                  setValue('startDate', new Date());
                }
              }}
              style={styles.field}
            >
              {startDate ? startDate.toLocaleDateString() : t('announcements.selectDate')}
            </Button>
            {errors.startDate && (
              <Text style={{ color: theme.colors.error, fontSize: 12 }}>
                {t(errors.startDate.message as any)}
              </Text>
            )}
            {showStartDatePicker && (
              <DateTimePicker
                value={startDate || new Date()}
                mode="date"
                display="default"
                onChange={handleStartDateChange}
                locale={locale}
              />
            )}

            {/* Start Time (Optional) */}
            <Text variant="labelLarge" style={styles.fieldLabel}>
              {t('announcements.startTime')}
            </Text>
            <Button
              mode="outlined"
              onPress={() => setShowStartTimePicker(true)}
              style={styles.field}
            >
              {startTime || t('announcements.selectTime')}
            </Button>
            {showStartTimePicker && (
              <DateTimePicker
                value={new Date(`2000-01-01T${startTime || '00:00'}`)}
                mode="time"
                display="default"
                onChange={handleStartTimeChange}
                locale={locale}
              />
            )}

            {/* End Date */}
            <Text variant="labelLarge" style={styles.fieldLabel}>
              {t('announcements.endDate')} *
            </Text>
            <Button
              mode="outlined"
              onPress={() => setShowEndDatePicker(true)}
              style={styles.field}
            >
              {endDate.toLocaleDateString()}
            </Button>
            {errors.endDate && (
              <Text style={{ color: theme.colors.error, fontSize: 12 }}>
                {t(errors.endDate.message as any)}
              </Text>
            )}
            {showEndDatePicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display="default"
                onChange={handleEndDateChange}
                locale={locale}
              />
            )}

            {/* End Time (Optional) */}
            <Text variant="labelLarge" style={styles.fieldLabel}>
              {t('announcements.endTime')}
            </Text>
            <Button
              mode="outlined"
              onPress={() => setShowEndTimePicker(true)}
              style={styles.field}
            >
              {endTime || t('announcements.selectTime')}
            </Button>
            {showEndTimePicker && (
              <DateTimePicker
                value={new Date(`2000-01-01T${endTime || '00:00'}`)}
                mode="time"
                display="default"
                onChange={handleEndTimeChange}
                locale={locale}
              />
            )}

            {/* Pin Checkbox */}
            <Controller
              control={control}
              name="isPinned"
              render={({ field: { value, onChange } }) => (
                <View style={styles.checkboxContainer}>
                  <Checkbox
                    status={value ? 'checked' : 'unchecked'}
                    onPress={() => onChange(!value)}
                  />
                  <Text
                    variant="bodyMedium"
                    style={styles.checkboxLabel}
                    onPress={() => onChange(!value)}
                  >
                    {t('announcements.isPinned')}
                  </Text>
                </View>
              )}
            />

            {/* Submit Button */}
            <TFButton
              title={t('announcements.createAnnouncement')}
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              style={styles.submitButton}
            />

            {/* Cancel Button */}
            <TFButton
              title={t('common.cancel')}
              onPress={() => navigation.goBack()}
              mode="outlined"
              disabled={loading}
            />
          </ScrollView>
        </KeyboardAvoidingView>
    </Screen>
  );
};

// ========== STYLES ==========
const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  title: {
    marginBottom: 24,
  },
  field: {
    marginBottom: 8,
  },
  counter: {
    marginBottom: 16,
    opacity: 0.6,
  },
  fieldLabel: {
    marginBottom: 12,
    marginTop: 8,
  },
  segmentedButtons: {
    marginBottom: 24,
  },
  checkboxContainer: {
    marginBottom: 24,
    paddingVertical: 8,
  },
  checkboxLabel: {
    paddingVertical: 8,
  },
  submitButton: {
    marginBottom: 12,
  },
});
