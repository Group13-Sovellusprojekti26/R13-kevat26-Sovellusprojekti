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

export type HousingCompanyStackParamList = {
  Tabs: undefined;
  FaultReportDetails: { faultReportId: string };
  CreateResidentInvite: undefined;
  CreateManagementInvite: undefined;
  CreateServiceCompanyInvite: undefined;
  ResidentList: undefined;
  BuildingResidents: { buildingId: string };
  Settings: undefined;
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
        }}
      />
      <Stack.Screen 
        name="CreateResidentInvite" 
        component={CreateResidentInviteScreen}
        options={{
          headerShown: true,
          title: t('housingCompany.residents.createInviteCode'),
        }}
      />
      <Stack.Screen 
        name="CreateManagementInvite" 
        component={CreateManagementInviteScreen}
        options={{
          headerShown: true,
          title: t('housingCompany.management.createInviteCode'),
        }}
      />
      <Stack.Screen 
        name="CreateServiceCompanyInvite" 
        component={CreateServiceCompanyInviteScreen}
        options={{
          headerShown: true,
          title: t('housingCompany.serviceCompany.createInviteCode'),
        }}
      />
      <Stack.Screen 
        name="ResidentList" 
        component={ResidentListScreen}
        options={{
          headerShown: true,
          title: t('housingCompany.residents.residentList'),
        }}
      />
      <Stack.Screen 
        name="BuildingResidents" 
        component={BuildingResidentsScreen}
        options={({ route }) => ({
          headerShown: true,
          title: t('housingCompany.residents.buildingNumber', { number: route.params.buildingId }),
        })}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          headerShown: true,
          title: t('common.settings'),
        }}
      />
    </Stack.Navigator>
  );
};
