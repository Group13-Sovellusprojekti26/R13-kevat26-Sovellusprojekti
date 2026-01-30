import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AnnouncementsListScreen } from '@/shared/components/AnnouncementsListScreen';
import { getAnnouncementPermissions } from '@/shared/types/announcementPermissions';
import { Announcement } from '@/data/models/Announcement';
import { haptic } from '@/shared/utils/haptics';
import { getUserProfile } from '@/data/repositories/users.repo';
import { useAnnouncementsVM } from '../viewmodels/useAnnouncementsVM';
import type { UserRole } from '@/data/models/enums';

/**
 * Unified announcements screen for all roles.
 * Handles role-based permissions and CRUD operations.
 * 
 * Used by:
 * - Residents: Read-only view
 * - Housing Company, Property Manager, Maintenance: Full CRUD
 * - Service Company: Read-only with expired toggle
 */
export const AnnouncementsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [housingCompanyId, setHousingCompanyId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  const { fetchAnnouncements, deleteAnnouncement } = useAnnouncementsVM();

  // Load housing company ID and user role from profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await getUserProfile();
        if (profile) {
          setHousingCompanyId(profile.housingCompanyId);
          setUserRole(profile.role);
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
      }
    };
    loadProfile();
  }, []);

  // Fetch announcements on screen focus
  useFocusEffect(
    React.useCallback(() => {
      if (housingCompanyId) {
        fetchAnnouncements(housingCompanyId);
      }
    }, [housingCompanyId, fetchAnnouncements])
  );

  const handleCreatePress = () => {
    haptic.light();
    (navigation as NativeStackNavigationProp<any>).navigate('CreateAnnouncement');
  };

  const handleEditPress = (announcement: Announcement) => {
    haptic.light();
    (navigation as NativeStackNavigationProp<any>).navigate('EditAnnouncement', {
      announcementId: announcement.id,
    });
  };

  const handleDeletePress = (announcement: Announcement) => {
    Alert.alert(
      t('announcements.deleteTitle'),
      t('announcements.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          onPress: async () => {
            haptic.medium();
            try {
              await deleteAnnouncement(announcement.id);
            } catch (err) {
              console.error('Error deleting announcement:', err);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const permissions = userRole ? getAnnouncementPermissions(userRole) : getAnnouncementPermissions('resident');

  return (
    <AnnouncementsListScreen
      permissions={permissions}
      housingCompanyId={housingCompanyId || ''}
      onCreatePress={permissions.canCreate ? handleCreatePress : undefined}
      onEditPress={permissions.canEdit ? handleEditPress : undefined}
      onDeletePress={permissions.canDelete ? handleDeletePress : undefined}
    />
  );
};
