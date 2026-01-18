import React, { useCallback } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Text, Card, Chip, useTheme, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen } from '../../../shared/components/Screen';
import { TFButton } from '../../../shared/components/TFButton';
import { useHousingCompanyVM } from '../viewmodels/useHousingCompanyVM';
import { HousingCompanyStackParamList } from '../../../app/navigation/HousingCompanyStack';

type NavigationProp = NativeStackNavigationProp<HousingCompanyStackParamList>;

interface BuildingSummary {
  buildingId: string;
  totalApartments: number;
  pendingInvites: number;
  registeredResidents: number;
}

/**
 * Screen showing list of buildings with resident invite summaries
 */
export const ResidentListScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { residentInvites, isLoading, loadResidentInvites } = useHousingCompanyVM();

  // Load invites when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadResidentInvites();
    }, [loadResidentInvites])
  );

  // Group invites by building
  const buildingSummaries: BuildingSummary[] = React.useMemo(() => {
    const buildingMap = new Map<string, BuildingSummary>();
    
    residentInvites.forEach(invite => {
      const existing = buildingMap.get(invite.buildingId);
      if (existing) {
        existing.totalApartments++;
        if (invite.isUsed) {
          existing.registeredResidents++;
        } else if (!invite.isExpired) {
          existing.pendingInvites++;
        }
      } else {
        buildingMap.set(invite.buildingId, {
          buildingId: invite.buildingId,
          totalApartments: 1,
          pendingInvites: invite.isUsed ? 0 : (invite.isExpired ? 0 : 1),
          registeredResidents: invite.isUsed ? 1 : 0,
        });
      }
    });

    // Sort by building ID
    return Array.from(buildingMap.values()).sort((a, b) => 
      a.buildingId.localeCompare(b.buildingId, undefined, { numeric: true })
    );
  }, [residentInvites]);

  const renderBuildingCard = ({ item }: { item: BuildingSummary }) => (
    <Pressable onPress={() => navigation.navigate('BuildingResidents', { buildingId: item.buildingId })}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text variant="titleLarge" style={styles.buildingTitle}>
              {t('housingCompany.residents.buildingNumber', { number: item.buildingId })}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {item.totalApartments} {item.totalApartments === 1 ? 'asunto' : 'asuntoa'}
            </Text>
          </View>
          
          <View style={styles.chipContainer}>
            {item.registeredResidents > 0 && (
              <Chip 
                mode="flat" 
                style={[styles.chip, { backgroundColor: '#E8F5E9' }]}
                textStyle={{ color: '#2E7D32' }}
              >
                {item.registeredResidents} {t('housingCompany.residents.inviteStatus.active').toLowerCase()}
              </Chip>
            )}
            {item.pendingInvites > 0 && (
              <Chip 
                mode="flat" 
                style={[styles.chip, { backgroundColor: '#FFF3E0' }]}
                textStyle={{ color: '#E65100' }}
              >
                {item.pendingInvites} {t('housingCompany.residents.inviteStatus.pending').toLowerCase()}
              </Chip>
            )}
          </View>
        </Card.Content>
      </Card>
    </Pressable>
  );

  if (isLoading && residentInvites.length === 0) {
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
        {buildingSummaries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="home-group" size={64} color="#bbb" />
            <Text style={styles.emptyText}>{t('housingCompany.residents.noBuildings')}</Text>
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
              data={buildingSummaries}
              renderItem={renderBuildingCard}
              keyExtractor={(item) => item.buildingId}
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
    alignItems: 'center',
    marginBottom: 12,
  },
  buildingTitle: {
    fontWeight: 'bold',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {},
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
