import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { MaintenanceTabs } from './MaintenanceTabs';
import { SettingsScreen } from '@/features/settings/views/SettingsScreen';
import { FaultReportDetailsScreen } from '@/shared/components/FaultReportDetailsScreen';
import { CreateAnnouncementScreen } from '@/features/housingCompany/views/CreateAnnouncementScreen';
import { EditAnnouncementScreen } from '@/features/housingCompany/views/EditAnnouncementScreen';
import { AnnouncementDetailScreen } from '@/features/housingCompany/views/AnnouncementDetailScreen';

export type MaintenanceStackParamList = {
  Tabs: undefined;
  FaultReportDetails: { faultReportId: string };
  Settings: undefined;
  CreateAnnouncement: undefined;
  EditAnnouncement: { announcementId: string };
  AnnouncementDetail: { announcementId: string };
};

const Stack = createNativeStackNavigator<MaintenanceStackParamList>();

/**
 * Navigation stack for maintenance/property manager users
 */
export const MaintenanceStack: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="Tabs" 
        component={MaintenanceTabs}
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
        name="CreateAnnouncement" 
        component={CreateAnnouncementScreen}
        options={{
          headerShown: true,
          title: t('announcements.createTitle'),
        }}
      />
      <Stack.Screen 
        name="EditAnnouncement" 
        component={EditAnnouncementScreen}
        options={{
          headerShown: true,
          title: t('announcements.editTitle'),
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
