import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { Announcement } from '@/data/models/Announcement';
import { formatAnnouncementDate } from '@/shared/utils/dateFormatter';
import { announcementCardStyles as styles } from '../../styles/announcements.styles';

interface AnnouncementPublisherInfoProps {
  announcement: Announcement;
  locale: string;
}

/**
 * Displays announcement publisher information.
 * Shows author name, creation date, and updater name with update date if different.
 * Used by both AnnouncementCard and AnnouncementDetailScreen.
 */
export const AnnouncementPublisherInfo: React.FC<AnnouncementPublisherInfoProps> = ({
  announcement,
  locale,
}) => {
  const { t } = useTranslation();
  const createdDate = formatAnnouncementDate(announcement.createdAt, locale);
  const updatedDate = formatAnnouncementDate(announcement.updatedAt, locale);
  const isUpdated = announcement.createdAt.getTime() !== announcement.updatedAt.getTime();

  return (
    <View style={styles.publisherInfoContainer}>
      <Text variant="labelSmall">
        {announcement.authorName || t('common.unknown')}
      </Text>
      <Text variant="labelSmall">•</Text>
      <Text variant="labelSmall">
        {createdDate}
      </Text>
      {isUpdated && (
        <>
          <Text variant="labelSmall">•</Text>
          <Text variant="labelSmall">
            {t('announcements.updated')} {announcement.updatedByName || t('common.unknown')} {updatedDate}
          </Text>
        </>
      )}
    </View>
  );
};
