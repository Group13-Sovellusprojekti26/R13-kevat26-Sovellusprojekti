import React, { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, Pressable, Share, Alert } from 'react-native';
import { Text, Card, Chip, useTheme, ActivityIndicator, IconButton, Divider } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useRoute, RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Screen } from '../../../shared/components/Screen';
import { TFButton } from '../../../shared/components/TFButton';
import { useHousingCompanyVM } from '../viewmodels/useHousingCompanyVM';
import { HousingCompanyStackParamList } from '../../../app/navigation/HousingCompanyStack';
import { ResidentInvite } from '../../../data/repositories/residentInvites.repo';
import { haptic } from '../../../shared/utils/haptics';

type RoutePropType = RouteProp<HousingCompanyStackParamList, 'BuildingResidents'>;
type NavigationProp = NativeStackNavigationProp<HousingCompanyStackParamList>;

/**
 * Screen showing apartments and invite codes for a specific building
 */
export const BuildingResidentsScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation<NavigationProp>();
  const { buildingId } = route.params;
  const { residentInvites, isLoading, loadResidentInvites, deleteResidentInvite } = useHousingCompanyVM();
  const [deleting, setDeleting] = useState<string | null>(null);

  // Load invites when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadResidentInvites();
    }, [loadResidentInvites])
  );

  // Filter invites for this building and sort by apartment number
  const buildingInvites = React.useMemo(() => {
    return residentInvites
      .filter(invite => invite.buildingId === buildingId)
      .sort((a, b) => a.apartmentNumber.localeCompare(b.apartmentNumber, undefined, { numeric: true }));
  }, [residentInvites, buildingId]);

  const copyToClipboard = async (code: string) => {
    await Clipboard.setStringAsync(code);
    haptic.success();
    Alert.alert(t('housingCompany.residents.codeCopied'));
  };

  const shareInviteCode = async (invite: ResidentInvite) => {
    try {
      await Share.share({
        message: `${t('housingCompany.residents.inviteCodeMessage')}\n\n${t('housingCompany.residents.apartmentInfo', {
          building: invite.buildingId,
          apartment: invite.apartmentNumber,
        })}\n\n${t('housingCompany.residents.inviteCodeInstructions', { code: invite.inviteCode })}`,
      });
    } catch (error) {
      console.error('Error sharing invite code:', error);
    }
  };

  const handleDeleteInvite = (invite: ResidentInvite) => {
    Alert.alert(
      t('housingCompany.residents.deleteInviteWarning'),
      t('housingCompany.residents.deleteInviteMessage'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setDeleting(invite.id);
            try {
              await deleteResidentInvite(invite.id);
              haptic.success();
              Alert.alert(
                t('common.success'),
                t('housingCompany.residents.inviteDeletedSuccess')
              );
            } catch (error: any) {
              haptic.error();
              Alert.alert(t('common.error'), t(error?.message || 'housingCompany.residents.deleteError'));
            } finally {
              setDeleting(null);
            }
          },
        },
      ]
    );
  };

  const getStatusChip = (invite: ResidentInvite) => {
    if (invite.isUsed) {
      return (
        <Chip 
          mode="flat" 
          style={[styles.statusChip, { backgroundColor: '#E8F5E9' }]}
          textStyle={{ color: '#2E7D32', fontSize: 12 }}
        >
          {t('housingCompany.residents.inviteStatus.active')}
        </Chip>
      );
    }
    if (invite.isExpired) {
      return (
        <Chip 
          mode="flat" 
          style={[styles.statusChip, { backgroundColor: '#FFEBEE' }]}
          textStyle={{ color: '#C62828', fontSize: 12 }}
        >
          {t('housingCompany.residents.inviteStatus.expired')}
        </Chip>
      );
    }
    return (
      <Chip 
        mode="flat" 
        style={[styles.statusChip, { backgroundColor: '#FFF3E0' }]}
        textStyle={{ color: '#E65100', fontSize: 12 }}
      >
        {t('housingCompany.residents.inviteStatus.pending')}
      </Chip>
    );
  };

  const renderInviteCard = ({ item }: { item: ResidentInvite }) => (
    <Pressable 
      onLongPress={item.isUsed ? undefined : () => copyToClipboard(item.inviteCode)}
      delayLongPress={500}
    >
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View>
              <Text variant="titleMedium" style={styles.apartmentTitle}>
                {t('housingCompany.residents.apartment', { number: item.apartmentNumber })}
              </Text>
              {getStatusChip(item)}
            </View>
            
            {!item.isUsed && !item.isExpired && (
              <IconButton
                icon="share-variant"
                size={20}
                onPress={() => shareInviteCode(item)}
              />
            )}
          </View>
          
          {item.isUsed ? (
            <View style={[
              styles.codeContainer,
              {
                backgroundColor: theme.colors.surfaceVariant,
                borderColor: theme.colors.outlineVariant,
              },
            ]}>
              <Text variant="titleMedium" style={[styles.residentName, { color: theme.colors.onSurface }]}>
                {item.residentName || t('housingCompany.residents.registeredResident')}
              </Text>
            </View>
          ) : (
            <Pressable onLongPress={() => copyToClipboard(item.inviteCode)} delayLongPress={300}>
              <View style={[
                styles.codeContainer,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}>
                <Text variant="headlineSmall" style={[
                  styles.inviteCode,
                  { color: theme.colors.onSurface },
                  item.isExpired && styles.expiredCode,
                ]}>
                  {item.inviteCode}
                </Text>
                <IconButton
                  icon="content-copy"
                  size={18}
                  onPress={() => copyToClipboard(item.inviteCode)}
                  style={styles.copyButton}
                />
              </View>
            </Pressable>
          )}
          
          {item.expiresAt && !item.isUsed && (
            <Text variant="bodySmall" style={[
              styles.expiresText, 
              { color: item.isExpired ? '#C62828' : theme.colors.onSurfaceVariant }
            ]}>
              {item.isExpired 
                ? t('admin.codeExpired')
                : `${t('admin.expiresAt')}: ${new Date(item.expiresAt).toLocaleDateString()}`
              }
            </Text>
          )}

          <Divider style={styles.divider} />

          <TFButton
            title={t('housingCompany.residents.deleteInvite')}
            onPress={() => handleDeleteInvite(item)}
            loading={deleting === item.id}
            disabled={deleting !== null}
            icon="delete"
            mode="outlined"
            style={styles.deleteButton}
            textColor="#D32F2F"
          />
        </Card.Content>
      </Card>
    </Pressable>
  );

  if (isLoading && buildingInvites.length === 0) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']}>
      <View style={styles.container}>
        {buildingInvites.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="door" size={64} color="#bbb" />
            <Text style={styles.emptyText}>{t('housingCompany.residents.noApartments')}</Text>
            <TFButton
              title={t('housingCompany.residents.inviteResident')}
              onPress={() => navigation.navigate('CreateResidentInvite')}
              icon="account-plus"
              mode="contained"
              style={styles.addButton}
            />
          </View>
        ) : (
          <>
            <FlatList
              data={buildingInvites}
              renderItem={renderInviteCard}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
            <TFButton
              title={t('housingCompany.residents.inviteResident')}
              onPress={() => navigation.navigate('CreateResidentInvite')}
              icon="account-plus"
              mode="contained"
              style={styles.fab}
            />
          </>
        )}
      </View>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    color: '#777',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 80,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  apartmentTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    borderWidth: 1,
    paddingLeft: 16,
    paddingVertical: 8,
    marginVertical: 8,
  },
  inviteCode: {
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  residentName: {
    fontWeight: '600',
  },
  expiredCode: {
    opacity: 0.5,
    color: '#C62828',
  },
  copyButton: {
    margin: 0,
  },
  expiresText: {
    marginTop: 4,
  },
  divider: {
    marginVertical: 16,
  },
  deleteButton: {
    marginTop: 8,
  },
  addButton: {
    marginTop: 24,
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
});
