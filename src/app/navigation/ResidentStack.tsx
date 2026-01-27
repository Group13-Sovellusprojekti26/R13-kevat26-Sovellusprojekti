import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ResidentTabs } from './ResidentTabs';
import { ImagePreviewScreen } from '../../features/resident/faultReports/views/ImagePreviewScreen';
import { SettingsScreen } from '../../features/settings/views/SettingsScreen';
import { FaultReportDetailsScreen } from '@/shared/components/FaultReportDetailsScreen';
import { AnnouncementDetailScreen } from '@/features/housingCompany/views/AnnouncementDetailScreen';

export type ResidentStackParamList = {
  Tabs: undefined;
  FaultReportDetails: { faultReportId: string };
  ImagePreview: {
    images: string[];
    index: number;
  };
  Settings: undefined;
  AnnouncementDetail: { announcementId: string };
};

const Stack = createNativeStackNavigator<ResidentStackParamList>();

export const ResidentStack: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={ResidentTabs} />
      <Stack.Screen
        name="FaultReportDetails"
        component={FaultReportDetailsScreen}
        options={{
          headerShown: true,
          title: t('faults.detailTitle'),
        }}
      />
      <Stack.Screen
        name="ImagePreview"
        component={ImagePreviewScreen}
        options={{
          presentation: 'transparentModal',
          animation: 'fade',
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
