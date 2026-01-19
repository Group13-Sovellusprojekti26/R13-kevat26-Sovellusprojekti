import React from 'react';
import { useTranslation } from 'react-i18next';
import { ManagementPlaceholderScreen } from '@/shared/components/ManagementPlaceholderScreen';

/**
 * Manage Fault Reports Screen for service company users
 */
export const ManageFaultReportsScreen: React.FC = () => {
  const { t } = useTranslation();

  return (
    <ManagementPlaceholderScreen
      title={t('serviceCompany.manageFaults')}
      message={t('serviceCompany.faultReportsComingSoon')}
    />
  );
};
