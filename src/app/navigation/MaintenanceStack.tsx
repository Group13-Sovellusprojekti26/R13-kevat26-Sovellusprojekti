import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaintenanceTabs } from './MaintenanceTabs';
import { SettingsScreen } from '@/features/settings/views/SettingsScreen';

export type MaintenanceStackParamList = {
  Tabs: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<MaintenanceStackParamList>();

/**
 * Navigation stack for maintenance/property manager users
 */
export const MaintenanceStack: React.FC = () => {
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
        name="Settings" 
        component={SettingsScreen}
        options={{
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
};
