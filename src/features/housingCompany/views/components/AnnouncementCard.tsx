import React from 'react';
import { View } from 'react-native';
import { Text, useTheme, Card, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { Announcement } from '@/data/models/Announcement';
import { formatAnnouncementDate } from '@/shared/utils/dateFormatter';
import { announcementCardStyles as styles } from '../../styles/announcements.styles';

/**
 * Props interface for AnnouncementCard component.
 * Controls card content display and callback handlers for user interactions.
 * 
 * @interface AnnouncementCardProps
 * @property {Announcement} item - Announcement data to display
 * @property {string} locale - Locale code (e.g., 'fi', 'en') for date formatting
 * @property {Function} [onPress] - Callback when card is pressed (typically navigates to detail view)
 * @property {Function} [onEdit] - Callback when edit button is pressed (shows edit pencil icon if provided)
 * @property {Function} [onDelete] - Callback when delete button is pressed (shows delete trash icon if provided)
 */
interface AnnouncementCardProps {
  item: Announcement;
  locale: string;
  onPress?: (item: Announcement) => void;
  onEdit?: (item: Announcement) => void;
  onDelete?: (item: Announcement) => void;
}

/**
 * Reusable announcement card component displaying announcement details with Material Design 3 styling.
 * Used throughout the announcement feature for list views and detail displays.
 * 
 * Layout (top to bottom):
 * 1. Title + action buttons (edit/delete) - optional buttons only shown if callbacks provided
 * 2. Publisher info - author name, creation date, optional update date if different
 * 3. Type badge - styled with theme colors, positioned at left
 * 4. Date range - shows start and end dates with times if applicable
 * 5. Content preview - first 150 characters of announcement content
 * 
 * Features:
 * - Shows 'pinned' indicator if announcement is pinned
 * - Conditional edit/delete action buttons based on permissions
 * - Displays update date only if different from creation date
 * - Responsive layout with Material Design 3 theme integration
 * - Locale-aware date formatting (Finnish/English)
 *
 * @component AnnouncementCard
 * @param {AnnouncementCardProps} props - Component props
 * @returns {JSX.Element} Material Design Card with announcement details
 *
 * @example
 * <AnnouncementCard
 *   item={announcement}
 *   locale="fi"
 *   onPress={() => navigation.navigate('Detail', { id: announcement.id })}
 *   onEdit={() => navigation.navigate('Edit', { id: announcement.id })}
 *   onDelete={() => showDeleteConfirm(announcement)}
 * />
 */
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
  const updatedDate = formatAnnouncementDate(item.updatedAt, locale);
  const isUpdated = item.createdAt.getTime() !== item.updatedAt.getTime();

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

        {/* Publisher and creation date info */}
        <View style={styles.publisherInfoContainer}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {item.authorName}
          </Text>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            •
          </Text>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {createdDate}
          </Text>
          {isUpdated && (
            <>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                •
              </Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontWeight: '500' }}>
                {t('announcements.updated')}: {updatedDate}
              </Text>
            </>
          )}
        </View>

        {/* Type badge */}
        <View style={[styles.typeBadge, { backgroundColor: theme.colors.tertiaryContainer }]}>
          <Text 
            variant="labelSmall" 
            style={[styles.typeText, { color: theme.colors.onTertiaryContainer }]}
          >
            {t(`announcements.types.${item.type}`)}
          </Text>
        </View>

        {/* Date range - only show if start or end date exists */}
        {(startDate || endDate) && (
          <View style={styles.dateRangeContainer}>
            {startDate && (
              <View style={styles.dateItem}>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {t('announcements.startDate')}
                </Text>
                <Text variant="bodySmall" style={{ fontWeight: '500' }}>
                  {startDate}
                  {item.startTime && ` ${item.startTime}`}
                </Text>
              </View>
            )}
            {endDate && (
              <View style={styles.dateItem}>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {t('announcements.endDate')}
                </Text>
                <Text variant="bodySmall" style={{ fontWeight: '500' }}>
                  {endDate}
                  {item.endTime && ` ${item.endTime}`}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Attachment indicator */}
        {item.attachments && item.attachments.length > 0 && (
          <View style={styles.attachmentIndicator}>
            <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
              📎 {t('announcements.attachments')} ({item.attachments.length})
            </Text>
          </View>
        )}

        {/* Content preview */}
        <Text variant="bodyMedium" numberOfLines={3} style={styles.content}>
          {item.content}
        </Text>
      </Card.Content>
    </Card>
  );
};
