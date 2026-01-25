import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, Pressable, Alert } from 'react-native';
import { Text, SegmentedButtons, useTheme } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';

import { Screen } from '../../../../shared/components/Screen';
import { TFButton } from '../../../../shared/components/TFButton';
import { TFTextField } from '../../../../shared/components/TFTextField';
import { useCreateFaultReportVM } from '../viewmodels/useCreateFaultReportVM';
import { FaultReportStatus, UrgencyLevel } from '../../../../data/models/enums';
import { haptic } from '../../../../shared/utils/haptics';
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
});

type CreateFaultReportFormData = z.infer<typeof createFaultReportSchema>;

// ---------------- COMPONENT ----------------

export const CreateFaultReportScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ResidentTabsParamList, 'CreateFaultReport'>>();
  const { loading, error, success, submitReport, clearError, reset, loadReport, updateReport, closeReport, report } =
    useCreateFaultReportVM();

  const faultReportId = route.params?.faultReportId;
  const isEditMode = useMemo(() => Boolean(faultReportId), [faultReportId]);
  const isEditable =
    !isEditMode ||
    report?.status === FaultReportStatus.OPEN ||
    report?.status === FaultReportStatus.CREATED;

  const [imageUris, setImageUris] = useState<string[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const dedupeUrls = (urls: string[]) => Array.from(new Set(urls));
  const mergedExistingImageUrls = useMemo(
    () => dedupeUrls([...(report?.imageUrls ?? []), ...existingImageUrls]),
    [existingImageUrls, report?.imageUrls]
  );
  const removeImage = (index: number) => {
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
            setImageUris(prev => prev.filter((_, i) => i !== index));
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
    },
  });

  useEffect(() => {
    if (faultReportId) {
      loadReport(faultReportId);
    }
  }, [faultReportId, loadReport]);

  useFocusEffect(
    useCallback(() => {
      if (faultReportId) {
        return;
      }

      resetForm({
        title: '',
        description: '',
        location: '',
        urgency: UrgencyLevel.MEDIUM,
      });
      setExistingImageUrls([]);
      setImageUris([]);
      reset();
    }, [faultReportId, resetForm, reset])
  );

  useEffect(() => {
    if (report && isEditMode) {
      resetForm({
        title: report.title,
        description: report.description,
        location: report.location,
        urgency: report.urgency,
      });
      setExistingImageUrls(dedupeUrls(report.imageUrls ?? []));
      setImageUris([]);
    }
  }, [isEditMode, report, resetForm]);

  useEffect(() => {
    if (!isEditMode) {
      setExistingImageUrls([]);
      setImageUris([]);
    }
  }, [isEditMode]);

  useEffect(() => {
    if (success && !isEditMode) {
      const handleAfterSave = () => {
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
  }, [isEditMode, navigation, reset, resetForm, success, t]);

  const descriptionValue = watch('description');
  const descriptionCount = descriptionValue?.length ?? 0;

  // ---------------- IMAGE PICKER ----------------

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      
      try {
        // Compress and convert image to WebP format for optimal size
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          asset.uri,
          [
            // Resize if image is too large (max 1920px width)
            { resize: { width: Math.min(asset.width ?? 1920, 1920) } },
          ],
          {
            compress: 0.7,
            format: ImageManipulator.SaveFormat.WEBP,
            base64: true,
          }
        );

        if (!manipulatedImage.base64) {
          Alert.alert(t('common.error'), t('faults.imageBase64Missing'));
          return;
        }

        const dataUrl = `data:image/webp;base64,${manipulatedImage.base64}`;
        setImageUris(prev => (prev.includes(dataUrl) ? prev : [...prev, dataUrl]));
      } catch (error) {
        console.error('Image manipulation error:', error);
        Alert.alert(t('common.error'), t('faults.imageProcessingFailed'));
      }
    }
  };

  // ---------------- SUBMIT (HERE) ----------------

  const onSubmit = async (data: CreateFaultReportFormData) => {
    if (loading) {
      return;
    }
    clearError();

    if (isEditMode && faultReportId) {
      try {
        const uniqueImageUris = dedupeUrls(imageUris);
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
      imageUris: dedupeUrls(imageUris),
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
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={loading || isEditMode || !isEditable}
                  buttons={[
                    { value: UrgencyLevel.LOW, label: t('faults.urgencyLow') },
                    { value: UrgencyLevel.MEDIUM, label: t('faults.urgencyMedium') },
                    { value: UrgencyLevel.HIGH, label: t('faults.urgencyHigh') },
                    { value: UrgencyLevel.URGENT, label: t('faults.urgencyUrgent') },
                  ]}
                />
              </View>
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
            {imageUris.map((uri, index) => (
              <Pressable
                key={index}
                onLongPress={() => removeImage(index)}
                style={styles.imageContainer}
              >
                <Image source={{ uri }} style={styles.imagePreview} />
                <Pressable
                  onPress={() => removeImage(index)}
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
