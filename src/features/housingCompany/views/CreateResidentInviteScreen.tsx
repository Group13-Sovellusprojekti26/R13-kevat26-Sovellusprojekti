import React, { useState } from 'react';
import { View, StyleSheet, Alert, Share, ScrollView, Pressable } from 'react-native';
import { Text, Card, Divider, useTheme, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Clipboard from 'expo-clipboard';
import { Screen } from '../../../shared/components/Screen';
import { TFButton } from '../../../shared/components/TFButton';
import { TFTextField } from '../../../shared/components/TFTextField';
import { useHousingCompanyVM } from '../viewmodels/useHousingCompanyVM';
import { haptic } from '../../../shared/utils/haptics';

const createInviteSchema = z.object({
  buildingId: z.string().min(1, 'housingCompany.residents.buildingIdRequired'),
  apartmentNumber: z.string().min(1, 'housingCompany.residents.apartmentNumberRequired'),
});

type CreateInviteForm = z.infer<typeof createInviteSchema>;

/**
 * Screen for creating resident invite codes
 * Housing company can invite residents by building and apartment number
 */
export const CreateResidentInviteScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const { generateResidentInviteCode, isLoading } = useHousingCompanyVM();
  const [generatedCode, setGeneratedCode] = useState<{
    inviteCode: string;
    expiresAt: string;
    buildingId: string;
    apartmentNumber: string;
  } | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateInviteForm>({
    resolver: zodResolver(createInviteSchema),
    defaultValues: {
      buildingId: '',
      apartmentNumber: '',
    },
  });

  const onSubmit = async (data: CreateInviteForm) => {
    try {
      const result = await generateResidentInviteCode(data.buildingId, data.apartmentNumber);
      haptic.success();
      setGeneratedCode(result);
    } catch (error: any) {
      haptic.error();
      Alert.alert(t('common.error'), t(error?.message || 'housingCompany.residents.generateError'));
    }
  };

  const shareInviteCode = async () => {
    if (!generatedCode) return;
    
    try {
      await Share.share({
        message: `${t('housingCompany.residents.inviteCodeMessage')}\n\n${t('housingCompany.residents.apartmentInfo', {
          building: generatedCode.buildingId,
          apartment: generatedCode.apartmentNumber,
        })}\n\n${t('housingCompany.residents.inviteCodeInstructions', { code: generatedCode.inviteCode })}`,
      });
    } catch (error) {
      console.error('Error sharing invite code:', error);
    }
  };

  const createAnother = () => {
    setGeneratedCode(null);
    reset();
  };

  const copyToClipboard = async () => {
    if (!generatedCode) return;
    await Clipboard.setStringAsync(generatedCode.inviteCode);
    haptic.success();
    Alert.alert(t('housingCompany.residents.codeCopied'));
  };

  // Show success view with generated code
  if (generatedCode) {
    return (
      <Screen safeAreaEdges={['left', 'right', 'bottom']}>
        <ScrollView style={styles.container}>
          <View style={styles.successContainer}>
            <Text variant="displaySmall" style={styles.successIcon}>🎉</Text>
            <Text variant="headlineSmall" style={styles.successTitle}>
              {t('housingCompany.residents.inviteCodeGenerated')}
            </Text>
          </View>

          <Pressable onLongPress={copyToClipboard} delayLongPress={300}>
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="bodySmall" style={styles.label}>
                  {t('housingCompany.residents.apartmentInfo', {
                    building: generatedCode.buildingId,
                    apartment: generatedCode.apartmentNumber,
                  })}
                </Text>
                
                <View style={[
                  styles.codeContainer,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}>
                  <Text variant="headlineLarge" style={[styles.inviteCode, { color: theme.colors.onSurface }]}>
                    {generatedCode.inviteCode}
                  </Text>
                  <IconButton
                    icon="content-copy"
                    size={20}
                    onPress={copyToClipboard}
                  />
                </View>
                
                <Text variant="bodyMedium" style={styles.expiresAt}>
                  {t('admin.expiresAt')}: {new Date(generatedCode.expiresAt).toLocaleDateString()}
                </Text>
              </Card.Content>
            </Card>
          </Pressable>

          <TFButton
            title={t('housingCompany.residents.shareInviteCode')}
            onPress={shareInviteCode}
            icon="share-variant"
            mode="contained"
            style={styles.button}
          />

          <TFButton
            title={t('housingCompany.residents.createInviteCode')}
            onPress={createAnother}
            icon="plus"
            mode="outlined"
            style={styles.button}
          />

          <Divider style={styles.divider} />

          <Text variant="bodySmall" style={styles.infoText}>
            {t('housingCompany.residents.inviteCodeInfo')}
          </Text>
        </ScrollView>
      </Screen>
    );
  }

  // Show form to create invite code
  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']}>
      <ScrollView style={styles.container}>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          {t('housingCompany.residents.createInviteSubtitle')}
        </Text>

        <View style={styles.form}>
          <Controller
            control={control}
            name="buildingId"
            render={({ field: { onChange, onBlur, value } }) => (
              <TFTextField
                label={t('housingCompany.residents.buildingId')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.buildingId ? t(errors.buildingId.message!) : undefined}
                keyboardType="default"
                autoCapitalize="characters"
              />
            )}
          />

          <Controller
            control={control}
            name="apartmentNumber"
            render={({ field: { onChange, onBlur, value } }) => (
              <TFTextField
                label={t('housingCompany.residents.apartmentNumber')}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.apartmentNumber ? t(errors.apartmentNumber.message!) : undefined}
                keyboardType="default"
                autoCapitalize="characters"
              />
            )}
          />

          <TFButton
            title={t('housingCompany.residents.createInviteCode')}
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            disabled={isLoading}
            icon="account-plus"
            mode="contained"
            style={styles.submitButton}
          />
        </View>

        <Divider style={styles.divider} />

        <Text variant="bodySmall" style={styles.infoText}>
          {t('housingCompany.residents.inviteCodeInfo')}
        </Text>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  subtitle: {
    marginBottom: 24,
    lineHeight: 22,
  },
  form: {
    gap: 16,
  },
  submitButton: {
    marginTop: 8,
  },
  divider: {
    marginVertical: 24,
  },
  infoText: {
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Success view styles
  successContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successIcon: {
    marginBottom: 8,
  },
  successTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  card: {
    marginBottom: 24,
  },
  label: {
    marginBottom: 8,
    opacity: 0.7,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  inviteCode: {
    fontWeight: 'bold',
    letterSpacing: 3,
    textAlign: 'center',
  },
  expiresAt: {
    opacity: 0.7,
    textAlign: 'center',
  },
  button: {
    marginBottom: 12,
  },
});
