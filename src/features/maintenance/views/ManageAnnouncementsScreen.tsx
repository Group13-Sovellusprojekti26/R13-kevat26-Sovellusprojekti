import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator, FlatList } from 'react-native';
import { Text, useTheme, Snackbar, IconButton, Card } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import i18n from '@/app/i18n/i18n';

import { Screen } from '@/shared/components/Screen';
import { TFButton } from '@/shared/components/TFButton';
import { useAnnouncementsVM } from '../../housingCompany/viewmodels/useAnnouncementsVM';
import { Announcement } from '@/data/models/Announcement';
import { haptic } from '@/shared/utils/haptics';
import type { MaintenanceStackParamList } from '@/app/navigation/MaintenanceStack';
import { getUserProfile } from '@/data/repositories/users.repo';
import { AnnouncementCard } from '../../housingCompany/views/components/AnnouncementCard';

/**
 * Manage Announcements Screen for maintenance users
 */
export const ManageAnnouncementsScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<MaintenanceStackParamList>>();
  const [housingCompanyId, setHousingCompanyId] = React.useState<string | null>(null);
  
  // Memoize locale to avoid recalculation on every render
  const locale = useMemo(
    () => i18n.language === 'fi' ? 'fi-FI' : 'en-US',
    [i18n.language]
  );
  
  // VM state
  const {
    announcements,
    loading,
    loadingMore,
    hasMore,
    error,
    fetchAnnouncements,
    loadMore,
    deleteAnnouncement,
    clearError,
  } = useAnnouncementsVM();

  // Load housingCompanyId from user profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await getUserProfile();
        if (profile) {
          setHousingCompanyId(profile.housingCompanyId);
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

  const handleEndReached = () => {
    if (housingCompanyId && hasMore && !loadingMore && !loading) {
      loadMore(housingCompanyId);
    }
  };

  const handleCreatePress = () => {
    haptic.light();
    navigation.navigate('CreateAnnouncement' as any);
  };

  const handleViewPress = (announcement: Announcement) => {
    haptic.light();
    navigation.navigate('AnnouncementDetail' as any, { announcementId: announcement.id });
  };

  const handleEditPress = (announcement: Announcement) => {
    haptic.light();
    navigation.navigate('EditAnnouncement' as any, { announcementId: announcement.id });
  };

  const handleDeletePress = (announcement: Announcement) => {
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
              await deleteAnnouncement(announcement.id);
              haptic.success();
            } catch (error) {
              haptic.error();
              Alert.alert(t('common.error'), t('announcements.deleteFailed'));
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const renderAnnouncement = ({ item }: { item: Announcement }) => (
    <AnnouncementCard
      item={item}
      locale={locale}
      onPress={handleViewPress}
      onEdit={handleEditPress}
      onDelete={handleDeletePress}
    />
  );

  if (loading && announcements.length === 0) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.headerContainer}>
        <Text variant="headlineSmall">{t('announcements.title')}</Text>
        <TFButton
          title={t('announcements.createTitle')}
          onPress={handleCreatePress}
          style={styles.createButton}
        />
      </View>

      {error && (
        <Snackbar
          visible={!!error}
          onDismiss={clearError}
          duration={5000}
          style={{ backgroundColor: theme.colors.error }}
        >
          {t(error as any)}
        </Snackbar>
      )}

      {announcements.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {t('announcements.noAnnouncements')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={announcements}
          renderItem={renderAnnouncement}
          keyExtractor={item => item.id}
          scrollEnabled={true}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" />
              </View>
            ) : null
          }
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  createButton: {
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  separator: {
    height: 12,
  },
  loadMoreContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
