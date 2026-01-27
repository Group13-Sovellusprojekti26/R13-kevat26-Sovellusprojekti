import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import i18n from '@/app/i18n/i18n';

import { Screen } from '@/shared/components/Screen';
import { formatAnnouncementDate } from '@/shared/utils/dateFormatter';
import { useAnnouncementsVM } from '../../housingCompany/viewmodels/useAnnouncementsVM';
import { Announcement } from '@/data/models/Announcement';
import { getUserProfile } from '@/data/repositories/users.repo';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ResidentStackParamList } from '@/app/navigation/ResidentStack';
import { haptic } from '@/shared/utils/haptics';
import { AnnouncementCard } from '../../housingCompany/views/components/AnnouncementCard';

/**
 * Announcements screen for resident users
 * Read-only view of announcements for their housing company
 */
export const ResidentAnnouncementsScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ResidentStackParamList>>();
  const [housingCompanyId, setHousingCompanyId] = React.useState<string | null>(null);

  // Memoize locale to avoid recalculation on every render
  const locale = useMemo(
    () => i18n.language === 'fi' ? 'fi-FI' : 'en-US',
    [i18n.language]
  );

  const { announcements, loading, loadingMore, hasMore, error, fetchAnnouncements, loadMore } = useAnnouncementsVM();

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

  const handleViewPress = (announcement: Announcement) => {
    haptic.light();
    navigation.navigate('AnnouncementDetail' as any, { announcementId: announcement.id });
  };

  const renderAnnouncement = ({ item }: { item: Announcement }) => (
    <AnnouncementCard
      item={item}
      locale={locale}
      onPress={handleViewPress}
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
  announcementItem: {
    borderRadius: 12,
    padding: 12,
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  announcementTitleContainer: {
    flex: 1,
  },
  title: {
    marginBottom: 4,
  },
  content: {
    marginBottom: 12,
    lineHeight: 20,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  dateItem: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
