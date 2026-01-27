import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ServiceCompanyTabs } from './ServiceCompanyTabs';
import { SettingsScreen } from '@/features/settings/views/SettingsScreen';
import { FaultReportDetailsScreen } from '@/shared/components/FaultReportDetailsScreen';
import { AnnouncementDetailScreen } from '@/features/housingCompany/views/AnnouncementDetailScreen';

export type ServiceCompanyStackParamList = {
  Tabs: undefined;
  FaultReportDetails: { faultReportId: string };
  Settings: undefined;
  AnnouncementDetail: { announcementId: string };
};

const Stack = createNativeStackNavigator<ServiceCompanyStackParamList>();

/**
 * Navigation stack for service company users
 */
export const ServiceCompanyStack: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="Tabs"
        component={ServiceCompanyTabs}
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
        name="Settings"
        component={SettingsScreen}
        options={{
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="AnnouncementDetail"
        component={AnnouncementDetailScreen}
        options={{
          headerShown: true,
          title: t('announcements.detailTitle'),
        }}
      />
    </Stack.Navigator>
  );
};
