import React, { useCallback, useState, useMemo } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Alert, Pressable, FlatList } from 'react-native';
import { Text, useTheme, Button, Checkbox, Surface, Modal, Portal, RadioButton, IconButton, Chip } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import i18n from '@/app/i18n/i18n';

import { Screen } from '@/shared/components/Screen';
import { TFButton } from '@/shared/components/TFButton';
import { TFTextField } from '@/shared/components/TFTextField';
import { useAnnouncementsVM } from '../viewmodels/useAnnouncementsVM';
import { AnnouncementType } from '@/data/models/enums';
import { haptic } from '@/shared/utils/haptics';
import { createAnnouncementStyles as styles } from '../styles/announcements.styles';
import type { HousingCompanyStackParamList } from '@/app/navigation/HousingCompanyStack';
import { MAX_ATTACHMENT_SIZE, MAX_ATTACHMENTS_PER_ANNOUNCEMENT, ALLOWED_ATTACHMENT_TYPES } from '@/shared/types/announcementAttachments.types';

const MIN_TITLE_LENGTH = 3;
const MAX_TITLE_LENGTH = 100;
const MIN_CONTENT_LENGTH = 10;
const MAX_CONTENT_LENGTH = 1000;

interface LocalAttachment {
  id: string;
  fileName: string;
  size: number;
  mimeType: string;
  base64: string;
}


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

/**
 * Screen component for creating new announcements.
 * Provides comprehensive form with validation for announcement content and display dates/times.
 * Integrates with react-hook-form and Zod for form state management and validation.
 * Uses native DateTimePicker for date and time selection with locale-aware formatting.
 * 
 * Form fields:
 * - Title: 3-100 characters with character counter
 * - Content: 10-1000 characters with character counter
 * - Type: Dropdown selector (GENERAL, MAINTENANCE, IMPORTANT, EVENT, OTHER)
 * - Start Date/Time: Optional announcement display start (date picker + time input)
 * - End Date/Time: Required announcement display end (date picker + time input)
 * - isPinned: Checkbox to pin announcement to top
 *
 * Validation:
 * - All required fields must be filled (except optional start date/time)
 * - Title length: 3-100 characters
 * - Content length: 10-1000 characters
 * - End date must be provided
 * - Shows inline error messages for validation failures
 *
 * Features:
 * - Character counters for title and content fields
 * - Localized date/time selection (Finnish/English)
 * - Modal type selector
 * - Loading state with disabled submit during creation
 * - Haptic feedback on submit
 * - Auto-refresh announcement list after successful creation
 * - Error handling with user-friendly messages
 *
 * @component CreateAnnouncementScreen
 * @returns {JSX.Element} Form screen for creating announcements
 *
 * @example
 * // Automatically renders in navigation stack
 * // Navigate: navigation.navigate('CreateAnnouncement')
 */
