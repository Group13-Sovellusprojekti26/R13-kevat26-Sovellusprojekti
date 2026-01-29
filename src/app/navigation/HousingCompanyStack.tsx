import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { HousingCompanyTabs } from './HousingCompanyTabs';
import { CreateResidentInviteScreen } from '@/features/housingCompany/views/CreateResidentInviteScreen';
import { CreateManagementInviteScreen } from '@/features/housingCompany/views/CreateManagementInviteScreen';
import { CreateServiceCompanyInviteScreen } from '@/features/housingCompany/views/CreateServiceCompanyInviteScreen';
import { ResidentListScreen } from '@/features/housingCompany/views/ResidentListScreen';
import { BuildingResidentsScreen } from '@/features/housingCompany/views/BuildingResidentsScreen';
import { SettingsScreen } from '@/features/settings/views/SettingsScreen';
import { FaultReportDetailsScreen } from '@/shared/components/FaultReportDetailsScreen';
import { CreateAnnouncementScreen } from '@/features/housingCompany/views/CreateAnnouncementScreen';
import { EditAnnouncementScreen } from '@/features/housingCompany/views/EditAnnouncementScreen';
import { AnnouncementDetailScreen } from '@/features/housingCompany/views/AnnouncementDetailScreen';

export type HousingCompanyStackParamList = {
  Tabs: undefined;
  FaultReportDetails: { faultReportId: string };
  CreateResidentInvite: undefined;
  CreateManagementInvite: undefined;
  CreateServiceCompanyInvite: undefined;
  ResidentList: undefined;
  BuildingResidents: { buildingId: string };
  Settings: undefined;
  CreateAnnouncement: undefined;
  EditAnnouncement: { announcementId: string };
  AnnouncementDetail: { announcementId: string };
};

const Stack = createNativeStackNavigator<HousingCompanyStackParamList>();

/**
 * Navigation stack for housing company users
 */
export const HousingCompanyStack: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="Tabs" 
        component={HousingCompanyTabs}
      />
      <Stack.Screen
        name="FaultReportDetails"
        component={FaultReportDetailsScreen}
        options={{
          headerShown: true,
          title: t('faults.detailTitle'),
          headerBackTitle: t('faults.faultReports'),
        }}
      />
      <Stack.Screen 
        name="CreateResidentInvite" 
        component={CreateResidentInviteScreen}
        options={{
          headerShown: true,
          title: t('housingCompany.residents.createInviteCode'),
          headerBackTitle: t('housingCompany.residents.residentList'),
        }}
      />
      <Stack.Screen 
        name="CreateManagementInvite" 
        component={CreateManagementInviteScreen}
        options={{
          headerShown: true,
          title: t('housingCompany.management.createInviteCode'),
          headerBackTitle: t('common.back'),
        }}
      />
      <Stack.Screen 
        name="CreateServiceCompanyInvite" 
        component={CreateServiceCompanyInviteScreen}
        options={{
          headerShown: true,
          title: t('housingCompany.serviceCompany.createInviteCode'),
          headerBackTitle: t('common.back'),
        }}
      />
      <Stack.Screen 
        name="ResidentList" 
        component={ResidentListScreen}
        options={{
          headerShown: true,
          title: t('housingCompany.residents.residentList'),
          headerBackTitle: t('common.back'),
        }}
      />
      <Stack.Screen 
        name="BuildingResidents" 
        component={BuildingResidentsScreen}
        options={({ route }) => ({
          headerShown: true,
          title: t('housingCompany.residents.buildingNumber', { number: route.params.buildingId }),
          headerBackTitle: t('housingCompany.residents.residentList'),
        })}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          headerShown: true,
          title: t('common.settings'),
          headerBackTitle: t('common.back'),
        }}
      />
      <Stack.Screen 
        name="CreateAnnouncement" 
        component={CreateAnnouncementScreen}
        options={{
          headerShown: true,
          title: t('announcements.createTitle'),
          headerBackTitle: t('announcements.announcements'),
        }}
      />
      <Stack.Screen 
        name="EditAnnouncement" 
        component={EditAnnouncementScreen}
        options={{
          headerShown: true,
          title: t('announcements.editTitle'),
          headerBackTitle: t('announcements.detailTitle'),
        }}
      />
      <Stack.Screen 
        name="AnnouncementDetail" 
        component={AnnouncementDetailScreen}
        options={{
          headerShown: true,
          title: t('announcements.detailTitle'),
          headerBackTitle: t('announcements.announcements'),
        }}
      />
    </Stack.Navigator>
  );
};
