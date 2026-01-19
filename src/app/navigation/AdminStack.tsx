import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { AdminDashboardScreen } from '../../features/admin/views/AdminDashboardScreen';
import { CreateCompanyScreen } from '../../features/admin/views/CreateCompanyScreen';
import { CompanyDetailsScreen } from '../../features/admin/views/CompanyDetailsScreen';
import { SettingsScreen } from '../../features/settings/views/SettingsScreen';
import { AdminStackParamList } from './types';

const Stack = createNativeStackNavigator<AdminStackParamList>();

/**
 * Admin navigation stack
 */
export const AdminStack: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerTitleAlign: 'left',
        headerTitleStyle: {
          fontSize: 18,
        },
      }}
    >
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="CreateCompany"
        component={CreateCompanyScreen}
        options={{
          title: t('admin.createCompany'),
        }}
      />
      <Stack.Screen
        name="CompanyDetails"
        component={CompanyDetailsScreen}
        options={{
          title: t('admin.companyDetails'),
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: t('common.settings'),
        }}
      />
    </Stack.Navigator>
  );
};
