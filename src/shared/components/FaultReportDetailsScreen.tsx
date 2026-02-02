import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { Text, Chip, ActivityIndicator } from 'react-native-paper';
import { useFocusEffect, useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/shared/components/Screen';
import { TFButton } from '@/shared/components/TFButton';
import { StatusActionBar } from '@/shared/components/StatusActionBar';
import { MediaViewer } from '@/shared/components/MediaViewer';
import { FaultReportStatus, UrgencyLevel, UserRole } from '@/data/models/enums';
import { useFaultReportDetailsVM } from '@/shared/viewmodels/useFaultReportDetailsVM';
import { useCompanyFaultReportsVM } from '@/shared/viewmodels/useCompanyFaultReportsVM';
import { getStatusLabelKey, StatusActionDefinition } from '@/shared/utils/faultReportStatusActions';
import { useFaultReportListVM } from '@/features/resident/faultReports/viewmodels/useFaultReportListVM';
import { getCurrentUser } from '@/features/auth/services/auth.service';

type FaultReportDetailsRouteParams = {
  FaultReportDetails: { faultReportId: string };
};

const getUrgencyLabel = (urgency: UrgencyLevel, t: (key: string) => string): string => {
  switch (urgency) {
    case UrgencyLevel.LOW:
      return t('faults.urgencyLow');
    case UrgencyLevel.MEDIUM:
      return t('faults.urgencyMedium');
    case UrgencyLevel.HIGH:
      return t('faults.urgencyHigh');
    case UrgencyLevel.URGENT:
      return t('faults.urgencyUrgent');
    default:
      return urgency;
  }
};

export const FaultReportDetailsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<FaultReportDetailsRouteParams, 'FaultReportDetails'>>();
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const {
    report,
    loading,
    error,
    loadReport,
    loadUserRole,
    updateStatus,
    statusActions,
    userRole,
    clearError,
  } = useFaultReportDetailsVM();
  const refreshReports = useCompanyFaultReportsVM(state => state.refresh);
  const refreshResidentReports = useFaultReportListVM(state => state.refresh);
  const canManageWorkflow = userRole === UserRole.SERVICE_COMPANY;
  const shouldRenderActionBar = canManageWorkflow;
  
  // Check if current user can edit this report
  const currentUser = getCurrentUser();
  const isResident = userRole === UserRole.RESIDENT;
  const isOwnReport = report?.createdByUserId === currentUser?.uid;
  const isEditable = isResident && isOwnReport && 
    (report?.status === FaultReportStatus.OPEN || report?.status === FaultReportStatus.CREATED);
  const shouldShowEditButton = isEditable;
  const inProgressExtraActions = useMemo<StatusActionDefinition[]>(() => {
    if (
      !canManageWorkflow ||
      (report?.status !== FaultReportStatus.IN_PROGRESS &&
        report?.status !== FaultReportStatus.INCOMPLETE)
    ) {
      return [];
    }

    const extra: StatusActionDefinition[] = [
      {
        status: FaultReportStatus.COMPLETED,
        labelKey: 'faults.statusActions.markCompleted',
        mode: 'contained',
      },
      {
        status: FaultReportStatus.WAITING,
        labelKey: 'faults.statusActions.moveToQueue',
        mode: 'outlined',
      },
      {
        status: FaultReportStatus.CANCELLED,
        labelKey: 'faults.statusActions.cancel',
        mode: 'outlined',
        destructive: true,
        confirmTitleKey: 'faults.statusConfirm.title',
        confirmBodyKey: 'faults.statusConfirm.cancelBody',
      },
    ];

    const existingStatuses = new Set(statusActions.map(action => action.status));
    return extra.filter(action => !existingStatuses.has(action.status));
  }, [canManageWorkflow, report?.status, statusActions]);

  const resolvedStatusActions = useMemo(
    () => [...statusActions, ...inProgressExtraActions],
    [inProgressExtraActions, statusActions]
  );

  const faultReportId = route.params?.faultReportId;

  useFocusEffect(
    useCallback(() => {
      if (!faultReportId) {
        return;
      }
      loadReport(faultReportId);
      loadUserRole();
    }, [faultReportId, loadReport, loadUserRole])
  );

  if (loading && !report) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <ActivityIndicator animating />
        </View>
      </Screen>
    );
  }

  if (!report) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error ?? t('common.error')}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}
        >
          <View style={styles.headerRow}>
            <Text variant="headlineSmall" style={styles.title}>
              {report.title}
            </Text>
            <Chip mode="flat" compact>
              {t(getStatusLabelKey(report.status))}
            </Chip>
          </View>

          <Text style={styles.sectionLabel}>{t('faults.description')}</Text>
          <Text style={styles.sectionText}>{report.description}</Text>

          <Text style={styles.sectionLabel}>{t('faults.location')}</Text>
          <Text style={styles.sectionText}>{report.location}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.sectionLabel}>{t('faults.urgency')}</Text>
              <Chip mode="outlined" compact>
                {getUrgencyLabel(report.urgency, t)}
              </Chip>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.sectionLabel}>{t('faults.createdAt')}</Text>
              <Text style={styles.sectionText}>{report.createdAt.toLocaleDateString()}</Text>
            </View>
          </View>

          {(report.allowMasterKeyAccess !== undefined || report.hasPets !== undefined) && (
            <View style={styles.additionalInfoSection}>
              <Text style={styles.sectionLabel}>{t('faults.additionalInfoTitle')}</Text>
              {report.allowMasterKeyAccess !== undefined && (
                <Text style={styles.sectionText}>
                  {`🔑 ${t('faults.allowMasterKeyAccess')}: ${t(
                    report.allowMasterKeyAccess ? 'faults.booleanYes' : 'faults.booleanNo'
                  )}`}
                </Text>
              )}
              {report.hasPets !== undefined && (
                <Text style={styles.sectionText}>
                  {`🐾 ${t('faults.hasPets')}: ${t(
                    report.hasPets ? 'faults.booleanYes' : 'faults.booleanNo'
                  )}`}
                </Text>
              )}
            </View>
          )}

          {(report.imageUrls ?? []).length > 0 && (
            <View style={styles.imageSection}>
              <Text style={styles.sectionLabel}>{t('faults.images')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {(report.imageUrls ?? []).map((uri, index) => (
                  <Pressable
                    key={`${uri}-${index}`}
                    onPress={() => {
                      setViewerIndex(index);
                      setViewerVisible(true);
                    }}
                  >
                    <Image source={{ uri }} style={styles.imagePreview} />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {shouldShowEditButton && (
            <View style={styles.editButtonContainer}>
              <TFButton
                title={t('faults.editTitle')}
                onPress={() => {
                  // Navigate to CreateFaultReport tab with edit params
                  // Using nested navigation structure: Stack -> Tabs -> CreateFaultReport
                  navigation.navigate('Tabs', {
                    screen: 'CreateFaultReport',
                    params: { faultReportId: report.id }
                  });
                }}
                mode="outlined"
                icon="pencil"
              />
            </View>
          )}

          {error && (
            <Text style={styles.errorText} onPress={clearError}>
              {error}
            </Text>
          )}
        </ScrollView>

        {shouldRenderActionBar && (
          <View style={styles.actionBar}>
            <StatusActionBar
              actions={resolvedStatusActions}
              onAction={async status => updateStatus(report.id, status)}
              onStatusChanged={() => {
                refreshReports();
              }}
            />
          </View>
        )}
      </View>
      <MediaViewer
        imageUrls={report?.imageUrls ?? []}
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        initialIndex={viewerIndex}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  title: {
    flex: 1,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionText: {
    fontSize: 15,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  metaItem: {
    flex: 1,
  },
  imageSection: {
    marginBottom: 12,
  },
  editButtonContainer: {
    marginTop: 16,
    marginBottom: 12,
  },
  additionalInfoSection: {
    marginBottom: 12,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 8,
  },
  errorText: {
    color: '#D32F2F',
    marginBottom: 8,
    textAlign: 'center',
  },
  actionBar: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});
