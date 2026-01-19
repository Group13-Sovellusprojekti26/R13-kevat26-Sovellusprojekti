import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { Alert, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ResidentStackParamList } from './ResidentStack';
import { ResidentDashboardScreen } from '../../features/resident/views/ResidentDashboardScreen';
import { FaultReportListScreen } from '../../features/resident/faultReports/views/FaultReportListScreen';
import { CreateFaultReportScreen } from '../../features/resident/faultReports/views/CreateFaultReportScreen';
import { signOut } from '../../features/auth/services/auth.service';

export type ResidentTabsParamList = {
  Dashboard: undefined;
  FaultReports: undefined;
  CreateFaultReport: undefined;
};

const Tab = createBottomTabNavigator<ResidentTabsParamList>();

/**
 * Bottom tab navigation for resident users
 */
export const ResidentTabs: React.FC = () => {
  const { t } = useTranslation();

  const handleLogout = () => {
    Alert.alert(
      t('common.logout'),
      '',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.logout'),
          style: 'destructive',
          onPress: () => signOut(),
        },
      ]
    );
  };

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#0D9488',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={ResidentDashboardScreen}
        options={{
          title: t('resident.dashboard.title'),
          headerTitleAlign: 'left',
          headerTitleStyle: {
            fontSize: 18,
          },
          headerTitleContainerStyle: {
            paddingRight: 96,
          },
          headerRightContainerStyle: {
            paddingRight: 4,
          },
          tabBarLabel: t('resident.dashboard.tabLabel'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
          headerRight: () => {
            const navigation = useNavigation<NativeStackNavigationProp<ResidentStackParamList>>();
            return (
              <View style={styles.headerActions}>
                <IconButton
                  icon="cog-outline"
                  onPress={() => navigation.navigate('Settings')}
                />
                <IconButton
                  icon="logout"
                  onPress={handleLogout}
                />
              </View>
            );
          },
        }}
      />
      <Tab.Screen
        name="FaultReports"
        component={FaultReportListScreen}
        options={{
          title: t('faults.title'),
          headerTitleAlign: 'left',
          headerTitleStyle: {
            fontSize: 18,
          },
          headerTitleContainerStyle: {
            paddingRight: 96,
          },
          headerRightContainerStyle: {
            paddingRight: 4,
          },
          tabBarLabel: t('faults.title'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="clipboard-list" size={size} color={color} />
          ),
          headerRight: () => {
            const navigation = useNavigation<NativeStackNavigationProp<ResidentStackParamList>>();
            return (
              <View style={styles.headerActions}>
                <IconButton
                  icon="cog-outline"
                  onPress={() => navigation.navigate('Settings')}
                />
                <IconButton
                  icon="logout"
                  onPress={handleLogout}
                />
              </View>
            );
          },
        }}
      />
      <Tab.Screen
        name="CreateFaultReport"
        component={CreateFaultReportScreen}
        options={{
          title: t('faults.createTitle'),
          headerTitleAlign: 'left',
          headerTitleStyle: {
            fontSize: 18,
          },
          headerTitleContainerStyle: {
            paddingRight: 96,
          },
          headerRightContainerStyle: {
            paddingRight: 4,
          },
          tabBarLabel: t('faults.createTitle'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="plus-circle" size={size} color={color} />
          ),
          headerRight: () => {
            const navigation = useNavigation<NativeStackNavigationProp<ResidentStackParamList>>();
            return (
              <View style={styles.headerActions}>
                <IconButton
                  icon="cog-outline"
                  onPress={() => navigation.navigate('Settings')}
                />
                <IconButton
                  icon="logout"
                  onPress={handleLogout}
                />
              </View>
            );
          },
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
  },
});
