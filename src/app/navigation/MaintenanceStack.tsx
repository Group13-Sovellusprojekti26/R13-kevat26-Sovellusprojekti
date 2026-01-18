import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaintenanceDashboardScreen } from '@/features/maintenance/views/MaintenanceDashboardScreen';

export type MaintenanceStackParamList = {
  Dashboard: undefined;
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
        name="Dashboard" 
        component={MaintenanceDashboardScreen}
      />
    </Stack.Navigator>
  );
};
