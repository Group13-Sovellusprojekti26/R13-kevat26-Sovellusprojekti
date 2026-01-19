import React from 'react';
import { useTranslation } from 'react-i18next';
import { ManagementPlaceholderScreen } from '@/shared/components/ManagementPlaceholderScreen';

/**
 * Manage Announcements Screen for service company users
 */
export const ManageAnnouncementsScreen: React.FC = () => {
  const { t } = useTranslation();

  return (
    <ManagementPlaceholderScreen
      title={t('serviceCompany.manageAnnouncements')}
      message={t('serviceCompany.announcementsComingSoon')}
    />
  );
};
