import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { GenericFilterModal } from './GenericFilterModal';
import { createRadioFilter } from '@/shared/hooks/useFilterModal';
import type { FaultReportFilter } from '@/shared/viewmodels/useCompanyFaultReportsVM';

interface FaultReportFilterModalProps {
  visible: boolean;
  filter: FaultReportFilter;
  onFilterChange: (filter: FaultReportFilter) => void;
  onClose: () => void;
}

/**
 * Fault Report Filter Modal
 * Wrapper around GenericFilterModal for fault report list filtering
 * Eliminates code duplication across 4 ManageFaultReportsScreen versions
 * 
 * Used by: HousingCompany, Maintenance, ServiceCompany, Resident
 */
export const FaultReportFilterModal: React.FC<FaultReportFilterModalProps> = ({
  visible,
  filter,
  onFilterChange,
  onClose,
}) => {
  const { t } = useTranslation();

  const sections = useMemo(
    () => [
      createRadioFilter(
        t('faults.filterTitle'),
        filter,
        (value) => {
          onFilterChange(value as FaultReportFilter);
          onClose();
        },
        [
          { label: t('faults.filters.all'), value: 'all' },
          { label: t('faults.filters.open'), value: 'open' },
          { label: t('faults.filters.inProgress'), value: 'in_progress' },
          { label: t('faults.filters.waiting'), value: 'waiting' },
          { label: t('faults.filters.done'), value: 'done' },
          { label: t('faults.filters.failed'), value: 'failed' },
          { label: t('faults.filters.cancelled'), value: 'cancelled' },
        ]
      ),
    ],
    [t, filter, onFilterChange, onClose]
  );

  return (
    <GenericFilterModal
      visible={visible}
      sections={sections}
      onClose={onClose}
    />
  );
};
