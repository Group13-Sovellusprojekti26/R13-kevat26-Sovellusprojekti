import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Alert, Pressable } from 'react-native';
import { Text, useTheme, Button, Checkbox, Surface, Modal, Portal, RadioButton, IconButton } from 'react-native-paper';
import { Controller, UseFormReturn } from 'react-hook-form';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';

import { TFButton } from '@/shared/components/TFButton';
import { TFTextField } from '@/shared/components/TFTextField';
import { FormDateRangeSelector } from '@/shared/components/FormDateRangeSelector';
import { AnnouncementType } from '@/data/models/enums';
import { haptic } from '@/shared/utils/haptics';
import { MAX_ATTACHMENT_SIZE, MAX_ATTACHMENTS_PER_ANNOUNCEMENT, ALLOWED_ATTACHMENT_TYPES } from '@/shared/types/announcementAttachments.types';
import { useMediaUpload } from '@/shared/hooks/useMediaUpload';
import { editAnnouncementStyles as styles } from '../../styles/announcements.styles';
import { useAnnouncementLocale } from '../../hooks/useAnnouncementLocale';

interface LocalAttachment {
  id: string;
  fileName: string;
  size: number;
  mimeType: string;
  base64: string;
}

export interface AnnouncementFormData {
  title: string;
  content: string;
  type: AnnouncementType;
  isPinned: boolean;
  startDate?: Date;
  startTime?: string;
  endDate: Date;
  endTime?: string;
}

interface AnnouncementFormContentProps {
  form: UseFormReturn<AnnouncementFormData>;
  onSubmit: (data: AnnouncementFormData) => Promise<void>;
  loading?: boolean;
  isEdit?: boolean;
  attachments: any[];
  existingAttachments?: any[];
  onAttachmentsChange: (attachments: any[]) => void;
  onExistingAttachmentsChange?: (attachments: any[]) => void;
  onCancel?: () => void;
  onDelete?: () => void;
  submitButtonLabel?: string;
  maxTitleLength?: number;
  maxContentLength?: number;
  metadata?: {
    createdAt?: string | Date;
    updatedAt?: string | Date;
  };
}

const MAX_TITLE_LENGTH = 100;
const MAX_CONTENT_LENGTH = 1000;
const MIN_TITLE_LENGTH = 3;
const MIN_CONTENT_LENGTH = 10;

/**
 * Reusable form content component for creating and editing announcements.
 * Handles all form fields, date/time pickers, attachments, and modals.
 * Reduces code duplication between CreateAnnouncementScreen and EditAnnouncementScreen.
 */
