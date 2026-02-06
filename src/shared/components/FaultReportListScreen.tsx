import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { GenericListScreen } from './GenericListScreen';
import { ListLoadingComponent } from './ListLoadingComponent';
import { FaultReportCard } from './FaultReportCard';
import { GenericListItemCard } from './GenericListItemCard';
import { TFButton } from './TFButton';
import { FaultReportFilterModal } from './FaultReportFilterModal';
import {
  filterReportsByStatus,
  type FaultReportFilter,
} from '@/shared/viewmodels/useCompanyFaultReportsVM';
import { getFaultReportFilterLabel } from '@/shared/utils/faultReportFilter';
import { useCompanyFaultReportsState } from '@/shared/hooks/useCompanyFaultReportsState';
import { useFilterModal } from '@/shared/hooks/useFilterModal';
import { listScreenDefaults } from '@/shared/config/listScreenConfig';
import { getCurrentUser } from '@/features/auth/services/auth.service';
import { FaultReportStatus } from '@/data/models/enums';
import type { FaultReport } from '@/data/models/FaultReport';

interface FaultReportListScreenProps {
  /** Navigation screen name for detail view */
  detailScreenName?: string;
  /** Whether to show edit button (resident-specific) */
  isResident?: boolean;
  /** Whether to allow editing own reports (for housing company/maintenance) */
  canEditOwnReports?: boolean;
  /** Navigation target for editing (CreateFaultReport tab) */
  editScreenName?: string;
}

export const FaultReportListScreen: React.FC<FaultReportListScreenProps> = ({
  detailScreenName = 'FaultReportDetails',
  isResident = false,
  canEditOwnReports = false,
  editScreenName = 'CreateFaultReport',
}) => {
  const currentUser = getCurrentUser();
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { reports, loading, error, refreshing, loadReports, refresh } = useCompanyFaultReportsState();
  const [filter, setFilter] = useState<FaultReportFilter>('all');
  const { filterVisible, openFilter, closeFilter } = useFilterModal([]);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports])
  );

  const filteredReports = useMemo(
    () => filterReportsByStatus(reports, filter),
    [filter, reports]
  );

  const filterLabel = useMemo(
    () => getFaultReportFilterLabel(filter, t),
    [filter, t]
  );

  const renderItem = ({ item }: { item: FaultReport }) => {
    // Check if this report is owned by current user and can be edited
    const isOwnReport = item.createdByUserId === currentUser?.uid;
    const isEditableStatus = item.status === FaultReportStatus.OPEN || item.status === FaultReportStatus.CREATED;
    const showEditButton = (isResident || (canEditOwnReports && isOwnReport)) && isEditableStatus;
    
    return (
      <GenericListItemCard
        item={item}
        renderContent={(report) => (
          <FaultReportCard
            report={report}
            onPress={() => navigation.navigate(detailScreenName, { faultReportId: report.id })}
            onEdit={showEditButton ? () => navigation.navigate(editScreenName, { faultReportId: report.id }) : undefined}
            isResident={showEditButton}
          />
        )}
        onPress={() => navigation.navigate(detailScreenName, { faultReportId: item.id })}
      />
    );
  };

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#D32F2F', textAlign: 'center' }}>{error}</Text>
      </View>
    );
  }

  return (
    <>
      <GenericListScreen
        data={filteredReports}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        isLoading={loading}
        isRefreshing={refreshing}
        onRefresh={refresh}
        config={{
          ...listScreenDefaults,
          headerComponent: null,
          filterComponent: (
            <TFButton
              title={t('faults.filterButton', { filter: filterLabel })}
              mode="outlined"
              icon="filter-variant"
              onPress={openFilter}
              fullWidth
            />
          ),
          loadingComponent: <ListLoadingComponent />,
          emptyComponent: (
            <Text variant="bodyMedium" style={{ textAlign: 'center' }}>
              {t('faults.noReports')}
            </Text>
          ),
        }}
      />

      <FaultReportFilterModal
        visible={filterVisible}
        filter={filter}
        onFilterChange={setFilter}
        onClose={closeFilter}
      />
    </>
  );
};
