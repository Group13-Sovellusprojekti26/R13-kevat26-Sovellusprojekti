import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, ActivityIndicator, Alert, Linking, TouchableOpacity } from 'react-native';
import { Text, useTheme, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import i18n from '@/app/i18n/i18n';

import { Screen } from '@/shared/components/Screen';
import { formatAnnouncementDate } from '@/shared/utils/dateFormatter';
import type { HousingCompanyStackParamList } from '@/app/navigation/HousingCompanyStack';
import { Announcement } from '@/data/models/Announcement';
import { getAnnouncement, deleteAnnouncement } from '@/data/repositories/announcements.repo';
import { haptic } from '@/shared/utils/haptics';
import { announcementDetailStyles as styles } from '../styles/announcements.styles';

type AnnouncementDetailScreenRouteProp = RouteProp<
  HousingCompanyStackParamList,
  'AnnouncementDetail'
>;

/**
 * Screen component for displaying full announcement details.
 * Fetches announcement by ID from route params and displays read-only content.
 * Shows all announcement information including dates, times, publisher, type, and full text.
 * Provides edit and delete action buttons (conditionally visible based on permissions).
 * 
 * Responsibilities:
 * - Fetch announcement data from Firestore by ID
 * - Display loading state during fetch
 * - Handle fetch errors with user-friendly messages
 * - Format dates/times based on locale
 * - Show full announcement content
 * - Provide edit and delete actions
 *
 * Features:
 * - Loading spinner during fetch
 * - Error state display with fallback UI
 * - Full announcement content display (not truncated like card)
 * - Publisher information (author, creation/update dates)
 * - Announcement type badge
 * - Display date range with times
 * - Edit button navigates to EditAnnouncementScreen
 * - Delete button with confirmation alert
 * - Haptic feedback on interactions
 * - Localized date formatting
 *
 * @component AnnouncementDetailScreen
 * @returns {JSX.Element} Full announcement detail view
 *
 * @example
 * // Navigate with announcement ID
 * navigation.navigate('AnnouncementDetail', { announcementId: 'ann_123' })
 */
export const AnnouncementDetailScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const route = useRoute<AnnouncementDetailScreenRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<HousingCompanyStackParamList>>();
  const [announcement, setAnnouncement] = React.useState<Announcement | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Memoize locale to avoid recalculation on every render
  const locale = useMemo(
    () => i18n.language === 'fi' ? 'fi-FI' : 'en-US',
    [i18n.language]
  );

  // Fetch announcement details
  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        setLoading(true);
        const data = await getAnnouncement(route.params.announcementId);
        if (data) {
          setAnnouncement(data);
        } else {
          setError(t('announcements.notFound'));
        }
      } catch (err) {
        setError(t('common.error'));
        console.error('Failed to fetch announcement:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncement();
  }, [route.params.announcementId, t]);

  const handleEditPress = () => {
    haptic.light();
    navigation.navigate('EditAnnouncement' as any, { announcementId: announcement!.id });
  };

  const handleDeletePress = () => {
    Alert.alert(
      t('announcements.deleteTitle'),
      t('announcements.deleteConfirm'),
      [
        { text: t('common.cancel'), onPress: () => {}, style: 'cancel' },
        {
          text: t('common.delete'),
          onPress: async () => {
            haptic.medium();
            try {
              await deleteAnnouncement(announcement!.id);
              haptic.success();
              navigation.goBack();
            } catch (err) {
              Alert.alert(t('common.error'), t('announcements.deleteFailed'));
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" />
        </View>
      </Screen>
    );
  }

  if (error || !announcement) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <Text variant="titleMedium">{error || t('announcements.notFound')}</Text>
        </View>
      </Screen>
    );
  }

  const createdDate = formatAnnouncementDate(announcement.createdAt, locale);
  const updatedDate = formatAnnouncementDate(announcement.updatedAt, locale);
  const startDate = announcement.startDate ? formatAnnouncementDate(announcement.startDate, locale) : null;
  const endDate = formatAnnouncementDate(announcement.endDate, locale);

  console.log('AnnouncementDetailScreen - announcement data:', {
    id: announcement.id,
    hasAttachments: !!announcement.attachments,
    attachmentsCount: announcement.attachments?.length || 0,
    attachments: announcement.attachments,
  });

  return (
    <Screen scrollable safeAreaEdges={['left', 'right', 'bottom']}>
      {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleSection}>
            <Text variant="headlineSmall" style={styles.title}>
              {announcement.title}
            </Text>
            {announcement.isPinned && (
              <Text
                variant="labelMedium"
                style={{ color: theme.colors.error, marginTop: 8 }}
              >
                {t('announcements.pinned')}
              </Text>
            )}
          </View>

          {/* Action buttons */}
          <View style={styles.actionButtons}>
            <IconButton
              icon="pencil"
              size={20}
              onPress={handleEditPress}
            />
            <IconButton
              icon="delete"
              size={20}
              iconColor={theme.colors.error}
              onPress={handleDeletePress}
            />
          </View>
        </View>

        {/* Type badge */}
        <Text
          variant="labelMedium"
          style={[
            styles.type,
            { backgroundColor: theme.colors.primaryContainer, color: theme.colors.onPrimaryContainer },
          ]}
        >
          {t(`announcements.types.${announcement.type}`)}
        </Text>

        {/* Metadata section */}
        <View style={[styles.metadataSection, { backgroundColor: theme.colors.surfaceVariant }]}>
          <View style={styles.metadataRow}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('announcements.createdBy')}
            </Text>
            <Text variant="bodyMedium" style={{ fontWeight: '500' }}>
              {announcement.authorName}
            </Text>
          </View>
          <View style={styles.metadataRow}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('announcements.createdAt')}
            </Text>
            <Text variant="bodySmall" style={{ fontWeight: '500' }}>
              {createdDate}
            </Text>
          </View>
          
          {/* Show updated info if announcement was edited */}
          {announcement.updatedByName && announcement.authorName !== announcement.updatedByName && (
            <>
              <View style={styles.metadataRow}>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {t('announcements.lastModifiedBy')}
                </Text>
                <Text variant="bodyMedium" style={{ fontWeight: '500' }}>
                  {announcement.updatedByName}
                </Text>
              </View>
              <View style={styles.metadataRow}>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {t('announcements.lastModifiedAt')}
                </Text>
                <Text variant="bodySmall" style={{ fontWeight: '500' }}>
                  {updatedDate}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Date range section - only show if start or end date exists */}
        {(startDate || endDate) && (
          <View style={[styles.dateSection, { backgroundColor: theme.colors.elevation.level2 }]}>
            {startDate && (
              <View style={styles.dateColumn}>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {t('announcements.startDate')}
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
                  {t('announcements.endDate')}
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
        )}

        {/* Full content */}
        <View style={styles.contentSection}>
          <Text variant="bodyLarge" style={{ lineHeight: 24 }}>
            {announcement.content}
          </Text>
        </View>

        {/* Attachments section */}
        {announcement.attachments && announcement.attachments.length > 0 && (
          <View style={[styles.attachmentsSection, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text variant="titleSmall" style={{ marginBottom: 12 }}>
              📎 {t('announcements.attachments')} ({announcement.attachments.length})
            </Text>
            {announcement.attachments.map((attachment: any, index: number) => {
              console.log('Rendering attachment:', { index, attachment });
              return (
                <TouchableOpacity
                  key={`${attachment.id}-${index}`}
                  onPress={() => {
                    if (attachment.downloadUrl) {
                      Linking.openURL(attachment.downloadUrl);
                    }
                  }}
                  style={[
                    styles.attachmentItem,
                    { backgroundColor: theme.colors.surface },
                  ]}
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
              );
            })}
          </View>
        )}
    </Screen>
  );
}
