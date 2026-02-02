import React from 'react';
import { View, TouchableOpacity, Linking } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import type { Announcement } from '@/data/models/Announcement';
import { formatAnnouncementDate } from '@/shared/utils/dateFormatter';
import { announcementDetailStyles as styles } from '../../styles/announcements.styles';

interface AnnouncementAttachmentsProps {
  announcement: Announcement;
  locale: string;
}

/**
 * Displays announcement attachments as downloadable list.
 * Used by AnnouncementDetailScreen.
 */
export const AnnouncementAttachments: React.FC<AnnouncementAttachmentsProps> = ({
  announcement,
  locale,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();

  if (!announcement.attachments || announcement.attachments.length === 0) {
    return null;
  }

  return (
    <View style={[styles.attachmentsSection, { backgroundColor: theme.colors.surfaceVariant }]}>
      <Text variant="titleSmall" style={{ marginBottom: 12 }}>
        📎 {t('announcements.attachments')} ({announcement.attachments.length})
      </Text>
      {announcement.attachments.map((attachment: any, index: number) => (
        <TouchableOpacity
          key={`${attachment.id}-${index}`}
          onPress={() => {
            if (attachment.downloadUrl) {
              Linking.openURL(attachment.downloadUrl);
            }
          }}
          style={[styles.attachmentItem, { backgroundColor: theme.colors.surface }]}
        >
          <View style={styles.attachmentInfo}>
            <Text variant="bodyMedium" style={{ fontWeight: '500' }} numberOfLines={1}>
              {attachment.fileName}
            </Text>
            {attachment.uploadedAt && (
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                {formatAnnouncementDate(
                  attachment.uploadedAt instanceof Date ? attachment.uploadedAt : new Date(attachment.uploadedAt),
                  locale
                )}
              </Text>
            )}
          </View>
          <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
            ↓
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};
