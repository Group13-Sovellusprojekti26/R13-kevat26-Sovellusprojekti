import React from 'react';
import { useTranslation } from 'react-i18next';
import { ManagementPlaceholderScreen } from '@/shared/components/ManagementPlaceholderScreen';

/**
 * Manage Announcements Screen for maintenance users
 */
export const ManageAnnouncementsScreen: React.FC = () => {
  const { t } = useTranslation();

  return (
    <ManagementPlaceholderScreen
      title={t('maintenance.dashboard.manageAnnouncements')}
      message={t('maintenance.dashboard.announcementsComingSoon')}
    />
  );
};
