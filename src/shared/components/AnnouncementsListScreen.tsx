import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  ListRenderItem,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { Text, useTheme, RadioButton, Surface, Checkbox } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import i18n from '@/app/i18n/i18n';

import { Screen } from './Screen';
import { TFButton } from './TFButton';
import { AnnouncementCard } from '../../features/housingCompany/views/components/AnnouncementCard';
import { useAnnouncementsVM } from '../../features/housingCompany/viewmodels/useAnnouncementsVM';
import { Announcement } from '../../data/models/Announcement';
import { AnnouncementType } from '../../data/models/enums';
import { AnnouncementPermissions } from '../types/announcementPermissions';
import { haptic } from '../utils/haptics';
import { announcementsListScreenStyles as styles } from '../../features/housingCompany/styles/announcements.styles';

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
  housingCompanyId: string;
  onCreatePress?: () => void;
  onEditPress?: (announcement: Announcement) => void;
  onDeletePress?: (announcement: Announcement) => void;
}

/**
 * Unified announcements list screen component for displaying announcements to users of all roles.
 * Provides filtering by active/expired status and announcement type.
 * Supports cursor-based pagination with infinite scrolling via FlatList.
 * Displays create button based on user permissions.
 * Integrates with useAnnouncementsVM for state management.
 * 
 * Features:
 * - Role-based action buttons (edit/delete) conditional on permissions
 * - Filter modal with status (active/expired) and type (checkboxes) options
 * - Infinite scroll pagination triggered at list end
 * - Empty state messaging based on current filter
 * - Haptic feedback on interactions
 * - Localized date formatting
 * 
 * @component AnnouncementsListScreen
 * @param {AnnouncementsListScreenProps} props - Component props
 * @returns {JSX.Element} Announcement list view with controls
 * 
 * @example
 * <AnnouncementsListScreen
 *   permissions={getAnnouncementPermissions(userRole)}
 *   housingCompanyId="hc_123"
 *   onCreatePress={() => navigation.navigate('CreateAnnouncement')}
 *   onEditPress={(ann) => navigation.navigate('EditAnnouncement', { id: ann.id })}
 *   onDeletePress={(ann) => showDeleteConfirm(ann)}
 * />
 */
export const AnnouncementsListScreen: React.FC<AnnouncementsListScreenProps> = ({
  permissions,
  housingCompanyId,
  onCreatePress,
  onEditPress,
  onDeletePress,
}) => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const theme = useTheme();
  const [filterVisible, setFilterVisible] = useState(false);

  const {
    announcements,
    loading,
    loadingMore,
    hasMore,
    showExpired,
    selectedTypes,
    toggleShowExpired,
    toggleTypeFilter,
    deleteAnnouncement,
    loadMore,
  } = useAnnouncementsVM();

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
      // Navigate to announcement details - using any to avoid type issues with navigation
      (navigation as any).navigate('AnnouncementDetail', {
        announcementId: announcement.id,
      });
    },
    [navigation]
  );

  const locale = i18n.language;

  const renderAnnouncement: ListRenderItem<Announcement> = useCallback(
    ({ item }) => (
      <AnnouncementCard
        item={item}
        locale={locale}
        onPress={() => handleCardPress(item)}
        onEdit={
          permissions.showEditDeleteActions && onEditPress
            ? () => onEditPress(item)
            : undefined
        }
        onDelete={
          permissions.showEditDeleteActions && onDeletePress
            ? () => onDeletePress(item)
            : undefined
        }
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

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ flex: 1 }}>
      {/* Create button */}
      {permissions.showCreateButton && (
        <View style={styles.createButtonContainer}>
          <TFButton
            title={t('announcements.create')}
            onPress={() => {
              haptic.light();
              onCreatePress?.();
            }}
          />
        </View>
      )}

      {/* Expired toggle */}
      {permissions.showExpiredToggle && (
        <View style={styles.filterContainer}>
          <TFButton
            title={t('announcements.filterButton', { filter: showExpired ? t('announcements.expired') : t('announcements.active') })}
            mode="outlined"
            icon="filter-variant"
            onPress={() => setFilterVisible(true)}
            fullWidth
          />
        </View>
      )}

      {/* Loading state */}
      {loading && !announcements.length && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" />
        </View>
      )}

      {/* Announcements list */}
      {!loading && announcements.length > 0 && (
        <FlatList
          data={announcements}
          renderItem={renderAnnouncement}
          keyExtractor={(item) => item.id}
          scrollEnabled={true}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContentContainer}
          onEndReached={() => {
            if (hasMore && !loadingMore) {
              loadMore(housingCompanyId);
            }
          }}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" />
              </View>
            ) : null
          }
        />
      )}

      {/* Empty state */}
      {!loading && !announcements.length && (
        <View style={styles.emptyContainer}>
          <Text variant="bodyMedium" style={{ textAlign: 'center' }}>
            {emptyStateMessage}
          </Text>
        </View>
      )}
      <Modal
        transparent
        visible={filterVisible}
        animationType="fade"
        onRequestClose={() => setFilterVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Surface style={[styles.modalContent, { backgroundColor: theme.colors.surface }]} elevation={4}>
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {/* Status filter */}
              <Text variant="labelLarge" style={styles.modalSectionTitle}>
                {t('announcements.status')}
              </Text>
              <RadioButton.Group
                onValueChange={(value) => {
                  toggleShowExpired(value === 'expired');
                }}
                value={showExpired ? 'expired' : 'active'}
              >
                <RadioButton.Item label={t('announcements.active')} value="active" />
                <RadioButton.Item label={t('announcements.expired')} value="expired" />
              </RadioButton.Group>

              {/* Type filter */}
              <Text variant="labelLarge" style={styles.modalSectionTitle}>
                {t('announcements.typeFilter')}
              </Text>
              {Object.values(AnnouncementType).map((type) => (
                <View key={type} style={styles.checkboxItem}>
                  <Checkbox
                    status={selectedTypes.includes(type) ? 'checked' : 'unchecked'}
                    onPress={() => toggleTypeFilter(type)}
                  />
                  <Text 
                    variant="bodyMedium"
                    style={styles.checkboxLabel}
                    onPress={() => toggleTypeFilter(type)}
                  >
                    {t(`announcements.types.${type}`)}
                  </Text>
                </View>
              ))}
            </ScrollView>

            <TFButton
              title={t('common.cancel')}
              mode="contained"
              onPress={() => setFilterVisible(false)}
              fullWidth
              style={styles.modalCloseButton}
            />
          </Surface>
        </View>
      </Modal>
    </View>
    </SafeAreaView>
  );
};
