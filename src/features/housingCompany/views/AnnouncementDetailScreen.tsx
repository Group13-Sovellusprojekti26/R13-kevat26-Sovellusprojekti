import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Text, useTheme, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import i18n from '@/app/i18n/i18n';

import { Screen } from '@/shared/components/Screen';
import { formatAnnouncementDate } from '@/shared/utils/dateFormatter';
import type { HousingCompanyStackParamList } from '@/app/navigation/HousingCompanyStack';
import { Announcement } from '@/data/models/Announcement';
import { getAnnouncement, deleteAnnouncement } from '@/data/repositories/announcements.repo';
import { haptic } from '@/shared/utils/haptics';

type AnnouncementDetailScreenRouteProp = RouteProp<
  HousingCompanyStackParamList,
  'AnnouncementDetail'
>;

/**
 * Detail screen for displaying full announcement content
 */
export const AnnouncementDetailScreen: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const route = useRoute<AnnouncementDetailScreenRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<HousingCompanyStackParamList>>();
  const [announcement, setAnnouncement] = React.useState<Announcement | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Memoize locale to avoid recalculation on every render
  const locale = useMemo(
    () => i18n.language === 'fi' ? 'fi-FI' : 'en-US',
    [i18n.language]
  );

  // Fetch announcement details
  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        setLoading(true);
        const data = await getAnnouncement(route.params.announcementId);
        if (data) {
          setAnnouncement(data);
        } else {
          setError(t('announcements.notFound'));
        }
      } catch (err) {
        setError(t('common.error'));
        console.error('Failed to fetch announcement:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncement();
  }, [route.params.announcementId, t]);

  const handleEditPress = () => {
    haptic.light();
    navigation.navigate('EditAnnouncement' as any, { announcementId: announcement!.id });
  };

  const handleDeletePress = () => {
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
              await deleteAnnouncement(announcement!.id);
              haptic.success();
              navigation.goBack();
            } catch (err) {
              Alert.alert(t('common.error'), t('announcements.deleteFailed'));
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" />
        </View>
      </Screen>
    );
  }

  if (error || !announcement) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <Text variant="titleMedium">{error || t('announcements.notFound')}</Text>
        </View>
      </Screen>
    );
  }

  const createdDate = formatAnnouncementDate(announcement.createdAt, locale);
  const startDate = announcement.startDate ? formatAnnouncementDate(announcement.startDate, locale) : null;
  const endDate = formatAnnouncementDate(announcement.endDate, locale);

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleSection}>
            <Text variant="headlineSmall" style={styles.title}>
              {announcement.title}
            </Text>
            {announcement.isPinned && (
              <Text
                variant="labelMedium"
                style={{ color: theme.colors.error, marginTop: 8 }}
              >
                {t('announcements.pinned')}
              </Text>
            )}
          </View>

          {/* Action buttons */}
          <View style={styles.actionButtons}>
            <IconButton
              icon="pencil"
              size={20}
              onPress={handleEditPress}
            />
            <IconButton
              icon="delete"
              size={20}
              iconColor={theme.colors.error}
              onPress={handleDeletePress}
            />
          </View>
        </View>

        {/* Type badge */}
        <Text
          variant="labelMedium"
          style={[
            styles.type,
            { backgroundColor: theme.colors.primaryContainer, color: theme.colors.onPrimaryContainer },
          ]}
        >
          {t(`announcements.types.${announcement.type}`)}
        </Text>

        {/* Metadata section */}
        <View style={[styles.metadataSection, { backgroundColor: theme.colors.surfaceVariant }]}>
          <View style={styles.metadataRow}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('announcements.createdBy')}
            </Text>
            <Text variant="bodyMedium" style={{ fontWeight: '500' }}>
              {announcement.authorName}
            </Text>
          </View>
          <View style={styles.metadataRow}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('announcements.createdAt')}
            </Text>
            <Text variant="bodySmall" style={{ fontWeight: '500' }}>
              {createdDate}
            </Text>
          </View>
        </View>

        {/* Date range section */}
        <View style={[styles.dateSection, { backgroundColor: theme.colors.elevation.level2 }]}>
          {startDate && (
            <View style={styles.dateColumn}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {t('announcements.startDate')}
              </Text>
              <Text variant="bodyMedium" style={{ fontWeight: '500', marginTop: 4 }}>
                {startDate}
              </Text>
              {announcement.startTime && (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {announcement.startTime}
                </Text>
              )}
            </View>
          )}

          <View style={styles.dateColumn}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('announcements.endDate')}
            </Text>
            <Text variant="bodyMedium" style={{ fontWeight: '500', marginTop: 4 }}>
              {endDate}
            </Text>
            {announcement.endTime && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {announcement.endTime}
              </Text>
            )}
          </View>
        </View>

        {/* Full content */}
        <View style={styles.contentSection}>
          <Text variant="bodyLarge" style={{ lineHeight: 24 }}>
            {announcement.content}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleSection: {
    marginBottom: 12,
    flex: 1,
  },
  title: {
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  type: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  metadataSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    gap: 16,
  },
  dateColumn: {
    flex: 1,
  },
  contentSection: {
    paddingHorizontal: 4,
  },
});
