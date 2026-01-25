import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Modal } from 'react-native';
import { Text, RadioButton, Surface, useTheme } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../../../shared/components/Screen';
import { useFaultReportListVM } from '../viewmodels/useFaultReportListVM';
import { FaultReport } from '../../../../data/models/FaultReport';
import { SkeletonCard } from '../../../../shared/components/SkeletonCard';
import { EmptyState } from '../../../../shared/components/EmptyState';
import { FaultReportCard } from '@/shared/components/FaultReportCard';
import {
  filterReportsByStatus,
  FaultReportFilter,
} from '@/shared/viewmodels/useCompanyFaultReportsVM';
import { TFButton } from '@/shared/components/TFButton';


/**
 * Fault Report List Screen
 * Displays all fault reports created by the current user
 */
export const FaultReportListScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { reports, loading, error, refreshing, loadReports, refresh } = useFaultReportListVM();
  const navigation = useNavigation<any>();
  const [filter, setFilter] = useState<FaultReportFilter>('open');
  const [filterVisible, setFilterVisible] = useState(false);

  const handleDetails = useCallback(
    (reportId?: string) => {
      if (!reportId) {
        return;
      }
      navigation.navigate('FaultReportDetails', { faultReportId: reportId });
    },
    [navigation]
  );

  const handleEdit = useCallback(
    (reportId?: string) => {
      if (!reportId) {
        return;
      }
      navigation.navigate('CreateFaultReport', { faultReportId: reportId });
    },
    [navigation]
  );

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports])
  );

  const filteredReports = useMemo(() => filterReportsByStatus(reports, filter), [filter, reports]);
  const filterLabel = useMemo(() => {
    switch (filter) {
      case 'open':
        return t('faults.filters.open');
      case 'in_progress':
        return t('faults.filters.inProgress');
      case 'waiting':
        return t('faults.filters.waiting');
      case 'done':
        return t('faults.filters.done');
      case 'failed':
        return t('faults.filters.failed');
      case 'cancelled':
        return t('faults.filters.cancelled');
      case 'all':
      default:
        return t('faults.filters.all');
    }
  }, [filter, t]);


  const renderItem = ({ item }: { item: FaultReport }) => (
    <FaultReportCard
      report={item}
      onPress={() => handleDetails(item.id)}
      onEdit={() => handleEdit(item.id)}
      isResident
    />
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

  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']}>
      <FlatList
        data={filteredReports}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.filterContainer}>
            <TFButton
              title={t('faults.filterButton', { filter: filterLabel })}
              mode="outlined"
              icon="filter-variant"
              onPress={() => setFilterVisible(true)}
              fullWidth
            />
          </View>
        }
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
      <Modal
        transparent
        visible={filterVisible}
        animationType="fade"
        onRequestClose={() => setFilterVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Surface style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
            elevation={4}
          >
            <Text variant="titleMedium" style={styles.modalTitle}>
              {t('faults.filterTitle')}
            </Text>
            <RadioButton.Group
              onValueChange={(value) => {
                setFilter(value as FaultReportFilter);
                setFilterVisible(false);
              }}
              value={filter}
            >
              <RadioButton.Item label={t('faults.filters.all')} value="all" />
              <RadioButton.Item label={t('faults.filters.open')} value="open" />
              <RadioButton.Item label={t('faults.filters.inProgress')} value="in_progress" />
              <RadioButton.Item label={t('faults.filters.waiting')} value="waiting" />
              <RadioButton.Item label={t('faults.filters.done')} value="done" />
              <RadioButton.Item label={t('faults.filters.failed')} value="failed" />
              <RadioButton.Item label={t('faults.filters.cancelled')} value="cancelled" />
            </RadioButton.Group>
            <TFButton
              title={t('common.cancel')}
              mode="text"
              onPress={() => setFilterVisible(false)}
              fullWidth
            />
          </Surface>
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    paddingBottom: 96,
  },
  filterContainer: {
    marginBottom: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  modalTitle: {
    marginBottom: 8,
    textAlign: 'center',
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
