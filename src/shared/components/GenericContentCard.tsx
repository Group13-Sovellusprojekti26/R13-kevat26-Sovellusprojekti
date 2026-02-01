import React from 'react';
import { View, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';

/**
 * Generic content item interface that all content types should extend
 * This allows ContentCard to work with any content type
 */
export interface ContentItem {
  id: string;
  title: string;
  createdAt: Date;
}

/**
 * Props for rendering different sections of the card
 * Uses composition/render props pattern for maximum flexibility
 */
export interface ContentCardProps<T extends ContentItem> {
  /** Content data to display */
  item: T;

  /** Callback when card is pressed */
  onPress?: () => void;

  /** Render header section (title + badge/status)
   * @param item The content item
   * @returns JSX for header
   * @example
   * renderHeader={(item) => (
   *   <View style={{ flexDirection: 'row' }}>
   *     <Text>{item.title}</Text>
   *     <Chip>{item.status}</Chip>
   *   </View>
   * )}
   */
  renderHeader?: (item: T) => React.ReactNode;

  /** Render metadata section (date, author, etc)
   * @param item The content item
   * @returns JSX for metadata
   * @example
   * renderMetadata={(item) => (
   *   <Text>{item.createdAt.toLocaleDateString()}</Text>
   * )}
   */
  renderMetadata?: (item: T) => React.ReactNode;

  /** Render thumbnail/preview (optional)
   * @param item The content item
   * @returns JSX for thumbnail
   * @example
   * renderThumbnail={(item) => (
   *   <Image source={{ uri: item.imageUrl }} style={{ width: 48, height: 48 }} />
   * )}
   */
  renderThumbnail?: (item: T) => React.ReactNode;

  /** Render main content section
   * @param item The content item
   * @returns JSX for content
   * @example
   * renderContent={(item) => (
   *   <Text numberOfLines={2}>{item.content}</Text>
   * )}
   */
  renderContent: (item: T) => React.ReactNode;

  /** Render action buttons (edit, delete, etc)
   * @param item The content item
   * @returns JSX for actions
   * @example
   * renderActions={(item) => (
   *   <View style={{ flexDirection: 'row', gap: 16 }}>
   *     <Pressable onPress={() => handleEdit(item.id)}>
   *       <Text>Edit</Text>
   *     </Pressable>
   *     <Pressable onPress={() => handleDelete(item.id)}>
   *       <Text style={{ color: 'red' }}>Delete</Text>
   *     </Pressable>
   *   </View>
   * )}
   */
  renderActions?: (item: T) => React.ReactNode;

  /** Override default card container style */
  cardStyle?: ViewStyle;

  /** Override default pressable wrapper style */
  pressableStyle?: ViewStyle;
}

/**
 * Generic content card component for displaying list items.
 *
 * This component abstracts the common layout pattern used in FaultReportCard and
 * AnnouncementCard, allowing new content types to reuse the same structure without
 * duplicating code.
 *
 * Features:
 * - Flexible composition using render props pattern
 * - Type-safe with generic ContentItem interface
 * - Extensible - add custom fields to your content type
 * - Consistent styling across all content types
 * - Optional sections (thumbnail, metadata, actions)
 *
 * Common Layout (top to bottom):
 * ```
 * ┌─────────────────────────────┐
 * │ Header (title + badge)      │
 * ├─────────────────────────────┤
 * │ Metadata (date, author)     │
 * ├─────────────────────────────┤
 * │ [Thumb] Content preview     │
 * ├─────────────────────────────┤
 * │ Actions (edit, delete)      │
 * └─────────────────────────────┘
 * ```
 *
 * @component GenericContentCard
 * @template T The content item type (must extend ContentItem)
 * @param {ContentCardProps<T>} props - Component props
 * @returns {JSX.Element} Card component
 *
 * @example
 * // Usage with FaultReport
 * interface FaultReportWithUI extends FaultReport {
 *   status: string;
 * }
 *
 * <GenericContentCard<FaultReportWithUI>
 *   item={report}
 *   onPress={() => navigate('Detail', { id: report.id })}
 *   renderHeader={(item) => (
 *     <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
 *       <Text variant="titleMedium" numberOfLines={1}>{item.title}</Text>
 *       <Chip mode="flat">{item.status}</Chip>
 *     </View>
 *   )}
 *   renderMetadata={(item) => (
 *     <Text variant="bodySmall">{item.createdAt.toLocaleDateString()}</Text>
 *   )}
 *   renderThumbnail={(item) => (
 *     <Image source={{ uri: item.imageUrls[0] }} style={{ width: 48, height: 48 }} />
 *   )}
 *   renderContent={(item) => (
 *     <Text variant="bodyMedium" numberOfLines={2}>{item.description}</Text>
 *   )}
 *   renderActions={(item) => (
 *     <View style={{ flexDirection: 'row', gap: 16 }}>
 *       <Pressable onPress={() => handleEdit(item.id)}>
 *         <Text>Edit</Text>
 *       </Pressable>
 *       <Pressable onPress={() => handleDelete(item.id)}>
 *         <Text style={{ color: theme.colors.error }}>Delete</Text>
 *       </Pressable>
 *     </View>
 *   )}
 * />
 *
 * @example
 * // Usage with Announcement
 * <GenericContentCard<Announcement>
 *   item={announcement}
 *   onPress={() => navigate('Detail', { id: announcement.id })}
 *   renderHeader={(item) => (
 *     <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
 *       <Text variant="titleMedium" numberOfLines={1}>{item.title}</Text>
 *       {item.isPinned && <Icon name="pin" />}
 *     </View>
 *   )}
 *   renderMetadata={(item) => (
 *     <Text variant="bodySmall">{formatDate(item.createdAt)}</Text>
 *   )}
 *   renderContent={(item) => (
 *     <Text variant="bodyMedium" numberOfLines={3}>{item.content}</Text>
 *   )}
 *   renderActions={(item) => (
 *     <View style={{ flexDirection: 'row', gap: 16 }}>
 *       {canEdit && <Pressable onPress={() => handleEdit(item.id)}><Text>Edit</Text></Pressable>}
 *       {canDelete && <Pressable onPress={() => handleDelete(item.id)}><Text>Delete</Text></Pressable>}
 *     </View>
 *   )}
 * />
 *
 * @example
 * // Usage with new content type (Tasks)
 * interface Task extends ContentItem {
 *   title: string;
 *   description: string;
 *   dueDate: Date;
 *   priority: 'low' | 'medium' | 'high';
 *   isCompleted: boolean;
 * }
 *
 * <GenericContentCard<Task>
 *   item={task}
 *   renderHeader={(item) => (
 *     <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
 *       <Text variant="titleMedium">{item.title}</Text>
 *       <Badge color={getPriorityColor(item.priority)}>{item.priority}</Badge>
 *     </View>
 *   )}
 *   renderMetadata={(item) => (
 *     <Text>Due: {item.dueDate.toLocaleDateString()}</Text>
 *   )}
 *   renderContent={(item) => (
 *     <Text numberOfLines={2}>{item.description}</Text>
 *   )}
 *   renderActions={(item) => (
 *     <Checkbox
 *       status={item.isCompleted ? 'checked' : 'unchecked'}
 *       onPress={() => handleToggleComplete(item.id)}
 *     />
 *   )}
 * />
 */
export const GenericContentCard = React.forwardRef<
  View,
  ContentCardProps<any>
>(
  (
    {
      item,
      onPress,
      renderHeader,
      renderMetadata,
      renderThumbnail,
      renderContent,
      renderActions,
      cardStyle,
      pressableStyle,
    },
    ref
  ) => {
    const theme = useTheme();

    return (
      <Pressable
        onPress={onPress}
        style={[styles.pressable, pressableStyle]}
      >
        <View
          ref={ref}
          style={[
            styles.card,
            { backgroundColor: theme.colors.surface },
            cardStyle,
          ]}
        >
          {/* Header Section */}
          {renderHeader && (
            <View style={styles.section}>
              {renderHeader(item)}
            </View>
          )}

          {/* Metadata Section */}
          {renderMetadata && (
            <View style={styles.section}>
              {renderMetadata(item)}
            </View>
          )}

          {/* Content Section with optional thumbnail */}
          <View style={styles.section}>
            {renderThumbnail && (
              <View style={styles.thumbnailContainer}>
                {renderThumbnail(item)}
              </View>
            )}
            <View style={styles.contentWrapper}>
              {renderContent(item)}
            </View>
          </View>

          {/* Actions Section */}
          {renderActions && (
            <View style={styles.section}>
              {renderActions(item)}
            </View>
          )}
        </View>
      </Pressable>
    );
  }
);

GenericContentCard.displayName = 'GenericContentCard';

const styles = StyleSheet.create({
  pressable: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  section: {
    gap: 8,
  },
  thumbnailContainer: {
    marginRight: 12,
  },
  contentWrapper: {
    flex: 1,
  },
});
