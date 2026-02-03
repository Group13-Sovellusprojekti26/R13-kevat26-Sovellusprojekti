import React from 'react';
import type { ServiceCompanyStackParamList } from './ServiceCompanyStack';
import { ServiceCompanyDashboardScreen } from '@/features/serviceCompany/views';
import { FaultReportListScreen } from '@/shared/components/FaultReportListScreen';
import { AnnouncementsScreen } from '@/features/housingCompany/views/AnnouncementsScreen';
import { createRoleBasedTabs, TabConfig } from '@/shared/navigation/RoleBasedTabs';

export type ServiceCompanyTabsParamList = {
  Dashboard: undefined;
  ManageFaultReports: undefined;
  ManageAnnouncements: undefined;
};

/**
 * Tab configuration for service company users
 */
const serviceCompanyTabConfig: TabConfig<ServiceCompanyTabsParamList>[] = [
  {
    name: 'Dashboard',
    component: ServiceCompanyDashboardScreen,
    titleKey: 'serviceCompany.dashboard',
    tabLabelKey: 'serviceCompany.dashboard',
  },
  {
    name: 'ManageFaultReports',
    children: () => <FaultReportListScreen detailScreenName="FaultReportDetails" />,
    titleKey: 'faults.title',
    tabLabelKey: 'serviceCompany.manageFaultsTab',
  },
  {
    name: 'ManageAnnouncements',
    children: () => <AnnouncementsScreen />,
    titleKey: 'announcements.title',
    tabLabelKey: 'serviceCompany.manageAnnouncementsTab',
  },
];

/**
 * Bottom tab navigation for service company users
 */
export const ServiceCompanyTabs = createRoleBasedTabs<ServiceCompanyStackParamList, ServiceCompanyTabsParamList>({
  tabs: serviceCompanyTabConfig,
  stackParamList: {} as ServiceCompanyStackParamList,
});
