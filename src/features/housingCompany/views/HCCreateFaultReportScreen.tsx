import React, { useCallback, useEffect, useMemo } from 'react';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';

import { CreateFaultReportForm, CreateFaultReportFormData } from '@/shared/components/CreateFaultReportForm';
import { useOwnFaultReportVM } from '@/shared/viewmodels/useOwnFaultReportVM';
import type { HousingCompanyTabsParamList } from '@/app/navigation/HousingCompanyTabs';

type NavigationProp = BottomTabNavigationProp<HousingCompanyTabsParamList, 'CreateFaultReport'>;
type RouteProps = RouteProp<HousingCompanyTabsParamList, 'CreateFaultReport'>;

/**
 * Create/Edit Fault Report Screen for Housing Company users
 * Housing companies can create and manage their own fault reports
 * This is a TAB screen, similar to resident's CreateFaultReportScreen
 */
export const HCCreateFaultReportScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  
  const {
    loading,
    error,
    report,
    fetching,
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
  const isEditMode = useMemo(() => Boolean(faultReportId), [faultReportId]);

  // Load user role on mount
  useEffect(() => {
    loadUserRole();
  }, [loadUserRole]);

  // Load report data in edit mode
  useEffect(() => {
    if (faultReportId) {
      loadReport(faultReportId);
    }
  }, [faultReportId, loadReport]);

  // Reset state when focus changes
  useFocusEffect(
    useCallback(() => {
      // In edit mode, register cleanup to clear state when leaving
      if (faultReportId) {
        return () => {
          // Cleanup when leaving edit mode - clear params so new report can be created
          navigation.setParams({ faultReportId: undefined });
          reset();
        };
      }

      // Clear ViewModel for new reports
      reset();
      return undefined;
    }, [faultReportId, reset, navigation])
  );

  // Handle tab press to reset form
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      navigation.setParams({});
      clearError();
      reset();
    });

    return unsubscribe;
  }, [clearError, navigation, reset]);

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
    navigation.setParams({ faultReportId: undefined });
    navigation.navigate('ManageFaultReports');
  };

  const handleSuccess = () => {
    reset();
    navigation.setParams({ faultReportId: undefined });
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
