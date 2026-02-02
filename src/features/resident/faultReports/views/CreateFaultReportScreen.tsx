import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, Pressable, Alert } from 'react-native';
import { Checkbox, Text, SegmentedButtons, useTheme, Surface } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { Screen } from '../../../../shared/components/Screen';
import { TFButton } from '../../../../shared/components/TFButton';
import { TFTextField } from '../../../../shared/components/TFTextField';
import { useCreateFaultReportVM } from '../viewmodels/useCreateFaultReportVM';
import { FaultReportStatus, UrgencyLevel, UserRole } from '../../../../data/models/enums';
import { haptic } from '../../../../shared/utils/haptics';
import { useMediaUpload } from '../../../../shared/hooks/useMediaUpload';
import type { ResidentTabsParamList } from '../../../../app/navigation/ResidentTabs';

// ---------------- VALIDATION ----------------

const MIN_DESCRIPTION_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 100;

const createFaultReportSchema = z.object({
  title: z.string().min(1, 'faults.titleRequired'),
  description: z
    .string()
    .min(MIN_DESCRIPTION_LENGTH, 'faults.descriptionMinLength')
    .max(MAX_DESCRIPTION_LENGTH, 'faults.descriptionMaxLength'),
  location: z.string().min(1, 'faults.locationRequired'),
  urgency: z.nativeEnum(UrgencyLevel),
  allowMasterKeyAccess: z.boolean().optional(),
  hasPets: z.boolean().optional(),
});

type CreateFaultReportFormData = z.infer<typeof createFaultReportSchema>;

// ---------------- COMPONENT ----------------