export const AnnouncementFormContent: React.FC<AnnouncementFormContentProps> = ({
  form,
  onSubmit,
  loading = false,
  isEdit = false,
  attachments,
  existingAttachments = [],
  onAttachmentsChange,
  onExistingAttachmentsChange,
  onCancel,
  onDelete,
  submitButtonLabel,
  maxTitleLength = MAX_TITLE_LENGTH,
  maxContentLength = MAX_CONTENT_LENGTH,
  metadata,
}) => {
  const { t, ready } = useTranslation();
  const theme = useTheme();

  const [showStartDatePicker, setShowStartDatePicker] = React.useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = React.useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = React.useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = React.useState(false);
  const [typeModalVisible, setTypeModalVisible] = React.useState(false);

  // Get locale from custom hook - returns 'fi' or 'en'
  const locale = useAnnouncementLocale();

  // Initialize useMediaUpload hook with announcement constraints
  const {
    media,
    pickImage,
    pickDocument,
    removeMedia,
  } = useMediaUpload({
    maxFileSize: MAX_ATTACHMENT_SIZE,
    maxFiles: MAX_ATTACHMENTS_PER_ANNOUNCEMENT - existingAttachments.length,
    allowedTypes: [...ALLOWED_ATTACHMENT_TYPES],
  });

  // Sync media hook state with component's attachments prop
  // This ensures new attachments are available for submission
  useEffect(() => {
    if (media.length > 0) {
      onAttachmentsChange(media as any);
    }
  }, [media, onAttachmentsChange]);

  const { control, handleSubmit, formState: { errors }, watch, setValue } = form;
  const titleValue = watch('title');
  const contentValue = watch('content');
  const contentCount = contentValue?.length ?? 0;
  const startDate = watch('startDate');
  const startTime = watch('startTime');
  const endDate = watch('endDate');
  const endTime = watch('endTime');

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
      {!ready ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Loading...</Text>
        </View>
      ) : (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Title */}
        <Text variant="labelLarge" style={styles.fieldLabel}>
          {t('common.title')}
        </Text>
        <Controller
          control={control}
          name="title"
          render={({ field: { value, onChange } }) => (
            <TFTextField
              value={value}
              onChangeText={onChange}
              error={errors.title?.message ? t(errors.title.message as any) : undefined}
              style={styles.field}
              placeholder={t('announcements.title')}
            />
          )}
        />
        <Text variant="labelSmall" style={styles.counter}>
          {(titleValue?.length || 0)}/{maxTitleLength}
        </Text>

        {/* Content */}
        <Text variant="labelLarge" style={styles.fieldLabel}>
          {t('announcements.content')}
        </Text>
        <Controller
          control={control}
          name="content"
          render={({ field: { value, onChange } }) => (
            <TFTextField
              value={value}
              onChangeText={onChange}
              error={errors.content?.message ? t(errors.content.message as any) : undefined}
              multiline
              numberOfLines={8}
              style={[styles.field, styles.contentInput]}
              placeholder={t('announcements.content')}
            />
          )}
        />
        <View style={styles.contentMetaRow}>
          <Text style={[styles.contentMeta, { color: theme.colors.onSurfaceVariant }]}>
            {t('faults.descriptionMinMax', {
              min: MIN_CONTENT_LENGTH,
              max: MAX_CONTENT_LENGTH,
            })}
          </Text>
          <Text
            style={[
              styles.contentCount,
              {
                color:
                  contentCount < MIN_CONTENT_LENGTH
                    ? theme.colors.error
                    : theme.colors.onSurfaceVariant,
              },
            ]}
          >
            {contentCount}/{maxContentLength}
          </Text>
        </View>

        {/* Type Selection */}
        <Text variant="labelLarge" style={styles.fieldLabel}>
          {t('announcements.type')}
        </Text>
        <Controller
          control={control}
          name="type"
          render={({ field: { value, onChange } }) => (
            <>
              <Pressable onPress={() => setTypeModalVisible(true)}>
                <Surface style={[styles.field, styles.typeField]}>
                  <Text variant="bodyLarge">{t(`announcements.types.${value.toLowerCase()}`)}</Text>
                </Surface>
              </Pressable>

              <Portal>
                <Modal visible={typeModalVisible} onDismiss={() => setTypeModalVisible(false)}>
                  <Pressable style={styles.modalOverlay} onPress={() => setTypeModalVisible(false)}>
                    <View style={styles.modalContent}>
                      <ScrollView showsVerticalScrollIndicator={false}>
                        <Text variant="headlineSmall" style={{ marginBottom: 16 }}>
                          {t('announcements.type')}
                        </Text>
                        <RadioButton.Group
                          onValueChange={(newValue) => {
                            onChange(newValue);
                            setTypeModalVisible(false);
                          }}
                          value={value}
                        >
                          <RadioButton.Item label={t('announcements.types.general')} value={AnnouncementType.GENERAL} />
                          <RadioButton.Item label={t('announcements.types.maintenance')} value={AnnouncementType.MAINTENANCE} />
                          <RadioButton.Item label={t('announcements.types.emergency')} value={AnnouncementType.EMERGENCY} />
                          <RadioButton.Item label={t('announcements.types.event')} value={AnnouncementType.EVENT} />
                        </RadioButton.Group>
                      </ScrollView>
                      <Button mode="text" onPress={() => setTypeModalVisible(false)} style={{ marginTop: 16 }}>
                        {t('common.cancel')}
                      </Button>
                    </View>
                  </Pressable>
                </Modal>
              </Portal>
            </>
          )}
        />

        {/* Date Range Selector */}
        <FormDateRangeSelector
          label={t('announcements.displayDates')}
          startDate={startDate}
          startTime={startTime}
          endDate={endDate}
          endTime={endTime}
          onStartDateChange={(date) => setValue('startDate', date)}
          onStartTimeChange={(time) => setValue('startTime', time)}
          onEndDateChange={(date) => setValue('endDate', date)}
          onEndTimeChange={(time) => setValue('endTime', time)}
          locale={locale}
          endDateError={errors.endDate?.message ? t(errors.endDate.message as any) : undefined}
          showStartFields={true}
          showStartDatePicker={showStartDatePicker}
          onShowStartDatePickerChange={setShowStartDatePicker}
          showStartTimePicker={showStartTimePicker}
          onShowStartTimePickerChange={setShowStartTimePicker}
          showEndDatePicker={showEndDatePicker}
          onShowEndDatePickerChange={setShowEndDatePicker}
          showEndTimePicker={showEndTimePicker}
          onShowEndTimePickerChange={setShowEndTimePicker}
        />

        {/* Pin Checkbox */}
        <Text variant="labelLarge" style={styles.fieldLabel}>
          {t('announcements.isPinned')}
        </Text>
        <Controller
          control={control}
          name="isPinned"
          render={({ field }) => (
            <Pressable onPress={() => field.onChange(!field.value)} disabled={loading}>
              <Surface
                style={[
                  styles.checkboxBox,
                  {
                    borderColor: field.value ? theme.colors.primary : theme.colors.outline,
                    borderWidth: 2,
                    borderRadius: 8,
                    backgroundColor: field.value ? theme.colors.primaryContainer : theme.colors.surface,
                  },
                ]}
                elevation={0}
              >
                <Checkbox status={field.value ? 'checked' : 'unchecked'} color={field.value ? theme.colors.primary : undefined} disabled={loading} />
                <Text style={styles.checkboxLabel}>{t('announcements.pin')}</Text>
              </Surface>
            </Pressable>
          )}
        />

        {/* Metadata (Edit only) */}
        {isEdit && metadata && (
          <View style={styles.metadata}>
            {metadata.createdAt && (
              <Text variant="labelSmall" style={{ opacity: 0.6, fontSize: 11 }}>
                {t('announcements.createdAt')}: {new Date(metadata.createdAt).toLocaleDateString()}
              </Text>
            )}
            {metadata.updatedAt && (
              <Text variant="labelSmall" style={{ opacity: 0.6, fontSize: 11, marginTop: 4 }}>
                {t('announcements.updatedAt')}: {new Date(metadata.updatedAt).toLocaleDateString()}
              </Text>
            )}
          </View>
        )}

        {/* Existing Attachments */}
        {existingAttachments.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text variant="labelLarge" style={styles.fieldLabel}>
              {t('announcements.attachments')} - {existingAttachments.length}
            </Text>
            {existingAttachments.map((att) => (
              <View key={att.id} style={[styles.field, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                <Text variant="bodyMedium" numberOfLines={1} style={{ flex: 1 }}>
                  {att.fileName}
                </Text>
                <IconButton
                  icon="delete"
                  size={20}
                  iconColor={theme.colors.error}
                  onPress={() => onExistingAttachmentsChange?.(existingAttachments.filter(a => a.id !== att.id))}
                />
              </View>
            ))}
          </View>
        )}

        {/* New Attachments */}
        {media.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text variant="labelLarge" style={styles.fieldLabel}>
              {t('announcements.newAttachments')} - {media.length}
            </Text>
            {media.map((att) => (
              <View key={att.id} style={[styles.field, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                <Text variant="bodyMedium" numberOfLines={1} style={{ flex: 1 }}>
                  {att.fileName}
                </Text>
                <IconButton
                  icon="delete"
                  size={20}
                  iconColor={theme.colors.error}
                  onPress={() => removeMedia(att.id)}
                />
              </View>
            ))}
          </View>
        )}

        {/* Add Attachment Buttons */}
        <View style={{ gap: 12, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TFButton
              title={t('announcements.addImage')}
              onPress={pickImage}
              disabled={loading || media.length + existingAttachments.length >= MAX_ATTACHMENTS_PER_ANNOUNCEMENT}
              mode="outlined"
              style={{ flex: 1 }}
              icon="image"
            />
            <TFButton
              title={t('announcements.addPdf')}
              onPress={pickDocument}
              disabled={loading || media.length + existingAttachments.length >= MAX_ATTACHMENTS_PER_ANNOUNCEMENT}
              mode="outlined"
              style={{ flex: 1 }}
              icon="file-pdf-box"
            />
          </View>
        </View>

        {/* Submit Button */}
        <TFButton
          title={submitButtonLabel || t(isEdit ? 'common.save' : 'announcements.createAnnouncement')}
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          style={styles.submitButton}
        />

        {/* Delete Button (Edit only) */}
        {isEdit && onDelete && (
          <TFButton
            title={t('announcements.deleteTitle')}
            onPress={onDelete}
            mode="outlined"
            disabled={loading}
            style={[styles.deleteButton, { borderColor: theme.colors.error }]}
          />
        )}

        {/* Cancel Button */}
        <TFButton title={t('common.cancel')} onPress={onCancel} mode="outlined" disabled={loading} />
      </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
};
