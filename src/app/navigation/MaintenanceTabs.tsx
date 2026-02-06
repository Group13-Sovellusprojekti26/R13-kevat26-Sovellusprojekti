import React from 'react';
import type { MaintenanceStackParamList } from './MaintenanceStack';
import { MaintenanceDashboardScreen } from '@/features/maintenance/views/MaintenanceDashboardScreen';
import { FaultReportListScreen } from '@/shared/components/FaultReportListScreen';
import { MaintenanceCreateFaultReportScreen } from '@/features/maintenance/views/MaintenanceCreateFaultReportScreen';
import { AnnouncementsScreen } from '@/features/housingCompany/views/AnnouncementsScreen';
import { createRoleBasedTabs, TabConfig } from '@/shared/navigation/RoleBasedTabs';

export type MaintenanceTabsParamList = {
  Dashboard: undefined;
  Announcements: undefined;
  ManageFaultReports: undefined;
  CreateFaultReport: { faultReportId?: string } | undefined;
};

/**
 * Tab configuration for maintenance/property manager users
 * Order: Dashboard -> Announcements -> Fault Reports (all, can edit own) -> Create Fault Report
 */
const maintenanceTabConfig: TabConfig<MaintenanceTabsParamList>[] = [
  {
    name: 'Dashboard',
    component: MaintenanceDashboardScreen,
    titleKey: 'maintenance.dashboard.title',
    tabLabelKey: 'maintenance.dashboard.tabLabel',
  },
  {
    name: 'Announcements',
    children: () => <AnnouncementsScreen />,
    titleKey: 'announcements.title',
    tabLabelKey: 'announcements.title',
  },
  {
    name: 'ManageFaultReports',
    children: () => <FaultReportListScreen detailScreenName="FaultReportDetails" canEditOwnReports />,
    titleKey: 'faults.title',
    tabLabelKey: 'faults.title',
  },
  {
    name: 'CreateFaultReport',
    component: MaintenanceCreateFaultReportScreen,
    titleKey: 'faults.createTitle',
    tabLabelKey: 'faults.createTitle',
    dynamicTitle: (params, t) => {
      const faultReportId = params?.faultReportId;
      const isEditMode = Boolean(faultReportId);
      return isEditMode ? t('faults.editTitle') : t('faults.createTitle');
    },
  },
];

/**
 * Bottom tab navigation for maintenance and property manager users
 */
export const MaintenanceTabs = createRoleBasedTabs<MaintenanceStackParamList, MaintenanceTabsParamList>({
  tabs: maintenanceTabConfig,
  stackParamList: {} as MaintenanceStackParamList,
});
