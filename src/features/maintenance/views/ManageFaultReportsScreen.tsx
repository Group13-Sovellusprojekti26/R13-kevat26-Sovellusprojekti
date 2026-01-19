import React from 'react';
import { useTranslation } from 'react-i18next';
import { ManagementPlaceholderScreen } from '@/shared/components/ManagementPlaceholderScreen';

/**
 * Manage Fault Reports Screen for maintenance users
 */
export const ManageFaultReportsScreen: React.FC = () => {
  const { t } = useTranslation();

  return (
    <ManagementPlaceholderScreen
      title={t('maintenance.dashboard.manageFaults')}
      message={t('maintenance.dashboard.faultReportsComingSoon')}
    />
  );
};
