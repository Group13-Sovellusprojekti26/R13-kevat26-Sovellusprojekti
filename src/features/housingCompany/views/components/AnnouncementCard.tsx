import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme, Card, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { Announcement } from '@/data/models/Announcement';
import { formatAnnouncementDate } from '@/shared/utils/dateFormatter';

interface AnnouncementCardProps {
  item: Announcement;
  locale: string;
  onPress?: (item: Announcement) => void;
  onEdit?: (item: Announcement) => void;
  onDelete?: (item: Announcement) => void;
}

export const AnnouncementCard: React.FC<AnnouncementCardProps> = ({
  item,
  locale,
  onPress,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();

  const startDate = item.startDate ? formatAnnouncementDate(item.startDate, locale) : null;
  const endDate = formatAnnouncementDate(item.endDate, locale);
  const createdDate = formatAnnouncementDate(item.createdAt, locale);

  return (
    <Card
      style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]}
      onPress={() => onPress?.(item)}
    >
      <Card.Content>
        {/* Header with title and actions */}
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Text variant="titleMedium" numberOfLines={1} style={styles.title}>
              {item.title}
            </Text>
            {item.isPinned && (
              <Text variant="labelSmall" style={{ color: theme.colors.error, marginTop: 4 }}>
                {t('announcements.pinned')}
              </Text>
            )}
          </View>
          {(onEdit || onDelete) && (
            <View style={styles.actionButtons}>
              {onEdit && (
                <IconButton
                  icon="pencil"
                  size={20}
                  onPress={() => onEdit(item)}
                />
              )}
              {onDelete && (
                <IconButton
                  icon="delete"
                  size={20}
                  iconColor={theme.colors.error}
                  onPress={() => onDelete(item)}
                />
              )}
            </View>
          )}
        </View>

        {/* Type badge */}
        <Text variant="bodySmall" style={styles.type}>
          {t(`announcements.types.${item.type}`)}
        </Text>

        {/* Content preview */}
        <Text variant="bodyMedium" numberOfLines={3} style={styles.content}>
          {item.content}
        </Text>

        {/* Date range */}
        <View style={styles.dateRangeContainer}>
          <View style={styles.dateItem}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('announcements.startDate')}
            </Text>
            <Text variant="bodySmall" style={{ fontWeight: '500' }}>
              {startDate}
              {item.startTime && ` ${item.startTime}`}
            </Text>
          </View>
          <View style={styles.dateItem}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('announcements.endDate')}
            </Text>
            <Text variant="bodySmall" style={{ fontWeight: '500' }}>
              {endDate}
              {item.endTime && ` ${item.endTime}`}
            </Text>
          </View>
        </View>

        {/* Footer with author and creation date */}
        <View style={[styles.footer, { borderTopColor: theme.colors.outlineVariant }]}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {item.authorName}
          </Text>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {createdDate}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  type: {
    marginBottom: 8,
    opacity: 0.7,
  },
  content: {
    marginBottom: 12,
    lineHeight: 20,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  dateItem: {
    flex: 1,
  },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 4,
  },
});
