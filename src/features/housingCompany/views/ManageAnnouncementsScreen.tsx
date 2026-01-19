import React from 'react';
import { useTranslation } from 'react-i18next';
import { ManagementPlaceholderScreen } from '@/shared/components/ManagementPlaceholderScreen';

/**
 * Manage Announcements Screen for housing company
 * Shows and allows management of all announcements
 */
export const ManageAnnouncementsScreen: React.FC = () => {
  const { t } = useTranslation();
  return (
    <ManagementPlaceholderScreen
      title={t('housingCompany.dashboard.manageAnnouncements')}
      message={t('housingCompany.dashboard.announcementsComingSoon')}
    />
  );
};