export const CreateFaultReportScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<BottomTabNavigationProp<ResidentTabsParamList, 'CreateFaultReport'>>();
  const route = useRoute<RouteProp<ResidentTabsParamList, 'CreateFaultReport'>>();
  const {
    loading,
    error,
    success,
    submitReport,
    clearError,
    reset,
    loadReport,
    updateReport,
    closeReport,
    report,
    userRole,
    loadUserRole,
  } = useCreateFaultReportVM();

  const faultReportId = route.params?.faultReportId;
  const isEditMode = useMemo(() => Boolean(faultReportId), [faultReportId]);
  const isResident = userRole === UserRole.RESIDENT;
  const isEditable =
    isResident &&
    (!isEditMode ||
      report?.status === FaultReportStatus.OPEN ||
      report?.status === FaultReportStatus.CREATED);

  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const dedupeUrls = (urls: string[]) => Array.from(new Set(urls));
  const mergedExistingImageUrls = useMemo(
    () => dedupeUrls([...(report?.imageUrls ?? []), ...existingImageUrls]),
    [existingImageUrls, report?.imageUrls]
  );

  // Initialize media upload hook - supports images only for fault reports
  const { media, pickImage, removeMedia } = useMediaUpload({
    maxFileSize: 5 * 1024 * 1024, // 5 MB per image
    maxFiles: 10,
    allowedTypes: ['image/jpeg', 'image/png', 'image/heic', 'image/heif'],
    imageQuality: 0.8,
  });

  const removeImage = (id: string) => {
    Alert.alert(
      t('faults.deleteImage'),
      t('faults.deleteImageConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            haptic.light();
            removeMedia(id);
          },
        },
      ]
    );
  };


  const {
    control,
    handleSubmit,
    formState: { errors },
    reset: resetForm,
    watch,
  } = useForm<CreateFaultReportFormData>({
    resolver: zodResolver(createFaultReportSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      urgency: UrgencyLevel.MEDIUM,
      allowMasterKeyAccess: false,
      hasPets: false,
    },
  });

  useEffect(() => {
    if (faultReportId) {
      loadReport(faultReportId);
    }
  }, [faultReportId, loadReport]);

  useEffect(() => {
    loadUserRole();
  }, [loadUserRole]);

  useFocusEffect(
    useCallback(() => {
      // In edit mode, register cleanup to clear state when leaving
      if (faultReportId) {
        return () => {
          // Cleanup when leaving edit mode - clear params so new report can be created
          navigation.setParams({ faultReportId: undefined });
          reset();
        };
      }

      // Clear form and ViewModel for new reports
      resetForm({
        title: '',
        description: '',
        location: '',
        urgency: UrgencyLevel.MEDIUM,
        allowMasterKeyAccess: false,
        hasPets: false,
      });
      setExistingImageUrls([]);
      reset();
      return undefined;
    }, [faultReportId, resetForm, reset, navigation])
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      navigation.setParams({});
      resetForm({
        title: '',
        description: '',
        location: '',
        urgency: UrgencyLevel.MEDIUM,
        allowMasterKeyAccess: false,
        hasPets: false,
      });
      setExistingImageUrls([]);
      clearError();
      reset();
    });

    return unsubscribe;
  }, [clearError, navigation, reset, resetForm]);

  useEffect(() => {
    if (report && isEditMode) {
      resetForm({
        title: report.title,
        description: report.description,
        location: report.location,
        urgency: report.urgency,
        allowMasterKeyAccess: report.allowMasterKeyAccess ?? false,
        hasPets: report.hasPets ?? false,
      });
      setExistingImageUrls(dedupeUrls(report.imageUrls ?? []));
    }
  }, [report, resetForm, isEditMode]);

  useEffect(() => {
    if (!isEditMode) {
      setExistingImageUrls([]);
    }
  }, [isEditMode]);

  useEffect(() => {
    if (success && !isEditMode) {
      const handleAfterSave = () => {
        if (route.params?.faultReportId) {
          navigation.setParams({ faultReportId: undefined });
        }
        if (navigation.canGoBack()) {
          navigation.goBack();
          return;
        }
        navigation.navigate('FaultReports');
      };

      Alert.alert(t('faults.createSuccess'), t('faults.createSuccess'), [
        {
          text: t('common.ok'),
          onPress: handleAfterSave,
        },
      ]);
      resetForm();
      reset();
    }
  }, [isEditMode, navigation, reset, resetForm, route.params, success, t]);

  const descriptionValue = watch('description');
  const descriptionCount = descriptionValue?.length ?? 0;



  // -------- HELPER: Convert media files to data URLs --------
  const mediaToDataUrls = (mediaFiles: typeof media): string[] => {
    return mediaFiles.map(file => {
      // Detect MIME type and format accordingly
      const mimeType = file.mimeType || 'image/jpeg';
      return `data:${mimeType};base64,${file.base64}`;
    });
  };

  // -------- SUBMIT --------

  const onSubmit = async (data: CreateFaultReportFormData) => {
    if (loading) {
      return;
    }
    clearError();

    if (isEditMode && faultReportId) {
      try {
        const imageUrisFromMedia = mediaToDataUrls(media);
        const uniqueImageUris = dedupeUrls(imageUrisFromMedia);
        const uniqueExistingUrls = dedupeUrls(mergedExistingImageUrls);
        const descriptionToSend = report && data.description.trim() === report.description.trim()
          ? undefined
          : data.description;
        const imageUrisToSend = uniqueImageUris.length > 0 ? uniqueImageUris : undefined;
        const existingUrlsToSend = uniqueExistingUrls;
        const ok = await updateReport({
          id: faultReportId,
          description: descriptionToSend,
          imageUris: imageUrisToSend,
          existingImageUrls: existingUrlsToSend,
          allowMasterKeyAccess: data.allowMasterKeyAccess,
          hasPets: data.hasPets,
        });
        if (ok) {
          Alert.alert(t('faults.updateSuccess'), t('faultReport.updateSuccess'), [
            {
              text: t('common.ok'),
              onPress: () => {
                navigation.navigate('FaultReports');
              },
            },
          ]);
        }
      } catch (updateError) {
        Alert.alert(t('common.error'), t('faults.updateError'));
      }
      return;
    }

    await submitReport({
      ...data,
      imageUris: dedupeUrls(mediaToDataUrls(media)),
    });
  };

  const handleClose = async () => {
    if (!faultReportId) {
      return;
    }

    Alert.alert(
      t('faults.closeTitle'),
      t('faults.closeConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('faults.closeAction'),
          style: 'destructive',
          onPress: async () => {
            clearError();
            const ok = await closeReport(faultReportId);
            if (ok) {
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  // ---------------- UI ----------------

  return (
    <Screen scrollable safeAreaEdges={['left', 'right', 'bottom']}>
      <View style={styles.container}>
        <Text variant="headlineSmall" style={styles.title}>
          {isEditMode ? t('faults.editTitle') : t('faults.createTitle')}
        </Text>

        <View style={styles.formSection}>
          <Controller
            control={control}
            name="title"
            render={({ field }) => (
              <TFTextField
                label={t('faults.title')}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.title ? t(errors.title.message!) : undefined}
                disabled={loading || isEditMode || !isEditable}
              />
            )}
          />

          <Controller
            control={control}
            name="description"
            render={({ field }) => (
              <TFTextField
                label={t('faults.description')}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                multiline
                numberOfLines={5}
                style={styles.descriptionInput}
                error={errors.description ? t(errors.description.message!) : undefined}
                disabled={loading || !isEditable}
              />
            )}
          />
          <View style={styles.descriptionMetaRow}>
            <Text style={[styles.descriptionMeta, { color: theme.colors.onSurfaceVariant }]}
            >
              {t('faults.descriptionMinMax', {
                min: MIN_DESCRIPTION_LENGTH,
                max: MAX_DESCRIPTION_LENGTH,
              })}
            </Text>
            <Text
              style={[
                styles.descriptionCount,
                {
                  color:
                    descriptionCount < MIN_DESCRIPTION_LENGTH
                      ? theme.colors.error
                      : theme.colors.onSurfaceVariant,
                },
              ]}
            >
              {t('faults.descriptionCount', {
                current: descriptionCount,
                max: MAX_DESCRIPTION_LENGTH,
              })}
            </Text>
          </View>

          <Controller
            control={control}
            name="location"
            render={({ field }) => (
              <TFTextField
                label={t('faults.location')}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.location ? t(errors.location.message!) : undefined}
                disabled={loading || isEditMode || !isEditable}
              />
            )}
          />

          <Controller
            control={control}
            name="urgency"
            render={({ field }) => (
              <View style={styles.urgencyContainer}>
                <Text style={styles.label}>{t('faults.urgency')}</Text>
                <SegmentedButtons
                  value={String(field.value)}
                  onValueChange={value => field.onChange(value as UrgencyLevel)}
                  buttons={[
                    {
                      value: String(UrgencyLevel.LOW),
                      label: t('faults.urgencyLow'),
                      disabled: loading || isEditMode || !isEditable,
                    },
                    {
                      value: String(UrgencyLevel.MEDIUM),
                      label: t('faults.urgencyMedium'),
                      disabled: loading || isEditMode || !isEditable,
                    },
                    {
                      value: String(UrgencyLevel.HIGH),
                      label: t('faults.urgencyHigh'),
                      disabled: loading || isEditMode || !isEditable,
                    },
                    {
                      value: String(UrgencyLevel.URGENT),
                      label: t('faults.urgencyUrgent'),
                      disabled: loading || isEditMode || !isEditable,
                    },
                  ]}
                />
              </View>
            )}
          />
        </View>

        <View style={[styles.additionalInfoSection, { backgroundColor: theme.colors.surfaceVariant, borderRadius: 8, paddingHorizontal: 8 }]}>
          <Text style={[styles.label, { marginHorizontal: 8, marginTop: 8, marginBottom: 8 }]}>{t('faults.additionalInfoTitle')}</Text>
          <Controller
            control={control}
            name="allowMasterKeyAccess"
            render={({ field }) => (
              <Pressable
                onPress={() => field.onChange(!field.value)}
                disabled={loading || !isEditable}
              >
                <Surface
                  style={[
                    styles.checkboxBox,
                    {
                      borderColor: field.value ? theme.colors.primary : theme.colors.outline,
                      borderWidth: 2,
                      backgroundColor: field.value ? theme.colors.primaryContainer : theme.colors.surface,
                    },
                  ]}
                  elevation={0}
                >
                  <Checkbox
                    status={field.value ? 'checked' : 'unchecked'}
                    color={field.value ? theme.colors.primary : undefined}
                    disabled={loading || !isEditable}
                  />
                  <Text style={styles.checkboxLabel}>{t('faults.allowMasterKeyAccess')}</Text>
                </Surface>
              </Pressable>
            )}
          />
          <Controller
            control={control}
            name="hasPets"
            render={({ field }) => (
              <Pressable
                onPress={() => field.onChange(!field.value)}
                disabled={loading || !isEditable}
              >
                <Surface
                  style={[
                    styles.checkboxBox,
                    {
                      borderColor: field.value ? theme.colors.primary : theme.colors.outline,
                      borderWidth: 2,
                      backgroundColor: field.value ? theme.colors.primaryContainer : theme.colors.surface,
                    },
                  ]}
                  elevation={0}
                >
                  <Checkbox
                    status={field.value ? 'checked' : 'unchecked'}
                    color={field.value ? theme.colors.primary : undefined}
                    disabled={loading || !isEditable}
                  />
                  <Text style={styles.checkboxLabel}>{t('faults.hasPets')}</Text>
                </Surface>
              </Pressable>
            )}
          />
        </View>

        {isEditMode && existingImageUrls.length > 0 && (
          <View style={styles.imageSection}>
            <Text style={styles.label}>{t('faults.images')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {existingImageUrls.map((uri, index) => (
                <Pressable key={`${uri}-${index}`} style={styles.imageContainer}>
                  <Image source={{ uri }} style={styles.imagePreview} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.imageSection}>
          <TFButton
            title={t('faults.addImage')}
            onPress={pickImage}
            mode="outlined"
            icon="image-plus"
            fullWidth
            disabled={loading || !isEditable}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {media.map((mediaFile) => (
              <Pressable
                key={mediaFile.id}
                onLongPress={() => removeImage(mediaFile.id)}
                style={styles.imageContainer}
              >
                <Image 
                  source={{ uri: `data:${mediaFile.mimeType};base64,${mediaFile.base64}` }} 
                  style={styles.imagePreview} 
                />
                <Pressable
                  onPress={() => removeImage(mediaFile.id)}
                  style={[styles.removeIcon, { backgroundColor: theme.colors.error }]}
                >
                  <Text style={styles.removeIconText}>✕</Text>
                </Pressable>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.buttonContainer}>
          {isEditable && (
            <TFButton
              title={isEditMode ? t('faults.update') : t('faults.submit')}
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              fullWidth
            />
          )}
          {isEditMode && (
            <TFButton
              title={t('faults.close')}
              onPress={handleClose}
              mode="outlined"
              textColor={theme.colors.error}
              disabled={loading || !isEditable}
              fullWidth
              style={styles.deleteButton}
            />
          )}
          <TFButton
            title={t('faults.cancel')}
            onPress={() => {
              // Clear ViewModel state and route params before navigating away
              reset();
              navigation.setParams({ faultReportId: undefined });
              navigation.goBack();
            }}
            mode="outlined"
            disabled={loading}
            fullWidth
          />
        </View>
      </View>
    </Screen>
  );
};

// ---------------- STYLES ----------------

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 16,
  },
  formSection: {
    gap: 12,
    marginBottom: 8,
  },
  descriptionInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  descriptionMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -4,
    marginBottom: 4,
  },
  descriptionMeta: {
    fontSize: 12,
  },
  descriptionCount: {
    fontSize: 12,
  },
  urgencyContainer: {
    marginTop: 4,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  imageSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  additionalInfoSection: {
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  checkboxBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 6,
  },
  checkboxRowPressed: {
    opacity: 0.7,
  },
  checkboxLabel: {
    marginLeft: 8,
    flex: 1,
  },
  imageContainer: {
    marginRight: 8,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  removeIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  removeIconText: {
    color: 'white',
    fontSize: 12,
  },
  buttonContainer: {
    marginTop: 16,
    gap: 8,
  },
  deleteButton: {
    marginTop: 4,
  },
  error: {
    color: '#D32F2F',
    marginTop: 8,
    textAlign: 'center',
  },
});
