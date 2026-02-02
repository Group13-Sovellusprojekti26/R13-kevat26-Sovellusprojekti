import React from 'react';
import { View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import type { Announcement } from '@/data/models/Announcement';
import { formatAnnouncementDate } from '@/shared/utils/dateFormatter';
import { announcementDetailStyles as styles } from '../../styles/announcements.styles';

interface AnnouncementDateRangeProps {
  announcement: Announcement;
  locale: string;
}

/**
 * Displays announcement date and time range.
 * Shows start date/time (optional) and end date/time.
 * Used by AnnouncementDetailScreen.
 */
export const AnnouncementDateRange: React.FC<AnnouncementDateRangeProps> = ({
  announcement,
  locale,
}) => {
  const theme = useTheme();
  const startDate = announcement.startDate ? formatAnnouncementDate(announcement.startDate, locale) : null;
  const endDate = formatAnnouncementDate(announcement.endDate, locale);

  return (
    <View style={styles.dateSection}>
      {startDate && (
        <View style={styles.dateColumn}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Start
          </Text>
          <Text variant="bodyMedium" style={{ fontWeight: '500', marginTop: 4 }}>
            {startDate}
          </Text>
          {announcement.startTime && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {announcement.startTime}
            </Text>
          )}
        </View>
      )}

      {endDate && (
        <View style={styles.dateColumn}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            End
          </Text>
          <Text variant="bodyMedium" style={{ fontWeight: '500', marginTop: 4 }}>
            {endDate}
          </Text>
          {announcement.endTime && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {announcement.endTime}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};
