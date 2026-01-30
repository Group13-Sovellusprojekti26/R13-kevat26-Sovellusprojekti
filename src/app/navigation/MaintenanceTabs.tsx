import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { Alert, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MaintenanceStackParamList } from './MaintenanceStack';
import { MaintenanceDashboardScreen } from '@/features/maintenance/views/MaintenanceDashboardScreen';
import { ManageFaultReportsScreen } from '@/features/maintenance/views/ManageFaultReportsScreen';
import { AnnouncementsScreen } from '@/features/housingCompany/views/AnnouncementsScreen';
import { signOut } from '@/features/auth/services/auth.service';
import { getUserProfile } from '@/data/repositories/users.repo';
import { UserRole } from '@/data/models/enums';

export type MaintenanceTabsParamList = {
  Dashboard: undefined;
  ManageFaultReports: undefined;
  ManageAnnouncements: undefined;
};

const Tab = createBottomTabNavigator<MaintenanceTabsParamList>();

/**
 * Bottom tab navigation for maintenance and property manager users
 */
export const MaintenanceTabs: React.FC = () => {
  const { t } = useTranslation();
  const [userRole, setUserRole] = React.useState<UserRole | null>(null);

  React.useEffect(() => {
    const loadUserRole = async () => {
      try {
        const profile = await getUserProfile();
        if (profile) {
          setUserRole(profile.role);
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
      }
    };
    loadUserRole();
  }, []);

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
        component={MaintenanceDashboardScreen}
        options={{
          title: t('maintenance.dashboard.title'),
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
          tabBarLabel: t('maintenance.dashboard.title'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
          headerRight: () => {
            const navigation = useNavigation<NativeStackNavigationProp<MaintenanceStackParamList>>();
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
          title: t('maintenance.dashboard.manageFaults'),
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
          tabBarLabel: t('maintenance.dashboard.manageFaultsTab'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="wrench" size={size} color={color} />
          ),
          headerRight: () => {
            const navigation = useNavigation<NativeStackNavigationProp<MaintenanceStackParamList>>();
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
        options={{
          title: t('maintenance.dashboard.manageAnnouncements'),
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
          tabBarLabel: t('maintenance.dashboard.manageAnnouncementsTab'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="bullhorn" size={size} color={color} />
          ),
          headerRight: () => {
            const navigation = useNavigation<NativeStackNavigationProp<MaintenanceStackParamList>>();
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
      >
        {() => <AnnouncementsScreen />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
  },
});
