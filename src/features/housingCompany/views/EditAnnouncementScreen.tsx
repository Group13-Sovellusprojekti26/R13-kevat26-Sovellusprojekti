import React, { useCallback, useEffect, useState } from 'react';
import { View, Alert } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { LoadingState } from '@/shared/components/LoadingState';
import { Screen } from '@/shared/components/Screen';
import { TFButton } from '@/shared/components/TFButton';
import { useAnnouncementsVM } from '../viewmodels/useAnnouncementsVM';
import { Announcement } from '@/data/models/Announcement';
import { getAnnouncementById } from '@/data/repositories/announcements.repo';
import { haptic } from '@/shared/utils/haptics';
import { editAnnouncementStyles as styles } from '../styles/announcements.styles';
import type { HousingCompanyStackParamList } from '@/app/navigation/HousingCompanyStack';
import { AnnouncementFormContent, AnnouncementFormData } from './components/AnnouncementFormContent';
import { announcementFormSchema, AnnouncementFormSchema } from '../schemas/announcementForm.schema';
import { showDeleteAnnouncementConfirm } from '../utils/announcement.utils';

type EditAnnouncementRoute = RouteProp<HousingCompanyStackParamList, 'EditAnnouncement'>;

/**
 * Screen component for editing existing announcements.
 * Loads announcement data and populates form with current values.
 * Uses shared AnnouncementFormContent component to reduce code duplication.
 * 
 * Responsibilities:
 * - Fetch announcement by ID from route params
 * - Display loading state while fetching
 * - Populate form with current announcement data
 * - Validate changes before submission
 * - Handle delete with confirmation alert
 * - Auto-refresh list after update
 *
 * @component EditAnnouncementScreen
 * @returns {JSX.Element} Form screen for editing announcements
 *
 * @example
 * // Navigate with announcement ID
 * navigation.navigate('EditAnnouncement', { announcementId: 'ann_123' })
 */
export const EditAnnouncementScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<HousingCompanyStackParamList>>();
  const route = useRoute<EditAnnouncementRoute>();

  const { announcementId } = route.params;

  const { updateAnnouncement, deleteAnnouncement, loading, error, uploadAttachments, updateAttachments, getRemoveAttachmentIds } = useAnnouncementsVM();

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loadingAnnouncement, setLoadingAnnouncement] = useState(true);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);

  const form = useForm<AnnouncementFormSchema>({
    resolver: zodResolver(announcementFormSchema),
  });

  // Load announcement data
  useEffect(() => {
    const loadAnnouncement = async () => {
      try {
        const data = await getAnnouncementById(announcementId);
        if (data) {
          setAnnouncement(data);
          setExistingAttachments(data.attachments || []);
          form.reset({
            title: data.title,
            content: data.content,
            type: data.type,
            isPinned: data.isPinned,
            startDate: data.startDate,
            startTime: data.startTime,
            endDate: data.endDate,
            endTime: data.endTime,
          });
        } else {
          Alert.alert(t('common.error'), t('announcements.fetchFailed'));
          navigation.goBack();
        }
      } catch (err) {
        Alert.alert(t('common.error'), t('announcements.fetchFailed'));
        navigation.goBack();
      } finally {
        setLoadingAnnouncement(false);
      }
    };

    loadAnnouncement();
  }, [announcementId, form, navigation, t]);

  // Handle concurrent deletion error
  useEffect(() => {
    if (error === 'announcements.deletedByOther') {
      Alert.alert(
        t('announcements.deleteTitle'),
        t('announcements.deletedByOther'),
        [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
      );
    }
  }, [error, t, navigation]);

  const onSubmit = useCallback(
    async (data: AnnouncementFormData) => {
      haptic.medium();
      try {
        // Upload new attachments
        const newAttachmentIds = await uploadAttachments(attachments);

        // Step 1: Update basic announcement fields
        await updateAnnouncement(announcementId, {
          title: data.title,
          content: data.content,
          type: data.type,
          isPinned: data.isPinned,
          startDate: data.startDate,
          startTime: data.startTime,
          endDate: data.endDate,
          endTime: data.endTime,
        });

        // Step 2: Update attachments if changed
        const remainingAttachmentIds = existingAttachments.map(att => att.id);
        const allAttachmentIds = [...remainingAttachmentIds, ...newAttachmentIds];
        const removedAttachmentIds = getRemoveAttachmentIds(
          announcement?.attachments || [],
          existingAttachments
        );

        if (newAttachmentIds.length > 0 || removedAttachmentIds.length > 0) {
          await updateAttachments(announcementId, allAttachmentIds, removedAttachmentIds);
        }

        haptic.success();
        navigation.goBack();
      } catch (err: any) {
        haptic.error();
        if (err?.code !== 'functions/not-found') {
          Alert.alert(t('common.error'), t('announcements.updateFailed'));
        }
      }
    },
    [updateAnnouncement, announcementId, navigation, t, attachments, existingAttachments, announcement, uploadAttachments, updateAttachments, getRemoveAttachmentIds]
  );

  const handleDeletePress = () => {
    showDeleteAnnouncementConfirm(t, async () => {
      haptic.medium();
      try {
        await deleteAnnouncement(announcementId);
        haptic.success();
        navigation.goBack();
      } catch (err) {
        haptic.error();
        // Error is handled in ViewModel
      }
    });
  };

  const announcementLoadError = !announcement ? t('announcements.fetchFailed') : null;

  if (loadingAnnouncement || announcementLoadError) {
    return (
      <LoadingState
        isLoading={loadingAnnouncement}
        error={announcementLoadError}
      >
        <></>
      </LoadingState>
    );
  }

  return (
    <Screen scrollable safeAreaEdges={['left', 'right', 'bottom']}>
      <AnnouncementFormContent
        form={form}
        onSubmit={onSubmit}
        loading={loading}
        isEdit={true}
        attachments={attachments}
        onAttachmentsChange={setAttachments}
        existingAttachments={existingAttachments}
        onExistingAttachmentsChange={setExistingAttachments}
        onCancel={() => navigation.goBack()}
        submitButtonLabel={t('common.save')}
        metadata={{
          createdAt: announcement.createdAt,
          updatedAt: announcement.updatedAt,
        }}
      />

      {/* Delete Button */}
      <TFButton
        title={t('announcements.deleteTitle')}
        onPress={handleDeletePress}
        mode="outlined"
        disabled={loading}
        style={styles.deleteButton}
      />
    </Screen>
  );
};