export const CreateAnnouncementScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<HousingCompanyStackParamList>>();
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);

  // Get current language for DateTimePicker locale
  const currentLanguage = i18n.language;
  const locale = currentLanguage === 'fi' ? 'fi' : 'en';

  const { createAnnouncement, loading, uploadAttachments } = useAnnouncementsVM();

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

  const handlePickImage = useCallback(async () => {
    if (attachments.length >= MAX_ATTACHMENTS_PER_ANNOUNCEMENT) {
      Alert.alert(
        t('announcements.attachmentLimit'),
        t('announcements.maxAttachmentsReached', { max: MAX_ATTACHMENTS_PER_ANNOUNCEMENT })
      );
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('common.error'), t('announcements.libraryPermissionDenied'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `image-${Date.now()}.jpg`;
        const mimeType = asset.mimeType || 'image/jpeg';

        if (asset.base64) {
          await handleAttachmentUpload(fileName, asset.base64, mimeType);
        }
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('announcements.imagePickFailed'));
    }
  }, [attachments.length, t]);

  const handlePickDocument = useCallback(async () => {
    if (attachments.length >= MAX_ATTACHMENTS_PER_ANNOUNCEMENT) {
      Alert.alert(
        t('announcements.attachmentLimit'),
        t('announcements.maxAttachmentsReached', { max: MAX_ATTACHMENTS_PER_ANNOUNCEMENT })
      );
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const fileName = asset.name || 'document.pdf';

        try {
          // Get file size from the size property returned by DocumentPicker
          const size = asset.size || 0;
          
          if (size > MAX_ATTACHMENT_SIZE) {
            Alert.alert(
              t('announcements.fileTooLarge'),
              t('announcements.fileSizeExceeded', { max: '10 MB' })
            );
            return;
          }

          // Fetch the file from URI and convert to base64
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          const reader = new FileReader();

          // Use a Promise to handle FileReader async operation
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const result = reader.result as string;
              // Extract base64 part from data:application/pdf;base64,... format
              const base64Data = result.split(',')[1] || result;
              resolve(base64Data);
            };
            reader.onerror = () => reject(new Error('FileReader failed'));
            reader.readAsDataURL(blob);
          });

          // Calculate size from base64
          const fileSizeFromBase64 = Math.ceil((base64.length * 3) / 4);

          if (fileSizeFromBase64 > MAX_ATTACHMENT_SIZE) {
            Alert.alert(
              t('announcements.fileTooLarge'),
              t('announcements.fileSizeExceeded', { max: '10 MB' })
            );
            return;
          }

          // Generate temporary ID for local storage
          const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          // Store attachment locally
          setAttachments((prev) => [
            ...prev,
            {
              id: tempId,
              fileName,
              size: fileSizeFromBase64,
              mimeType: 'application/pdf',
              base64,
            },
          ]);

          haptic.success();
        } catch (readError) {
          console.error('File read error:', readError);
          Alert.alert(t('common.error'), t('announcements.documentPickFailed'));
        }
      }
    } catch (error) {
      console.error('Document pick error:', error);
      Alert.alert(t('common.error'), t('announcements.documentPickFailed'));
    }
  }, [attachments.length, t]);

  const handleAttachmentUpload = useCallback(
    async (fileName: string, base64: string, mimeType: string) => {
      try {
        const size = Math.ceil((base64.length * 3) / 4);

        if (!ALLOWED_ATTACHMENT_TYPES.includes(mimeType as any)) {
          Alert.alert(
            t('announcements.invalidFileType'),
            t('announcements.onlyImagesAndPdf')
          );
          return;
        }

        if (size > MAX_ATTACHMENT_SIZE) {
          Alert.alert(
            t('announcements.fileTooLarge'),
            t('announcements.fileSizeExceeded', { max: '10 MB' })
          );
          return;
        }

        // Generate temporary ID for local storage
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Store attachment locally (base64 + metadata)
        setAttachments((prev) => [
          ...prev,
          {
            id: tempId,
            fileName,
            size,
            mimeType,
            base64,
          },
        ]);

        haptic.success();
      } catch (error) {
        haptic.error();
        Alert.alert(t('common.error'), t('announcements.attachmentSelectionFailed'));
      }
    },
    [t]
  );

  const handleRemoveAttachment = useCallback((attachmentId: string) => {
    setAttachments((prev) => prev.filter((att) => att.id !== attachmentId));
  }, []);

  const onSubmit = useCallback(
    async (data: CreateAnnouncementFormData) => {
      haptic.medium();
      try {
        // Upload attachments first
        let attachmentIds: string[] = [];
        if (attachments.length > 0) {
          try {
            attachmentIds = await uploadAttachments(attachments);
          } catch (uploadError) {
            console.error('Attachment upload error:', uploadError);
            Alert.alert(t('common.error'), t('announcements.attachmentUploadFailed'));
            haptic.error();
            return;
          }
        }

        // Create announcement with attachment IDs
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
            attachmentIds,
          });
          haptic.success();
          navigation.goBack();
        } catch (createError) {
          console.error('Announcement creation error:', createError);
          Alert.alert(t('common.error'), t('announcements.createFailed'));
          haptic.error();
        }
      } catch (error) {
        console.error('Unexpected error in onSubmit:', error);
        haptic.error();
        Alert.alert(t('common.error'), t('announcements.createFailed'));
      }
    },
    [createAnnouncement, navigation, t, attachments]
  );

  return (
    <Screen scrollable safeAreaEdges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
            <Text variant="headlineSmall" style={styles.title}>
              {t('announcements.createTitle')}
            </Text>

            {/* Title Field */}
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
              {titleValue.length}/{MAX_TITLE_LENGTH}
            </Text>

            {/* Content Field */}
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
                <>
                  <Pressable
                    onPress={() => setTypeModalVisible(true)}
                  >
                    <Surface style={[styles.field, styles.typeField]}>
                      <Text variant="bodyLarge">{t(`announcements.types.${value.toLowerCase()}`)}</Text>
                    </Surface>
                  </Pressable>

                  <Portal>
                    <Modal
                      visible={typeModalVisible}
                      onDismiss={() => setTypeModalVisible(false)}
                    >
                      <Pressable
                        style={styles.modalOverlay}
                        onPress={() => setTypeModalVisible(false)}
                      >
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
                              <RadioButton.Item 
                                label={t('announcements.types.general')} 
                                value={AnnouncementType.GENERAL}
                              />
                              <RadioButton.Item 
                                label={t('announcements.types.maintenance')} 
                                value={AnnouncementType.MAINTENANCE}
                              />
                              <RadioButton.Item 
                                label={t('announcements.types.emergency')} 
                                value={AnnouncementType.EMERGENCY}
                              />
                              <RadioButton.Item 
                                label={t('announcements.types.event')} 
                                value={AnnouncementType.EVENT}
                              />
                            </RadioButton.Group>
                          </ScrollView>
                          <Button
                            mode="text"
                            onPress={() => setTypeModalVisible(false)}
                            style={{ marginTop: 16 }}
                          >
                            {t('common.cancel')}
                          </Button>
                        </View>
                      </Pressable>
                    </Modal>
                  </Portal>
                </>
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
            <Controller
              control={control}
              name="startTime"
              render={({ field: { value } }) => (
                <Button
                  mode="outlined"
                  onPress={() => setShowStartTimePicker(true)}
                  style={styles.field}
                >
                  {value || t('announcements.selectTime')}
                </Button>
              )}
            />
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
            <Controller
              control={control}
              name="endTime"
              render={({ field: { value } }) => (
                <Button
                  mode="outlined"
                  onPress={() => setShowEndTimePicker(true)}
                  style={styles.field}
                >
                  {value || t('announcements.selectTime')}
                </Button>
              )}
            />
            {showEndTimePicker && (
              <DateTimePicker
                value={new Date(`2000-01-01T${endTime || '00:00'}`)}
                mode="time"
                display="default"
                onChange={handleEndTimeChange}
                locale={locale}
              />
            )}

            {/* Attachments Section */}
            <Text variant="labelLarge" style={styles.fieldLabel}>
              {t('announcements.attachments')} ({attachments.length}/{MAX_ATTACHMENTS_PER_ANNOUNCEMENT})
            </Text>
            <View style={{ gap: 12, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TFButton
                  title={t('announcements.addImage')}
                  onPress={handlePickImage}
                  disabled={loading || attachments.length >= MAX_ATTACHMENTS_PER_ANNOUNCEMENT}
                  mode="outlined"
                  style={{ flex: 1 }}
                  icon="image"
                />
                <TFButton
                  title={t('announcements.addPdf')}
                  onPress={handlePickDocument}
                  disabled={loading || attachments.length >= MAX_ATTACHMENTS_PER_ANNOUNCEMENT}
                  mode="outlined"
                  style={{ flex: 1 }}
                  icon="file-pdf-box"
                />
              </View>

              {attachments.length > 0 && (
                <View style={{ gap: 8 }}>
                  {attachments.map((attachment) => (
                    <View
                      key={attachment.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        backgroundColor: theme.colors.surfaceVariant,
                        borderRadius: 8,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text variant="bodySmall" numberOfLines={1}>
                          {attachment.fileName}
                        </Text>
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {(attachment.size / 1024 / 1024).toFixed(2)} MB
                        </Text>
                      </View>
                      <IconButton
                        icon="close"
                        size={20}
                        onPress={() => handleRemoveAttachment(attachment.id)}
                        disabled={loading}
                      />
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Pin Checkbox */}
            <Text variant="labelLarge" style={styles.fieldLabel}>
              {t('announcements.isPinned')}
            </Text>
            <Controller
              control={control}
              name="isPinned"
              render={({ field }) => (
                <Pressable
                  onPress={() => field.onChange(!field.value)}
                  disabled={loading}
                >
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
                    <Checkbox
                      status={field.value ? 'checked' : 'unchecked'}
                      color={field.value ? theme.colors.primary : undefined}
                      disabled={loading}
                    />
                    <Text style={styles.checkboxLabel}>{t('announcements.pin')}</Text>
                  </Surface>
                </Pressable>
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
          </KeyboardAvoidingView>
    </Screen>
  );
};
