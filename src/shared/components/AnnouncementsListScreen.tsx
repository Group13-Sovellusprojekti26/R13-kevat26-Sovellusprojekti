import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { GenericListScreen } from './GenericListScreen';
import { ListLoadingComponent } from './ListLoadingComponent';
import { TFButton } from './TFButton';
import { GenericFilterModal } from './GenericFilterModal';
import { GenericListItemCard } from './GenericListItemCard';
import { AnnouncementCard } from '../../features/housingCompany/views/components/AnnouncementCard';
import { useAnnouncementsVM } from '../../features/housingCompany/viewmodels/useAnnouncementsVM';
import { useAnnouncementLocale } from '../../features/housingCompany/hooks/useAnnouncementLocale';
import { Announcement } from '../../data/models/Announcement';
import { AnnouncementType } from '../../data/models/enums';
import { AnnouncementPermissions } from '../types/announcementPermissions';
import { haptic } from '../utils/haptics';
import { useFilterModal, createRadioFilter, createCheckboxFilter } from '../hooks/useFilterModal';
import { listScreenDefaults } from '@/shared/config/listScreenConfig';

/**
 * Props interface for AnnouncementsListScreen component.
 * Controls which UI elements and actions are displayed based on user role.
 * 
 * @interface AnnouncementsListScreenProps
 * @property {AnnouncementPermissions} permissions - Role-based permissions controlling visible actions
 * @property {string} housingCompanyId - Housing company to load announcements for
 * @property {Function} [onCreatePress] - Callback when create button is pressed
 * @property {Function} [onEditPress] - Callback when edit button is pressed on an announcement card
 * @property {Function} [onDeletePress] - Callback when delete button is pressed on an announcement card
 */
interface AnnouncementsListScreenProps {
  permissions: AnnouncementPermissions;
  housingCompanyId?: string;
  onCreatePress?: () => void;
  onEditPress?: (announcement: Announcement) => void;
  onDeletePress?: (announcement: Announcement) => void;
}

export const AnnouncementsListScreen: React.FC<AnnouncementsListScreenProps> = ({
  permissions,
  housingCompanyId,
  onCreatePress,
  onEditPress,
  onDeletePress,
}) => {
  const { t } = useTranslation();
  const locale = useAnnouncementLocale();
  const navigation = useNavigation();

  const {
    announcements,
    loading,
    loadingMore,
    refreshing,
    hasMore,
    showExpired,
    selectedTypes,
    toggleShowExpired,
    toggleTypeFilter,
    deleteAnnouncement,
    loadMore,
    refresh,
  } = useAnnouncementsVM();

  // Setup filter modal with helper functions
  const { filterVisible, openFilter, closeFilter, sections } = useFilterModal(
    useMemo(
      () => [
        createRadioFilter(
          t('announcements.status'),
          showExpired ? 'expired' : 'active',
          (value) => toggleShowExpired(value === 'expired'),
          [
            { label: t('announcements.active'), value: 'active' },
            { label: t('announcements.expired'), value: 'expired' },
          ]
        ),
        createCheckboxFilter(
          t('announcements.typeFilter'),
          selectedTypes,
          (values) => {
            Object.values(AnnouncementType).forEach((type) => {
              const isCurrentlySelected = selectedTypes.includes(type);
              const shouldBeSelected = values.includes(type);
              if (isCurrentlySelected !== shouldBeSelected) {
                toggleTypeFilter(type);
              }
            });
          },
          Object.values(AnnouncementType).map((type) => ({
            label: t(`announcements.types.${type}`),
            value: type,
          }))
        ),
      ],
      [t, showExpired, toggleShowExpired, selectedTypes, toggleTypeFilter]
    )
  );

  const handleDelete = useCallback(
    async (announcement: Announcement) => {
      try {
        await deleteAnnouncement(announcement.id);
        haptic.success();
      } catch (error) {
        console.error('Error deleting announcement:', error);
      }
    },
    [deleteAnnouncement]
  );

  const handleCardPress = useCallback(
    (announcement: Announcement) => {
      (navigation as any).navigate('AnnouncementDetail', {
        announcementId: announcement.id,
      });
    },
    [navigation]
  );

  const renderAnnouncement = useCallback(
    ({ item }: { item: Announcement }) => (
      <GenericListItemCard
        item={item}
        renderContent={(announcement) => (
          <AnnouncementCard
            item={announcement}
            locale={locale}
            onPress={() => handleCardPress(announcement)}
            onEdit={
              permissions.showEditDeleteActions && onEditPress
                ? () => onEditPress(announcement)
                : undefined
            }
            onDelete={
              permissions.showEditDeleteActions && onDeletePress
                ? () => onDeletePress(announcement)
                : undefined
            }
          />
        )}
        onPress={() => handleCardPress(item)}
      />
    ),
    [locale, permissions.showEditDeleteActions, onEditPress, onDeletePress, handleCardPress]
  );

  const emptyStateMessage = useMemo(() => {
    if (permissions.showExpiredToggle && showExpired) {
      return t('announcements.noExpiredAnnouncements');
    }
    return t('announcements.noAnnouncements');
  }, [showExpired, permissions.showExpiredToggle, t]);

  const hasHousingCompanyId = Boolean(housingCompanyId);

  return (
    <>
      <GenericListScreen
        data={announcements}
        renderItem={renderAnnouncement}
        keyExtractor={(item) => item.id}
        isLoading={loading}
        isRefreshing={refreshing}
        isLoadingMore={loadingMore}
        hasMore={hasMore}
        onRefresh={() => {
          if (!hasHousingCompanyId || !housingCompanyId) return;
          refresh(housingCompanyId);
        }}
        onEndReached={() => {
          if (!hasHousingCompanyId || !housingCompanyId) return;
          loadMore(housingCompanyId);
        }}
        config={{
          ...listScreenDefaults,
          headerComponent: permissions.showCreateButton ? (
            <TFButton
              title={t('announcements.create')}
              onPress={() => {
                haptic.light();
                onCreatePress?.();
              }}
            />
          ) : null,
          filterComponent: permissions.showExpiredToggle ? (
            <TFButton
              title={t('announcements.filterButton', {
                filter: showExpired ? t('announcements.expired') : t('announcements.active'),
              })}
              mode="outlined"
              icon="filter-variant"
              onPress={openFilter}
              fullWidth
            />
          ) : null,
          loadingComponent: <ListLoadingComponent size="small" />,
          emptyComponent: (
            <Text variant="bodyMedium" style={{ textAlign: 'center' }}>
              {emptyStateMessage}
            </Text>
          ),
        }}
      />

      <GenericFilterModal
        visible={filterVisible}
        sections={sections}
        onClose={closeFilter}
      />
    </>
  );
};
