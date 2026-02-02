import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert } from 'react-native';

import { Screen } from '@/shared/components/Screen';
import { useAnnouncementsVM } from '../viewmodels/useAnnouncementsVM';
import { AnnouncementType } from '@/data/models/enums';
import { haptic } from '@/shared/utils/haptics';
import { handleAttachmentUpload } from '@/shared/utils/attachmentUpload';
import { editAnnouncementStyles as styles } from '../styles/announcements.styles';
import type { HousingCompanyStackParamList } from '@/app/navigation/HousingCompanyStack';
import { AnnouncementFormContent, AnnouncementFormData } from './components/AnnouncementFormContent';
import { announcementFormSchema, AnnouncementFormSchema } from '../schemas/announcementForm.schema';

/**
 * Screen component for creating new announcements.
 * Uses shared AnnouncementFormContent component to reduce code duplication.
 * 
 * @component CreateAnnouncementScreen
 */
export const CreateAnnouncementScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<HousingCompanyStackParamList>>();
  const [attachments, setAttachments] = React.useState<any[]>([]);

  const { createAnnouncement, loading, uploadAttachments } = useAnnouncementsVM();

  const form = useForm<AnnouncementFormSchema>({
    resolver: zodResolver(announcementFormSchema),
    defaultValues: {
      title: '',
      content: '',
      type: AnnouncementType.GENERAL,
      isPinned: false,
      startDate: undefined,
      startTime: '',
      endDate: new Date(),
      endTime: '',
    },
  });

  const onSubmit = useCallback(
    async (data: AnnouncementFormData) => {
      haptic.medium();
      try {
        // Upload attachments
        const uploadResult = await handleAttachmentUpload({
          attachments,
          uploadFn: uploadAttachments,
          t,
        });

        if (!uploadResult.success) {
          haptic.error();
          return;
        }

        // Create announcement with attachment IDs
        try {
          await createAnnouncement({
            title: data.title,
            content: data.content,
            type: data.type,
            isPinned: data.isPinned,
            startDate: data.startDate || undefined,
            startTime: data.startTime,
            endDate: data.endDate,
            endTime: data.endTime,
            attachmentIds: uploadResult.attachmentIds || [],
          });
          haptic.success();
          navigation.goBack();
        } catch (createError) {
          console.error('Announcement creation error:', createError);
          Alert.alert(t('common.error'), t('announcements.createFailed'));
          haptic.error();
        }
      } catch (error) {
        console.error('Unexpected error in onSubmit:', error);
        haptic.error();
        Alert.alert(t('common.error'), t('announcements.createFailed'));
      }
    },
    [createAnnouncement, navigation, t, uploadAttachments, attachments]
  );

  return (
    <Screen scrollable safeAreaEdges={['left', 'right', 'bottom']}>
      <AnnouncementFormContent
        form={form}
        onSubmit={onSubmit}
        loading={loading}
        isEdit={false}
        attachments={attachments}
        onAttachmentsChange={setAttachments}
        onCancel={() => navigation.goBack()}
        submitButtonLabel={t('announcements.createAnnouncement')}
      />
    </Screen>
  );
};
