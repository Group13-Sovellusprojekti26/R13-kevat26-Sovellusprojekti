import { Alert } from 'react-native';
import { TFunction } from 'i18next';

/**
 * Shared announcement delete confirmation dialog
 * Used by multiple screens (AnnouncementsScreen, etc.)
 * 
 * @param t - i18next translation function
 * @param onConfirm - Callback when delete is confirmed
 */
export const showDeleteAnnouncementConfirm = (
  t: TFunction,
  onConfirm: () => void
): void => {
  Alert.alert(
    t('announcements.deleteTitle'),
    t('announcements.deleteConfirm'),
    [
      { text: t('common.cancel'), onPress: () => {}, style: 'cancel' },
      {
        text: t('common.delete'),
        onPress: onConfirm,
        style: 'destructive',
      },
    ]
  );
};
