import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator, FlatList } from 'react-native';
import { Text, useTheme, Snackbar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import i18n from '@/app/i18n/i18n';

import { Screen } from '@/shared/components/Screen';
import { TFButton } from '@/shared/components/TFButton';
import { useAnnouncementsVM } from '../viewmodels/useAnnouncementsVM';
import { Announcement } from '@/data/models/Announcement';
import { haptic } from '@/shared/utils/haptics';
import type { HousingCompanyStackParamList } from '@/app/navigation/HousingCompanyStack';
import { getUserProfile } from '@/data/repositories/users.repo';
import { AnnouncementCard } from './components/AnnouncementCard';

export const ManageAnnouncementsScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<HousingCompanyStackParamList>>();
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
            } catch (err) {
              // Error is handled in ViewModel and shown in Snackbar
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const renderAnnouncementCard = ({ item }: { item: Announcement }) => (
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
          <ActivityIndicator animating size="large" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="headlineSmall">{t('announcements.title')}</Text>
        <TFButton
          title={t('announcements.createAnnouncement')}
          onPress={handleCreatePress}
        />
      </View>

      {announcements.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text variant="bodyMedium" style={{ textAlign: 'center' }}>
            {t('announcements.noAnnouncements')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={announcements}
          renderItem={renderAnnouncementCard}
          keyExtractor={(item) => item.id}
          scrollEnabled={true}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
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

      <Snackbar
        visible={!!error}
        onDismiss={clearError}
        duration={4000}
      >
        {t(error || 'common.error')}
      </Snackbar>
    </Screen>
  );
};

// ========== STYLES ==========
const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
    gap: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },
  loadMoreContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
