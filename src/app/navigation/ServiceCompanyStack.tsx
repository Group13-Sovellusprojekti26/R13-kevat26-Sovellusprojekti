import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ServiceCompanyTabs } from './ServiceCompanyTabs';
import { SettingsScreen } from '@/features/settings/views/SettingsScreen';

export type ServiceCompanyStackParamList = {
  Tabs: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<ServiceCompanyStackParamList>();

/**
 * Navigation stack for service company users
 */
export const ServiceCompanyStack: React.FC = () => {
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
        name="Settings"
        component={SettingsScreen}
        options={{
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
};
