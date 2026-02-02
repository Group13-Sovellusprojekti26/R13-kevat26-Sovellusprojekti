import React, { useEffect, useState } from 'react';
import { View, ScrollView, Linking, TouchableOpacity } from 'react-native';
import { Text, useTheme, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen } from '@/shared/components/Screen';
import { LoadingState } from '@/shared/components/LoadingState';
import { getAnnouncementPermissions } from '@/shared/types/announcementPermissions';
import { useUserProfile } from '../hooks/useUserProfile';
import type { HousingCompanyStackParamList } from '@/app/navigation/HousingCompanyStack';
import type { MaintenanceStackParamList } from '@/app/navigation/MaintenanceStack';
import { Announcement } from '@/data/models/Announcement';
import { getAnnouncement, deleteAnnouncement } from '@/data/repositories/announcements.repo';
import { haptic } from '@/shared/utils/haptics';
import { announcementDetailStyles as styles } from '../styles/announcements.styles';
import { showDeleteAnnouncementConfirm } from '../utils/announcement.utils';
import { useAnnouncementLocale } from '../hooks/useAnnouncementLocale';
import { AnnouncementPublisherInfo } from './components/AnnouncementPublisherInfo';
import { AnnouncementDateRange } from './components/AnnouncementDateRange';
import { AnnouncementAttachments } from './components/AnnouncementAttachments';

type AnnouncementDetailScreenRouteProp = RouteProp<
  HousingCompanyStackParamList | MaintenanceStackParamList,
  'AnnouncementDetail'
>;

/**
 * Screen component for displaying full announcement details.
 * Fetches announcement by ID from route params and displays read-only content.
 * Shows all announcement information including dates, times, publisher, type, and full text.
 * Provides edit and delete action buttons (conditionally visible based on permissions).
 * Works with both HousingCompany and Maintenance stacks.
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
  const navigation = useNavigation<NativeStackNavigationProp<HousingCompanyStackParamList | MaintenanceStackParamList>>();
  const [announcement, setAnnouncement] = React.useState<Announcement | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { profile } = useUserProfile();

  // Get locale from custom hook
  const locale = useAnnouncementLocale();

  // Get permissions based on user role
  const permissions = profile ? getAnnouncementPermissions(profile.role) : null;

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
    showDeleteAnnouncementConfirm(t, async () => {
      haptic.medium();
      try {
        await deleteAnnouncement(announcement!.id);
        haptic.success();
        navigation.goBack();
      } catch (err) {
        haptic.error();
        // Error handling is in the shared function
      }
    });
  };

  if (loading) {
    return (
      <LoadingState
        isLoading={true}
        error={null}
      >
        <></>
      </LoadingState>
    );
  }

  if (error || !announcement) {
    return (
      <LoadingState
        isLoading={false}
        error={error || t('announcements.notFound')}
      >
        <></>
      </LoadingState>
    );
  }

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

          {/* Action buttons - only show if user has edit/delete permissions */}
          {permissions && (permissions.canEdit || permissions.canDelete) && (
            <View style={styles.actionButtons}>
              {permissions.canEdit && (
                <IconButton
                  icon="pencil"
                  size={20}
                  onPress={handleEditPress}
                />
              )}
              {permissions.canDelete && (
                <IconButton
                  icon="delete"
                  size={20}
                  iconColor={theme.colors.error}
                  onPress={handleDeletePress}
                />
              )}
            </View>
          )}
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
        <AnnouncementPublisherInfo
          announcement={announcement}
          locale={locale}
        />

        {/* Date range section - only show if start or end date exists */}
        <AnnouncementDateRange
          announcement={announcement}
          locale={locale}
        />

        {/* Full content */}
        <View style={styles.contentSection}>
          <Text variant="bodyLarge" style={{ lineHeight: 24 }}>
            {announcement.content}
          </Text>
        </View>

        {/* Attachments */}
        <AnnouncementAttachments
          announcement={announcement}
          locale={locale}
        />
    </Screen>
  );
}
