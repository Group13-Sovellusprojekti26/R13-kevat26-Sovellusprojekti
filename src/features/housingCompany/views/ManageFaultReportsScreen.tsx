import React, { useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ScrollView, Image } from 'react-native';
import { Text, Card, Chip, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/shared/components/Screen';
import { SkeletonCard } from '@/shared/components/SkeletonCard';
import { useCompanyFaultReportsVM } from '@/shared/viewmodels/useCompanyFaultReportsVM';
import { FaultReport } from '@/data/models/FaultReport';
import { FaultReportStatus, UrgencyLevel } from '@/data/models/enums';

/**
 * Manage Fault Reports Screen for housing company
 * Shows and allows management of all fault reports
 */
export const ManageFaultReportsScreen: React.FC = () => {
  console.log('ManageFaultReportsScreen mounted');
  const { t } = useTranslation();
  const theme = useTheme();
  const reports = useCompanyFaultReportsVM(state => state.reports);
  const loading = useCompanyFaultReportsVM(state => state.loading);
  const error = useCompanyFaultReportsVM(state => state.error);
  const refreshing = useCompanyFaultReportsVM(state => state.refreshing);
  const loadReports = useCompanyFaultReportsVM(state => state.loadReports);
  const refresh = useCompanyFaultReportsVM(state => state.refresh);

  console.log('ManageFaultReportsScreen', {
    renderedCount: reports.length,
    loading,
    refreshing,
  });

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
      case FaultReportStatus.CANCELLED:
        return t('faults.statusCancelled');
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
          <Text variant="titleMedium" style={styles.title}>{item.title}</Text>
          <Chip mode="flat" compact>
            {getStatusLabel(item.status)}
          </Chip>
        </View>
        <Text style={styles.description}>{item.description}</Text>
        {(item.imageUrls ?? []).length > 0 && (
          <ScrollView horizontal style={styles.imageRow} showsHorizontalScrollIndicator={false}>
            {(item.imageUrls ?? []).map((uri, index) => (
              <Image
                key={`${uri}-${index}`}
                source={{ uri }}
                style={styles.imagePreview}
              />
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
        <Text style={[styles.date, { color: theme.colors.onSurfaceVariant }]}>
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
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('faults.noReports')}</Text>
          </View>
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
    fontSize: 16,
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
  imagePreview: {
    width: 60,
    height: 60,
    marginRight: 8,
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
  emptyContainer: {
    marginTop: 120,
    alignItems: 'center',
  },
  emptyText: {
    color: '#777',
  },
});
