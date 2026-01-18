import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { HousingCompanyDashboardScreen } from '@/features/housingCompany/views/HousingCompanyDashboardScreen';
import { CreateResidentInviteScreen } from '@/features/housingCompany/views/CreateResidentInviteScreen';
import { ResidentListScreen } from '@/features/housingCompany/views/ResidentListScreen';
import { BuildingResidentsScreen } from '@/features/housingCompany/views/BuildingResidentsScreen';

export type HousingCompanyStackParamList = {
  Dashboard: undefined;
  CreateResidentInvite: undefined;
  ResidentList: undefined;
  BuildingResidents: { buildingId: string };
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
        name="Dashboard" 
        component={HousingCompanyDashboardScreen}
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
    </Stack.Navigator>
  );
};
