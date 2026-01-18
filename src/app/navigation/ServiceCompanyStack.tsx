import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ServiceCompanyDashboardScreen } from '../../features/serviceCompany/views/ServiceCompanyDashboardScreen';

export type ServiceCompanyStackParamList = {
  ServiceCompanyDashboard: undefined;
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
        headerShown: true,
      }}
    >
      <Stack.Screen
        name="ServiceCompanyDashboard"
        component={ServiceCompanyDashboardScreen}
        options={{
          title: t('serviceCompany.dashboard'),
          headerLargeTitle: true,
        }}
      />
    </Stack.Navigator>
  );
};
