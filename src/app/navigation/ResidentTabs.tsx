import React from 'react';
import type { ResidentStackParamList } from './ResidentStack';
import { ResidentDashboardScreen } from '../../features/resident/views/ResidentDashboardScreen';
import { AnnouncementsScreen } from '../../features/housingCompany/views/AnnouncementsScreen';
import { FaultReportListScreen } from '../../features/resident/faultReports/views/FaultReportListScreen';
import { CreateFaultReportScreen } from '../../features/resident/faultReports/views/CreateFaultReportScreen';
import { createRoleBasedTabs, TabConfig } from '@/shared/navigation/RoleBasedTabs';

export type ResidentTabsParamList = {
  Dashboard: undefined;
  Announcements: undefined;
  FaultReports: undefined;
  CreateFaultReport: { faultReportId?: string } | undefined;
};

/**
 * Tab configuration for resident users
 */
const residentTabConfig: TabConfig<ResidentTabsParamList>[] = [
  {
    name: 'Dashboard',
    component: ResidentDashboardScreen,
    titleKey: 'resident.dashboard.title',
    tabLabelKey: 'resident.dashboard.tabLabel',
  },
  {
    name: 'Announcements',
    component: AnnouncementsScreen,
    titleKey: 'announcements.title',
    tabLabelKey: 'announcements.title',
  },
  {
    name: 'FaultReports',
    component: FaultReportListScreen,
    titleKey: 'faults.title',
    tabLabelKey: 'faults.title',
  },
  {
    name: 'CreateFaultReport',
    component: CreateFaultReportScreen,
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
 * Bottom tab navigation for resident users
 */
export const ResidentTabs = createRoleBasedTabs<ResidentStackParamList, ResidentTabsParamList>({
  tabs: residentTabConfig,
  stackParamList: {} as ResidentStackParamList,
});
