import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { Alert, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ServiceCompanyStackParamList } from './ServiceCompanyStack';
import {
  ServiceCompanyDashboardScreen,
  ManageFaultReportsScreen,
  ManageAnnouncementsScreen,
} from '@/features/serviceCompany/views';
import { signOut } from '@/features/auth/services/auth.service';

export type ServiceCompanyTabsParamList = {
  Dashboard: undefined;
  ManageFaultReports: undefined;
  ManageAnnouncements: undefined;
};

const Tab = createBottomTabNavigator<ServiceCompanyTabsParamList>();

/**
 * Bottom tab navigation for service company users
 */
export const ServiceCompanyTabs: React.FC = () => {
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
        component={ServiceCompanyDashboardScreen}
        options={{
          title: t('serviceCompany.dashboard'),
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
          tabBarLabel: t('serviceCompany.dashboard'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
          headerRight: () => {
            const navigation = useNavigation<NativeStackNavigationProp<ServiceCompanyStackParamList>>();
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
        name="ManageFaultReports"
        component={ManageFaultReportsScreen}
        options={{
          title: t('serviceCompany.manageFaults'),
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
          tabBarLabel: t('serviceCompany.manageFaultsTab'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="wrench" size={size} color={color} />
          ),
          headerRight: () => {
            const navigation = useNavigation<NativeStackNavigationProp<ServiceCompanyStackParamList>>();
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
        name="ManageAnnouncements"
        component={ManageAnnouncementsScreen}
        options={{
          title: t('serviceCompany.manageAnnouncements'),
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
          tabBarLabel: t('serviceCompany.manageAnnouncementsTab'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="bullhorn" size={size} color={color} />
          ),
          headerRight: () => {
            const navigation = useNavigation<NativeStackNavigationProp<ServiceCompanyStackParamList>>();
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
