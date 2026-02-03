import React, { useCallback, useEffect } from 'react';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';

import { CreateFaultReportForm, CreateFaultReportFormData } from '@/shared/components/CreateFaultReportForm';
import { useOwnFaultReportVM } from '@/shared/viewmodels/useOwnFaultReportVM';
import type { MaintenanceTabsParamList } from '@/app/navigation/MaintenanceTabs';

type NavigationProp = BottomTabNavigationProp<MaintenanceTabsParamList, 'CreateFaultReport'>;
type RouteProps = RouteProp<MaintenanceTabsParamList, 'CreateFaultReport'>;

/**
 * Create/Edit Fault Report Screen for Property Manager (Maintenance) users
 * Property managers can create and manage their own fault reports
 */
export const MaintenanceCreateFaultReportScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  
  const {
    loading,
    error,
    report,
    userRole,
    submitReport,
    loadReport,
    updateReport,
    closeReport,
    clearError,
    reset,
    loadUserRole,
  } = useOwnFaultReportVM();

  const faultReportId = route.params?.faultReportId;
  const isEditMode = Boolean(faultReportId);

  // Load user role on mount
  useEffect(() => {
    loadUserRole();
  }, [loadUserRole]);

  // Reset form when tab is pressed (to create new report)
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      // Only reset if not in edit mode (no faultReportId)
      if (!faultReportId) {
        reset();
        clearError();
      }
    });
    return unsubscribe;
  }, [navigation, faultReportId, reset, clearError]);

  // Load report data in edit mode
  useEffect(() => {
    if (faultReportId) {
      loadReport(faultReportId);
    }
  }, [faultReportId, loadReport]);

  // Reset state when leaving screen
  useFocusEffect(
    useCallback(() => {
      return () => {
        reset();
        clearError();
      };
    }, [reset, clearError])
  );

  const handleSubmit = async (data: CreateFaultReportFormData, imageDataUrls: string[]): Promise<boolean> => {
    clearError();
    return submitReport({
      ...data,
      imageUris: imageDataUrls,
    });
  };

  const handleUpdate = async (params: {
    id: string;
    description?: string;
    imageUris?: string[];
    existingImageUrls?: string[];
    allowMasterKeyAccess?: boolean;
    hasPets?: boolean;
  }): Promise<boolean> => {
    clearError();
    return updateReport(params);
  };

  const handleClose = async (id: string): Promise<boolean> => {
    clearError();
    return closeReport(id);
  };

  const handleCancel = () => {
    reset();
    navigation.navigate('ManageFaultReports');
  };

  const handleSuccess = () => {
    reset();
    navigation.navigate('ManageFaultReports');
  };

  return (
    <CreateFaultReportForm
      userRole={userRole}
      report={isEditMode ? report : null}
      isEditMode={isEditMode}
      loading={loading}
      error={error}
      onSubmit={handleSubmit}
      onUpdate={handleUpdate}
      onClose={handleClose}
      onCancel={handleCancel}
      onSuccess={handleSuccess}
      showAdditionalInfo={false}
    />
  );
};
