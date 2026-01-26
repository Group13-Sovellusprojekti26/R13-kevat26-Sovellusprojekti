import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Image, Pressable, Modal } from 'react-native';
import { Text, Chip, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { FaultReport } from '@/data/models/FaultReport';
import { getStatusLabelKey } from '@/shared/utils/faultReportStatusActions';
import { FaultReportStatus } from '@/data/models/enums';
import ImageViewer from 'react-native-image-zoom-viewer';

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
  const viewerImages = useMemo(() => (thumbnailUrl ? [{ url: thumbnailUrl }] : []), [thumbnailUrl]);

  return (
    <Pressable onPress={onPress} style={styles.pressable}>
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>
            {report.title}
          </Text>
          <View style={styles.headerActions}>
            <Chip mode="flat" compact>
              {t(getStatusLabelKey(report.status))}
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

        <View style={styles.contentRow}>
          {thumbnailUrl ? (
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
          )}
          <View style={styles.contentBody}>
            <Text style={styles.description} numberOfLines={2}>
              {report.description}
            </Text>
            <Text style={[styles.location, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
              {report.location}
            </Text>
          </View>
        </View>

        <Text style={[styles.date, { color: theme.colors.onSurfaceVariant }]}>
          {report.createdAt.toLocaleDateString()}
        </Text>
      </View>
      <Modal
        transparent
        visible={viewerVisible}
        animationType="fade"
        onRequestClose={() => setViewerVisible(false)}
      >
        <View style={styles.viewerContainer}>
          <ImageViewer
            imageUrls={viewerImages}
            enableSwipeDown
            onSwipeDown={() => setViewerVisible(false)}
            renderIndicator={() => null}
            saveToLocalByLongPress={false}
          />
          <Pressable style={styles.viewerClose} onPress={() => setViewerVisible(false)}>
            <Text style={styles.viewerCloseText}>✕</Text>
          </Pressable>
        </View>
      </Modal>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
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
  contentRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
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
  date: {
    fontSize: 12,
  },
  editButton: {
    padding: 4,
    borderRadius: 12,
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  viewerClose: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 8,
  },
  viewerCloseText: {
    color: 'white',
    fontSize: 24,
  },
});
