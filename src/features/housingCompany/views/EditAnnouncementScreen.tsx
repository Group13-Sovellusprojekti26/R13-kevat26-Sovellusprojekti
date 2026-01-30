import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Pressable, FlatList } from 'react-native';
import { Text, useTheme, Button, Checkbox, Surface, Modal, Portal, RadioButton, IconButton, Chip } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import i18n from '@/app/i18n/i18n';

import { Screen } from '@/shared/components/Screen';
import { TFButton } from '@/shared/components/TFButton';
import { TFTextField } from '@/shared/components/TFTextField';
import { useAnnouncementsVM } from '../viewmodels/useAnnouncementsVM';
import { Announcement } from '@/data/models/Announcement';
import { AnnouncementType } from '@/data/models/enums';
import { getAnnouncementById, deleteAnnouncementAttachmentFile } from '@/data/repositories/announcements.repo';
import { haptic } from '@/shared/utils/haptics';
import { editAnnouncementStyles as styles } from '../styles/announcements.styles';
import type { HousingCompanyStackParamList } from '@/app/navigation/HousingCompanyStack';
import { MAX_ATTACHMENT_SIZE, MAX_ATTACHMENTS_PER_ANNOUNCEMENT, ALLOWED_ATTACHMENT_TYPES } from '@/shared/types/announcementAttachments.types';

interface LocalAttachment {
  id: string;
  fileName: string;
  size: number;
  mimeType: string;
  base64: string;
}

const MAX_TITLE_LENGTH = 100;
const MAX_CONTENT_LENGTH = 1000;

const editAnnouncementSchema = z.object({
  title: z
    .string()
    .min(1, 'announcements.titleRequired')
    .max(MAX_TITLE_LENGTH, 'announcements.titleMaxLength'),
  content: z
    .string()
    .min(1, 'announcements.contentRequired')
    .max(MAX_CONTENT_LENGTH, 'announcements.contentMaxLength'),
  type: z.nativeEnum(AnnouncementType),
  isPinned: z.boolean(),
  startDate: z.instanceof(Date).optional(),
  startTime: z.string().optional(),
  endDate: z.instanceof(Date, { message: 'announcements.endDateRequired' }),
  endTime: z.string().optional(),
});

type EditAnnouncementFormData = z.infer<typeof editAnnouncementSchema>;

type EditAnnouncementRoute = RouteProp<HousingCompanyStackParamList, 'EditAnnouncement'>;

/**
 * Screen component for editing existing announcements.
 * Loads announcement data and populates form with current values.
 * Allows modifying title, content, type, dates, times, and pinned status.
 * Provides delete functionality with confirmation dialog.
 * 
 * Responsibilities:
 * - Fetch announcement by ID from route params
 * - Display loading state while fetching
 * - Populate form with current announcement data
 * - Validate changes before submission
 * - Show error/success feedback
 * - Handle delete with confirmation alert
 * - Auto-refresh list after update
 *
 * Form fields (same as create):
 * - Title: 1-100 characters
 * - Content: 1-1000 characters
 * - Type: Dropdown selector
 * - Start Date/Time: Optional
 * - End Date/Time: Required
 * - isPinned: Checkbox
 *
 * Features:
 * - Loading spinner while fetching announcement
 * - Delete button with confirmation alert
 * - Disabled submit during save operation
 * - Error state display
 * - Auto-focus on first error field
 * - Localized date/time pickers
 * - Haptic feedback on interactions
 *
 * @component EditAnnouncementScreen
 * @returns {JSX.Element} Form screen for editing announcements
 *
 * @example
 * // Navigate with announcement ID
 * navigation.navigate('EditAnnouncement', { announcementId: 'ann_123' })
 */
