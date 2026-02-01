import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AnnouncementsListScreen } from '@/shared/components/AnnouncementsListScreen';
import { LoadingState } from '@/shared/components/LoadingState';
import { getAnnouncementPermissions } from '@/shared/types/announcementPermissions';
import { Announcement } from '@/data/models/Announcement';
import { haptic } from '@/shared/utils/haptics';
import { useUserProfile } from '../hooks/useUserProfile';
import { useAnnouncementsVM } from '../viewmodels/useAnnouncementsVM';
import { showDeleteAnnouncementConfirm } from '../utils/announcement.utils';

/**
 * Unified announcements screen for all roles.
 * Delegates role-based logic to getAnnouncementPermissions.
 * 
 * Used by:
 * - Residents: Read-only view
 * - Housing Company, Property Manager, Maintenance: Full CRUD
 * - Service Company: Read-only with expired toggle
 */
export const AnnouncementsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { loading, profile, error } = useUserProfile();
  const { fetchAnnouncements, deleteAnnouncement } = useAnnouncementsVM();

  // Fetch announcements on screen focus
  useFocusEffect(
    useCallback(() => {
      if (profile?.housingCompanyId) {
        fetchAnnouncements(profile.housingCompanyId);
      }
    }, [profile?.housingCompanyId, fetchAnnouncements])
  );

  const handleDeletePress = (announcement: Announcement) => {
    showDeleteAnnouncementConfirm(t, async () => {
      haptic.medium();
      try {
        await deleteAnnouncement(announcement.id);
      } catch (err) {
        console.error('Error deleting announcement:', err);
      }
    });
  };

  if (loading || error) {
    return (
      <LoadingState
        isLoading={loading}
        error={error}
      >
        <></>
      </LoadingState>
    );
  }

  if (!profile) {
    return (
      <LoadingState
        isLoading={false}
        error={t('common.error')}
      >
        <></>
      </LoadingState>
    );
  }

  const permissions = getAnnouncementPermissions(profile.role);

  return (
    <AnnouncementsListScreen
      permissions={permissions}
      housingCompanyId={profile.housingCompanyId}
      onCreatePress={() => {
        haptic.light();
        (navigation as NativeStackNavigationProp<any>).navigate('CreateAnnouncement');
      }}
      onEditPress={(ann) => {
        haptic.light();
        (navigation as NativeStackNavigationProp<any>).navigate('EditAnnouncement', { announcementId: ann.id });
      }}
      onDeletePress={handleDeletePress}
    />
  );
};
