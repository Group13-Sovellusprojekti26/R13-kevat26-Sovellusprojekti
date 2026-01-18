import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Share, Alert, Pressable } from 'react-native';
import { Text, Card, Divider, ActivityIndicator, Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { Screen } from '../../../shared/components/Screen';
import { TFButton } from '../../../shared/components/TFButton';
import { useAdminVM } from '../viewmodels/useAdminVM';
import { AdminStackParamList } from '../../../app/navigation/types';
import { haptic } from '../../../shared/utils/haptics';
import * as Clipboard from 'expo-clipboard';

type CompanyDetailsRouteProp = RouteProp<AdminStackParamList, 'CompanyDetails'>;

/**
 * Screen showing housing company details and invite code management
 */
export const CompanyDetailsScreen: React.FC = () => {
  const { t } = useTranslation();
  const route = useRoute<CompanyDetailsRouteProp>();
  const navigation = useNavigation();
  const { companyId } = route.params;
  const { companies, generateInviteCode, deleteCompany, isLoading } = useAdminVM();
  const [generatingCode, setGeneratingCode] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const company = companies.find(c => c.id === companyId);

  const handleGenerateInviteCode = async () => {
    setGeneratingCode(true);
    try {
      const result = await generateInviteCode(companyId);
      haptic.success();
      
      Alert.alert(
        t('admin.inviteCodeGenerated'),
        `${t('admin.inviteCode')}: ${result.inviteCode}\n${t('admin.expiresAt')}: ${new Date(result.expiresAt).toLocaleDateString()}`,
        [
          {
            text: t('common.share'),
            onPress: () => shareInviteCode(result.inviteCode),
          },
          {
            text: t('common.ok'),
          },
        ]
      );
    } catch (error: any) {
      haptic.error();
      Alert.alert(t('common.error'), t(error?.message || 'admin.generateInviteError'));
    } finally {
      setGeneratingCode(false);
    }
  };

  const shareInviteCode = async (code: string) => {
    try {
      await Share.share({
        message: `${t('admin.inviteCodeMessage')}\n\n${t('admin.inviteCodeInstructions', { code })}`,
      });
    } catch (error) {
      console.error('Error sharing invite code:', error);
    }
  };

  const copyInviteCode = async (code: string) => {
    try {
      await Clipboard.setStringAsync(code);
      haptic.success();
      Alert.alert(t('common.copied'));
    } catch (error) {
      console.error('Error copying invite code:', error);
    }
  };

  const handleDeleteCompany = () => {
    Alert.alert(
      t('admin.deleteCompanyWarning'),
      t('admin.deleteCompanyMessage'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteCompany(companyId);
              haptic.success();
              Alert.alert(
                t('admin.success'),
                t('admin.companyDeletedSuccess'),
                [
                  {
                    text: t('common.ok'),
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error: any) {
              haptic.error();
              Alert.alert(t('common.error'), t(error?.message || 'admin.deleteCompanyError'));
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (!company) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      </Screen>
    );
  }

  const isCodeExpired = company.inviteCodeExpiresAt && company.inviteCodeExpiresAt < new Date();
  const isRegistered = company.isRegistered;

  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']}>
      <ScrollView style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.headerRow}>
              <Text variant="headlineMedium" style={styles.title}>
                {company.name}
              </Text>
              <Chip 
                mode="outlined" 
                style={isRegistered ? styles.registeredChip : styles.notRegisteredChip}
                textStyle={isRegistered ? styles.registeredChipText : styles.notRegisteredChipText}
              >
                {isRegistered ? t('admin.registered') : t('admin.notRegistered')}
              </Chip>
            </View>
            <Text variant="bodyLarge" style={styles.address}>
              {company.address}
            </Text>
            <Text variant="bodyLarge" style={styles.address}>
              {company.postalCode} {company.city}
            </Text>
            
            {isRegistered && company.email && (
              <>
                <Divider style={styles.infoDivider} />
                <Text variant="bodyMedium" style={styles.contactLabel}>
                  {t('auth.email')}: {company.email}
                </Text>
                {company.contactPerson && (
                  <Text variant="bodyMedium" style={styles.contactLabel}>
                    {t('auth.contactPerson')}: {company.contactPerson}
                  </Text>
                )}
                {company.phone && (
                  <Text variant="bodyMedium" style={styles.contactLabel}>
                    {t('auth.phone')}: {company.phone}
                  </Text>
                )}
              </>
            )}
          </Card.Content>
        </Card>

        {/* Show invite code section only if not registered */}
        {!isRegistered && (
          <>
            <Divider style={styles.divider} />

            <Text variant="titleLarge" style={styles.sectionTitle}>
              {t('admin.inviteCodeSection')}
            </Text>

            {company.inviteCode ? (
              <Card style={[styles.card, isCodeExpired && styles.expiredCard]}>
                <Card.Content>
              <Text variant="bodySmall" style={styles.inviteLabel}>
                {t('admin.currentInviteCode')}
              </Text>
              <Pressable onLongPress={() => copyInviteCode(company.inviteCode!)} android_ripple={{ color: '#eee' }}>
                <Text variant="headlineMedium" style={styles.inviteCode}>
                  {company.inviteCode}
                </Text>
              </Pressable>
              {company.inviteCodeExpiresAt && (
                <Text 
                  variant="bodyMedium" 
                  style={[styles.expiresAt, isCodeExpired && styles.expiredText]}
                >
                  {isCodeExpired 
                    ? t('admin.codeExpired') 
                    : `${t('admin.expiresAt')}: ${company.inviteCodeExpiresAt.toLocaleDateString()}`
                  }
                </Text>
              )}
            </Card.Content>
          </Card>
        ) : (
          <Text variant="bodyMedium" style={styles.noCodeText}>
            {t('admin.noInviteCode')}
          </Text>
        )}

        <TFButton
          title={company.inviteCode ? t('admin.regenerateInviteCode') : t('admin.generateInviteCode')}
          onPress={handleGenerateInviteCode}
          loading={generatingCode}
          disabled={generatingCode}
          icon="refresh"
          mode="contained"
          style={styles.button}
        />

        {company.inviteCode && !isCodeExpired && (
          <TFButton
            title={t('admin.shareInviteCode')}
            onPress={() => shareInviteCode(company.inviteCode!)}
            icon="share-variant"
            mode="outlined"
            style={styles.button}
          />
        )}

        <Divider style={styles.divider} />

        <Text variant="bodySmall" style={styles.infoText}>
          {t('admin.inviteCodeInfo')}
        </Text>
          </>
        )}

        {/* Delete company button - always visible at bottom */}
        <Divider style={styles.divider} />
        
        <TFButton
          title={t('admin.deleteCompany')}
          onPress={handleDeleteCompany}
          loading={deleting}
          disabled={deleting || generatingCode}
          icon="delete"
          mode="outlined"
          style={styles.deleteButton}
          textColor="#D32F2F"
        />
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: 16,
  },
  expiredCard: {
    opacity: 0.6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontWeight: 'bold',
    flex: 1,
  },
  registeredChip: {
    backgroundColor: '#E8F5E9',
  },
  registeredChipText: {
    color: '#2E7D32',
  },
  notRegisteredChip: {
    backgroundColor: '#FFF3E0',
  },
  notRegisteredChipText: {
    color: '#E65100',
  },
  address: {
    opacity: 0.7,
    marginBottom: 4,
  },
  infoDivider: {
    marginVertical: 12,
  },
  contactLabel: {
    marginBottom: 4,
  },
  divider: {
    marginVertical: 24,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  inviteLabel: {
    marginBottom: 8,
    opacity: 0.7,
  },
  inviteCode: {
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  expiresAt: {
    opacity: 0.7,
  },
  expiredText: {
    color: 'red',
  },
  noCodeText: {
    marginBottom: 16,
    opacity: 0.7,
    fontStyle: 'italic',
  },
  button: {
    marginBottom: 12,
  },
  deleteButton: {
    marginBottom: 12,
    borderColor: '#D32F2F',
  },
  infoText: {
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 20,
  },
});
