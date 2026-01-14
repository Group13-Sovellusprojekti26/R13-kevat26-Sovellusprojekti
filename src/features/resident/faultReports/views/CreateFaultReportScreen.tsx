import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { Text, SegmentedButtons } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

import { Screen } from '../../../../shared/components/Screen';
import { TFButton } from '../../../../shared/components/TFButton';
import { TFTextField } from '../../../../shared/components/TFTextField';
import { useCreateFaultReportVM } from '../viewmodels/useCreateFaultReportVM';
import { UrgencyLevel } from '../../../../data/models/enums';import { Alert } from 'react-native';
import { haptic } from '../../../../shared/utils/haptics';

// ---------------- VALIDATION ----------------




const createFaultReportSchema = z.object({
  title: z.string().min(1, 'faults.titleRequired'),
  description: z.string().min(10, 'faults.descriptionRequired'),
  location: z.string().min(1, 'faults.locationRequired'),
  urgency: z.nativeEnum(UrgencyLevel),
});

type CreateFaultReportFormData = z.infer<typeof createFaultReportSchema>;

// ---------------- COMPONENT ----------------

export const CreateFaultReportScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { loading, error, success, submitReport, clearError, reset } =
    useCreateFaultReportVM();

  const [imageUris, setImageUris] = useState<string[]>([]);
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
      navigation.goBack();
    }
  }, [success]);

  // ---------------- IMAGE PICKER ----------------

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      setImageUris(prev => [...prev, result.assets[0].uri]);
    }
  };

  // ---------------- SUBMIT (TÄSSÄ) ----------------

  const onSubmit = async (data: CreateFaultReportFormData) => {
    clearError();

    await submitReport({
      ...data,
      imageUris,
    });
  };


  // ---------------- UI ----------------

  return (
    <Screen scrollable>
      <View style={styles.container}>
        <Text variant="headlineSmall" style={styles.title}>
          {t('faults.createTitle')}
        </Text>

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
  disabled={loading}
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
  numberOfLines={4}
  error={errors.description ? t(errors.description.message!) : undefined}
  disabled={loading}
/>


          )}
        />

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
  disabled={loading}
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
                buttons={[
                  { value: UrgencyLevel.LOW, label: 'Low' },
                  { value: UrgencyLevel.MEDIUM, label: 'Medium' },
                  { value: UrgencyLevel.HIGH, label: 'High' },
                  { value: UrgencyLevel.URGENT, label: 'Urgent' },
                ]}
              />
            </View>
          )}
        />

        {/* ---------- IMAGES ---------- */}

        <Pressable onPress={pickImage} style={styles.addImage}>
          <Text>➕ Lisää kuva</Text>
        </Pressable>

  <ScrollView horizontal>
  {imageUris.map((uri, index) => (
    <Pressable
      key={index}
      onLongPress={() => removeImage(index)}
      style={{ marginRight: 8 }}
    >
      <Image source={{ uri }} style={styles.imagePreview} />
      <Pressable
        onPress={() => removeImage(index)}
        style={styles.removeIcon}
      >
        <Text style={{ color: 'white' }}>✕</Text>
      </Pressable>
    </Pressable>
  ))}
</ScrollView>


        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.buttonContainer}>
          <TFButton
            title={t('faults.submit')}
            onPress={handleSubmit(onSubmit )}
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

// ---------------- STYLES ----------------

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24 },
  urgencyContainer: { marginBottom: 16 },
  label: { fontSize: 16, marginBottom: 8, fontWeight: '500' },
  addImage: { marginVertical: 12 },
  imagePreview: {
    width: 80,
    height: 80,
    marginRight: 8,
    borderRadius: 6,
  },
  buttonContainer: { marginTop: 24, gap: 8 },
  error: {
    color: '#D32F2F',
    marginTop: 8,
    textAlign: 'center',
  },
  removeIcon: {
  position: 'absolute',
  top: 4,
  right: 4,
  backgroundColor: 'rgba(0,0,0,0.6)',
  borderRadius: 10,
  paddingHorizontal: 6,
  paddingVertical: 2,
},

});
