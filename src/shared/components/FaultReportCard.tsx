import React, { useState } from 'react';
import { View, StyleSheet, Image, Pressable } from 'react-native';
import { Text, Chip, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { FaultReport } from '@/data/models/FaultReport';
import { getStatusLabelKey } from '@/shared/utils/faultReportStatusActions';
import { FaultReportStatus } from '@/data/models/enums';
import { MediaViewer } from './MediaViewer';
import { GenericContentCard } from './GenericContentCard';

type FaultReportCardProps = {
  report: FaultReport;
  onPress: () => void;
  isResident?: boolean;
  onEdit?: () => void;
};

export const FaultReportCard: React.FC<FaultReportCardProps> = ({ report, onPress, isResident, onEdit }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const thumbnailUrl = (report.imageUrls ?? [])[0];
  const canEdit =
    Boolean(isResident) &&
    (report.status === FaultReportStatus.OPEN || report.status === FaultReportStatus.CREATED);
  const [viewerVisible, setViewerVisible] = useState(false);

  return (
    <>
      <GenericContentCard
        item={report}
        onPress={onPress}
        renderHeader={(item) => (
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={styles.headerActions}>
              <Chip mode="flat" compact>
                {t(getStatusLabelKey(item.status))}
              </Chip>
              {canEdit && onEdit && (
                <Pressable
                  onPress={(event) => {
                    event.stopPropagation();
                    onEdit();
                  }}
                  hitSlop={8}
                  style={styles.editButton}
                  accessibilityLabel={t('faults.editTitle')}
                >
                  <MaterialCommunityIcons
                    name="pencil"
                    size={16}
                    color={theme.colors.primary}
                  />
                </Pressable>
              )}
            </View>
          </View>
        )}
        renderThumbnail={(item) =>
          thumbnailUrl ? (
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                setViewerVisible(true);
              }}
            >
              <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} />
            </Pressable>
          ) : (
            <View style={[styles.placeholder, { backgroundColor: theme.colors.primaryContainer }]}>
              <MaterialCommunityIcons
                name="image-off-outline"
                size={18}
                color={theme.colors.primary}
              />
            </View>
          )
        }
        renderContent={(item) => (
          <View style={styles.contentBody}>
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
            <Text style={[styles.location, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
              {item.location}
            </Text>
            {item.createdByName && (
              <View style={styles.creatorRow}>
                <MaterialCommunityIcons 
                  name="account-outline" 
                  size={12} 
                  color={theme.colors.onSurfaceVariant}
                />
                <Text style={[styles.creatorInfo, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                  {item.createdByName}
                  {item.createdByBuilding && ` • ${t('faults.building')} ${item.createdByBuilding}`}
                  {item.createdByApartment && ` • ${item.createdByApartment}`}
                </Text>
              </View>
            )}
          </View>
        )}
        renderMetadata={(item) => (
          <Text style={[styles.date, { color: theme.colors.onSurfaceVariant }]}>
            {item.createdAt.toLocaleDateString()}
          </Text>
        )}
      />
      <MediaViewer
        imageUrls={report.imageUrls ?? []}
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        initialIndex={0}
      />
    </>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  placeholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentBody: {
    flex: 1,
    gap: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 18,
  },
  location: {
    fontSize: 12,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  creatorInfo: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  date: {
    fontSize: 12,
  },
  editButton: {
    padding: 4,
    borderRadius: 12,
  },
});
