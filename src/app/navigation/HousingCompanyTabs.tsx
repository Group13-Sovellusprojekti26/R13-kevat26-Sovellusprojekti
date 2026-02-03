import React from 'react';
import type { HousingCompanyStackParamList } from './HousingCompanyStack';
import { HousingCompanyDashboardScreen } from '@/features/housingCompany/views/HousingCompanyDashboardScreen';
import { AnnouncementsScreen } from '@/features/housingCompany/views/AnnouncementsScreen';
import { FaultReportListScreen } from '@/shared/components/FaultReportListScreen';
import { HCCreateFaultReportScreen } from '@/features/housingCompany/views/HCCreateFaultReportScreen';
import { createRoleBasedTabs, TabConfig } from '@/shared/navigation/RoleBasedTabs';

export type HousingCompanyTabsParamList = {
  Dashboard: undefined;
  Announcements: undefined;
  ManageFaultReports: undefined;
  CreateFaultReport: { faultReportId?: string } | undefined;
};

/**
 * Tab configuration for housing company users
 * Order: Dashboard -> Announcements -> Fault Reports (all, can edit own) -> Create Fault Report
 */
const housingCompanyTabConfig: TabConfig<HousingCompanyTabsParamList>[] = [
  {
    name: 'Dashboard',
    component: HousingCompanyDashboardScreen,
    titleKey: 'housingCompany.dashboard.title',
    tabLabelKey: 'housingCompany.dashboard.tabLabel',
  },
  {
    name: 'Announcements',
    component: AnnouncementsScreen,
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
    component: HCCreateFaultReportScreen,
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
 * Bottom tab navigation for housing company users
 */
export const HousingCompanyTabs = createRoleBasedTabs<HousingCompanyStackParamList, HousingCompanyTabsParamList>({
  tabs: housingCompanyTabConfig,
  stackParamList: {} as HousingCompanyStackParamList,
});
