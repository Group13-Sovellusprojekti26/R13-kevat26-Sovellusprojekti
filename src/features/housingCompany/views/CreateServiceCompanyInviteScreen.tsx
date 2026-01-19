import React, { useState } from 'react';
import { View, StyleSheet, Alert, Share, ScrollView, Pressable } from 'react-native';
import { Text, Card, Divider, useTheme, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { Screen } from '../../../shared/components/Screen';
import { TFButton } from '../../../shared/components/TFButton';
import { useHousingCompanyVM } from '../viewmodels/useHousingCompanyVM';
import { haptic } from '../../../shared/utils/haptics';

/**
 * Screen for creating service company invite codes
 * Housing company can invite service companies
 */
export const CreateServiceCompanyInviteScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const { generateServiceCompanyInviteCode, isLoading } = useHousingCompanyVM();
  const [generatedCode, setGeneratedCode] = useState<{
    inviteCode: string;
    expiresAt: string;
  } | null>(null);

  const handleGenerateCode = async () => {
    try {
      const result = await generateServiceCompanyInviteCode();
      haptic.success();
      setGeneratedCode(result);
    } catch (error: any) {
      haptic.error();
      Alert.alert(t('common.error'), t(error?.message || 'housingCompany.serviceCompany.generateError'));
    }
  };

  const shareInviteCode = async () => {
    if (!generatedCode) return;
    
    try {
      await Share.share({
        message: `${t('housingCompany.serviceCompany.inviteCodeMessage')}\n\n${t('housingCompany.serviceCompany.inviteCodeInstructions', { code: generatedCode.inviteCode })}`,
      });
    } catch (error) {
      console.error('Error sharing invite code:', error);
    }
  };

  const createAnother = () => {
    setGeneratedCode(null);
  };

  const copyToClipboard = async () => {
    if (!generatedCode) return;
    await Clipboard.setStringAsync(generatedCode.inviteCode);
    haptic.success();
    Alert.alert(t('housingCompany.serviceCompany.codeCopied'));
  };

  // Show success view with generated code
  if (generatedCode) {
    return (
      <Screen safeAreaEdges={['left', 'right', 'bottom']}>
        <ScrollView style={styles.container}>
          <View style={styles.successContainer}>
            <Text variant="displaySmall" style={styles.successIcon}>🎉</Text>
            <Text variant="headlineSmall" style={styles.successTitle}>
              {t('housingCompany.serviceCompany.inviteCodeGenerated')}
            </Text>
          </View>

          <Pressable onLongPress={copyToClipboard} delayLongPress={300}>
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="bodySmall" style={styles.label}>
                  {t('housingCompany.serviceCompany.serviceCompanyInviteCode')}
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
            title={t('housingCompany.serviceCompany.shareInviteCode')}
            onPress={shareInviteCode}
            icon="share-variant"
            mode="contained"
            style={styles.button}
          />

          <TFButton
            title={t('housingCompany.serviceCompany.createInviteCode')}
            onPress={createAnother}
            icon="plus"
            mode="outlined"
            style={styles.button}
          />

          <Divider style={styles.divider} />

          <Text variant="bodySmall" style={styles.infoText}>
            {t('housingCompany.serviceCompany.inviteCodeInfo')}
          </Text>
        </ScrollView>
      </Screen>
    );
  }

  // Show initial form
  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text variant="displaySmall" style={styles.icon}>🔧</Text>
          <Text variant="headlineSmall" style={styles.title}>
            {t('housingCompany.serviceCompany.inviteServiceCompany')}
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {t('housingCompany.serviceCompany.inviteServiceCompanySubtitle')}
          </Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              {t('housingCompany.serviceCompany.generateNewCode')}
            </Text>
            <Text variant="bodyMedium" style={styles.cardDescription}>
              {t('housingCompany.serviceCompany.generateNewCodeDescription')}
            </Text>
          </Card.Content>
        </Card>

        <TFButton
          title={t('housingCompany.serviceCompany.generateCode')}
          onPress={handleGenerateCode}
          icon="key-plus"
          mode="contained"
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
        />
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },
  card: {
    marginBottom: 16,
  },
  cardTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  cardDescription: {
    opacity: 0.7,
    lineHeight: 20,
  },
  button: {
    marginBottom: 12,
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  successTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  label: {
    opacity: 0.7,
    marginBottom: 8,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  inviteCode: {
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  expiresAt: {
    opacity: 0.7,
    marginTop: 8,
  },
  divider: {
    marginVertical: 16,
  },
  infoText: {
    opacity: 0.7,
    lineHeight: 20,
    marginBottom: 24,
  },
});
