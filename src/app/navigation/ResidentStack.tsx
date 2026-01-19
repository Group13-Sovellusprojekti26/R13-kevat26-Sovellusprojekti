import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ResidentTabs } from './ResidentTabs';
import { ImagePreviewScreen } from '../../features/resident/faultReports/views/ImagePreviewScreen';
import { SettingsScreen } from '../../features/settings/views/SettingsScreen';

export type ResidentStackParamList = {
  Tabs: undefined;
  ImagePreview: {
    images: string[];
    index: number;
  };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<ResidentStackParamList>();

export const ResidentStack: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={ResidentTabs} />
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
    </Stack.Navigator>
  );
};
