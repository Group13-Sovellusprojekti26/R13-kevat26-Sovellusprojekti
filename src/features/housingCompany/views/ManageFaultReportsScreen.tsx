import React from 'react';
import { useTranslation } from 'react-i18next';
import { ManagementPlaceholderScreen } from '@/shared/components/ManagementPlaceholderScreen';

/**
 * Manage Fault Reports Screen for housing company
 * Shows and allows management of all fault reports
 */
export const ManageFaultReportsScreen: React.FC = () => {
  const { t } = useTranslation();
  return (
    <ManagementPlaceholderScreen
      title={t('housingCompany.dashboard.manageFaults')}
      message={t('housingCompany.dashboard.faultReportsComingSoon')}
    />
  );
};
