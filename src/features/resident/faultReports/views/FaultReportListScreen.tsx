import React, { useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Image, ScrollView, Pressable } from 'react-native';
import { Text, Card, Chip, useTheme } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../../../shared/components/Screen';
import { useFaultReportListVM } from '../viewmodels/useFaultReportListVM';
import { FaultReport } from '../../../../data/models/FaultReport';
import { FaultReportStatus, UrgencyLevel } from '../../../../data/models/enums';
import { SkeletonCard } from '../../../../shared/components/SkeletonCard';
import { EmptyState } from '../../../../shared/components/EmptyState';


/**
 * Fault Report List Screen
 * Displays all fault reports created by the current user
 */
export const FaultReportListScreen: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { reports, loading, error, refreshing, loadReports, refresh } = useFaultReportListVM();
  const navigation = useNavigation<any>();

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports])
  );

  const getStatusLabel = (status: FaultReportStatus): string => {
    switch (status) {
      case FaultReportStatus.OPEN:
        return t('faults.statusOpen');
      case FaultReportStatus.IN_PROGRESS:
        return t('faults.statusInProgress');
      case FaultReportStatus.RESOLVED:
        return t('faults.statusResolved');
      case FaultReportStatus.CLOSED:
        return t('faults.statusClosed');
      default:
        return status;
    }
  };

  const getUrgencyLabel = (urgency: UrgencyLevel): string => {
    switch (urgency) {
      case UrgencyLevel.LOW:
        return t('faults.urgencyLow');
      case UrgencyLevel.MEDIUM:
        return t('faults.urgencyMedium');
      case UrgencyLevel.HIGH:
        return t('faults.urgencyHigh');
      case UrgencyLevel.URGENT:
        return t('faults.urgencyUrgent');
      default:
        return urgency;
    }
  };

  const renderItem = ({ item }: { item: FaultReport }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <Text variant="titleLarge" style={styles.title}>{item.title}</Text>
          <Chip mode="flat" compact>
            {getStatusLabel(item.status)}
          </Chip>
        </View>
        <Text style={styles.description}>{item.description}</Text>
        {(item.imageUrls ?? []).length > 0 && (
          <ScrollView horizontal style={styles.imageRow} showsHorizontalScrollIndicator={false}>
            {(item.imageUrls ?? []).map((uri, index) => (
              <Pressable
                key={index}
                onPress={() =>
                  navigation.navigate('ImagePreview', {
                    images: item.imageUrls ?? [],
                    index,
                  })
                }
                style={styles.imagePressable}
              >
                <Image
                  source={{ uri }}
                  style={styles.imagePreview}
                />
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View style={styles.footer}>
          <Text style={[styles.location, { color: theme.colors.onSurfaceVariant }]}>{item.location}</Text>
          <Chip 
            mode="outlined" 
            compact
            textStyle={styles.urgencyText}
          >
            {getUrgencyLabel(item.urgency)}
          </Chip>
        </View>
        <Text style={[styles.date, { color: theme.colors.onSurfaceVariant }]}
        >
          {item.createdAt.toLocaleDateString()}
        </Text>
      </Card.Content>
    </Card>
  );

  if (error) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </Screen>
    );
  }
    if (loading) {
      return (
        <Screen>
          <View style={styles.loadingContainer}>
            {[1, 2, 3].map(i => (
              <SkeletonCard key={i} />
            ))}
          </View>
        </Screen>
      );
    }

  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']}>
      <FlatList
        data={reports}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        ListEmptyComponent={
          <EmptyState
            onCreate={() => navigation.navigate('CreateFaultReport')}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    paddingBottom: 96,
  },
  card: {
    marginBottom: 12,
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    flex: 1,
    fontWeight: '600',
  },
  description: {
    marginBottom: 12,
    lineHeight: 20,
  },
  imageRow: {
    marginBottom: 8,
  },
  imagePressable: {
    marginRight: 8,
  },
  imagePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  location: {
    fontSize: 14,
    flex: 1,
  },
  urgencyText: {
    fontSize: 12,
  },
  date: {
    fontSize: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  errorText: {
    color: '#D32F2F',
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 16,
  },
});
