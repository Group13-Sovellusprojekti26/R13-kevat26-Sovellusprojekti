import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FaultReportListScreen } from '../../features/resident/faultReports/views/FaultReportListScreen';
import { CreateFaultReportScreen } from '../../features/resident/faultReports/views/CreateFaultReportScreen';

export type ResidentTabsParamList = {
  FaultReports: undefined;
  CreateFaultReport: undefined;
};

const Tab = createBottomTabNavigator<ResidentTabsParamList>();

/**
 * Bottom tab navigation for resident users
 */
export const ResidentTabs: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#1976D2',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tab.Screen
        name="FaultReports"
        component={FaultReportListScreen}
        options={{
          title: t('faults.title'),
          tabBarLabel: t('faults.title'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="clipboard-list" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CreateFaultReport"
        component={CreateFaultReportScreen}
        options={{
          title: t('faults.createTitle'),
          tabBarLabel: t('faults.createTitle'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="plus-circle" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