export const EditAnnouncementScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<HousingCompanyStackParamList>>();
  const route = useRoute<EditAnnouncementRoute>();

  const { announcementId } = route.params;

  const { updateAnnouncement, deleteAnnouncement, loading, error, clearError, uploadAttachments, updateAttachments, getRemoveAttachmentIds } = useAnnouncementsVM();

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loadingAnnouncement, setLoadingAnnouncement] = useState(true);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);

  // Get current language for DateTimePicker locale
  const currentLanguage = i18n.language;
  const locale = currentLanguage === 'fi' ? 'fi' : 'en';

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue,
  } = useForm<EditAnnouncementFormData>({
    resolver: zodResolver(editAnnouncementSchema),
  });

  const titleValue = watch('title');
  const contentValue = watch('content');
  const startDate = watch('startDate');
  const startTime = watch('startTime');
  const endDate = watch('endDate');
  const endTime = watch('endTime');

  // Load announcement data
  useEffect(() => {
    const loadAnnouncement = async () => {
      try {
        const data = await getAnnouncementById(announcementId);
        if (data) {
          setAnnouncement(data);
          setExistingAttachments(data.attachments || []);
          reset({
            title: data.title,
            content: data.content,
            type: data.type,
            isPinned: data.isPinned,
            startDate: data.startDate,
            startTime: data.startTime,
            endDate: data.endDate,
            endTime: data.endTime,
          });
        } else {
          Alert.alert(t('common.error'), t('announcements.fetchFailed'));
          navigation.goBack();
        }
      } catch (err) {
        Alert.alert(t('common.error'), t('announcements.fetchFailed'));
        navigation.goBack();
      } finally {
        setLoadingAnnouncement(false);
      }
    };

    loadAnnouncement();
  }, [announcementId, reset, navigation, t]);

  // Handle concurrent deletion error
  useEffect(() => {
    if (error === 'announcements.deletedByOther') {
      Alert.alert(
        t('announcements.deleteTitle'),
        t('announcements.deletedByOther'),
        [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
      );
    }
  }, [error, t, navigation]);

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
    async (data: EditAnnouncementFormData) => {
      haptic.medium();
      try {
        // Upload new attachments
        const newAttachmentIds = await uploadAttachments(attachments);

        // Step 1: Update basic announcement fields
        await updateAnnouncement(announcementId, {
          title: data.title,
          content: data.content,
          type: data.type,
          isPinned: data.isPinned,
          startDate: data.startDate,
          startTime: data.startTime,
          endDate: data.endDate,
          endTime: data.endTime,
        });

        // Step 2: Update attachments if changed
        const remainingAttachmentIds = existingAttachments.map(att => att.id);
        const allAttachmentIds = [...remainingAttachmentIds, ...newAttachmentIds];
        const originalAttachmentIds = announcement?.attachments?.map(att => att.id) || [];
        const removedAttachmentIds = getRemoveAttachmentIds(
          announcement?.attachments || [],
          existingAttachments
        );

        if (newAttachmentIds.length > 0 || removedAttachmentIds.length > 0) {
          await updateAttachments(announcementId, allAttachmentIds, removedAttachmentIds);
        }

        haptic.success();
        navigation.goBack();
      } catch (err: any) {
        haptic.error();
        if (err?.code !== 'functions/not-found') {
          Alert.alert(t('common.error'), t('announcements.updateFailed'));
        }
      }
    },
    [updateAnnouncement, announcementId, navigation, t, attachments, existingAttachments, announcement]
  );

  const handleRemoveExistingAttachment = useCallback((attachmentId: string) => {
    setExistingAttachments(prev => prev.filter(att => att.id !== attachmentId));
  }, []);

  const handleRemoveLocalAttachment = useCallback((attachmentId: string) => {
    setAttachments(prev => prev.filter(att => att.id !== attachmentId));
  }, []);

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

  const handlePickImage = useCallback(async () => {
    if ((attachments.length + existingAttachments.length) >= MAX_ATTACHMENTS_PER_ANNOUNCEMENT) {
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
  }, [attachments.length, existingAttachments.length, t, handleAttachmentUpload]);

  const handlePickDocument = useCallback(async () => {
    if ((attachments.length + existingAttachments.length) >= MAX_ATTACHMENTS_PER_ANNOUNCEMENT) {
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

          await handleAttachmentUpload(fileName, base64, 'application/pdf');
        } catch (error) {
          console.error('Document processing error:', error);
          Alert.alert(t('common.error'), t('announcements.documentPickFailed'));
        }
      }
    } catch (error) {
      console.error('Document pick error:', error);
      Alert.alert(t('common.error'), t('announcements.documentPickFailed'));
    }
  }, [attachments.length, existingAttachments.length, t, handleAttachmentUpload]);

  const handleDeletePress = () => {
    Alert.alert(
      t('announcements.deleteTitle'),
      t('announcements.deleteConfirm'),
      [
        { text: t('common.cancel'), onPress: () => {}, style: 'cancel' },
        {
          text: t('common.delete'),
          onPress: async () => {
            haptic.medium();
            try {
              await deleteAnnouncement(announcementId);
              haptic.success();
              navigation.goBack();
            } catch (err) {
              haptic.error();
              // Error is handled in ViewModel
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  if (loadingAnnouncement) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <ActivityIndicator animating size="large" />
        </View>
      </Screen>
    );
  }

  if (!announcement) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <Text variant="bodyMedium">{t('announcements.fetchFailed')}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable safeAreaEdges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text variant="headlineSmall" style={styles.title}>
            {t('announcements.editTitle')}
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
              />
            )}
          />
          <Text variant="labelSmall" style={styles.counter}>
            {titleValue?.length || 0}/{MAX_TITLE_LENGTH}
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
              />
            )}
          />
          <Text variant="labelSmall" style={styles.counter}>
            {contentValue?.length || 0}/{MAX_CONTENT_LENGTH}
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
                    transparent
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

          {/* Pin Checkbox */}
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
                  <Text style={styles.checkboxLabel}>{t('announcements.isPinned')}</Text>
                </Surface>
              </Pressable>
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

          {/* Metadata */}
          <View style={styles.metadata}>
            <Text variant="labelSmall" style={{ opacity: 0.6, fontSize: 11 }}>
              {t('announcements.createdAt')}: {new Date(announcement.createdAt).toLocaleDateString()}
            </Text>
            <Text variant="labelSmall" style={{ opacity: 0.6, fontSize: 11, marginTop: 4 }}>
              {t('announcements.updatedAt')}: {new Date(announcement.updatedAt).toLocaleDateString()}
            </Text>
          </View>

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
                    onPress={() => handleRemoveExistingAttachment(att.id)}
                  />
                </View>
              ))}
            </View>
          )}

          {/* New Attachments */}
          {attachments.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <Text variant="labelLarge" style={styles.fieldLabel}>
                {t('announcements.newAttachments')} - {attachments.length}
              </Text>
              {attachments.map((att) => (
                <View key={att.id} style={[styles.field, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                  <Text variant="bodyMedium" numberOfLines={1} style={{ flex: 1 }}>
                    {att.fileName}
                  </Text>
                  <IconButton
                    icon="delete"
                    size={20}
                    iconColor={theme.colors.error}
                    onPress={() => handleRemoveLocalAttachment(att.id)}
                  />
                </View>
              ))}
            </View>
          )}

          {/* Add Attachment Buttons */}
          <View style={{ gap: 12 }}>
            <TFButton
              title={t('announcements.addImage')}
              onPress={handlePickImage}
              mode="outlined"
              icon="image-plus"
              style={styles.field}
            />
            <TFButton
              title={t('announcements.addAttachment')}
              onPress={handlePickDocument}
              mode="outlined"
              icon="plus"
              style={styles.field}
            />
          </View>

          {/* Save Button */}
          <TFButton
            title={t('common.save')}
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            style={styles.submitButton}
          />

          {/* Delete Button */}
          <TFButton
            title={t('announcements.deleteTitle')}
            onPress={handleDeletePress}
            mode="outlined"
            disabled={loading}
            style={[styles.deleteButton, { borderColor: theme.colors.error }]}
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
