import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { Alert, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { signOut } from '@/features/auth/services/auth.service';

/**
 * Default icon mapping based on common tab names
 */
const DEFAULT_ICONS: Record<string, string> = {
  Dashboard: 'home',
  Announcements: 'bell',
  ManageAnnouncements: 'bell',
  FaultReports: 'clipboard-list',
  ManageFaultReports: 'clipboard-list',
  CreateFaultReport: 'plus-circle',
};

/**
 * Get icon name for a tab, either from explicit config or default mapping
 */
function getIconName(tabName: string, explicitIcon?: string): string {
  if (explicitIcon) return explicitIcon;
  return DEFAULT_ICONS[tabName] || 'help-circle';
}

/**
 * Configuration for a single tab in the bottom tab navigator
 */
export interface TabConfig<ParamList extends Record<string, any>> {
  /** Unique name for the tab */
  name: keyof ParamList;
  /** React component to render */
  component?: React.ComponentType<any>;
  /** Function that returns the component (for inline components) */
  children?: () => React.ReactElement;
  /** Translation key for the tab title */
  titleKey: string;
  /** Translation key for the tab label */
  tabLabelKey: string;
  /** Optional icon name from MaterialCommunityIcons (defaults to icon based on tab name) */
  iconName?: string;
  /** Whether to show dynamic title based on route params (for edit mode) */
  dynamicTitle?: (params: any, t: (key: string) => string) => string;
}

/**
 * Props for RoleBasedTabs component
 */
interface RoleBasedTabsProps<StackParamList extends Record<string, any>, TabParamList extends Record<string, any>> {
  /** Tab configurations */
  tabs: TabConfig<TabParamList>[];
  /** Navigation param list type for the parent stack navigator (for Settings navigation) */
  stackParamList: StackParamList;
}

/**
 * Header actions component - Settings button and Logout button
 */
const HeaderActions = <StackParamList extends Record<string, any>>({ 
  onLogout,
  stackParamList,
}: { 
  onLogout: () => void;
  stackParamList: StackParamList;
}) => {
  const navigation = useNavigation<NativeStackNavigationProp<StackParamList>>();
  return (
    <View style={styles.headerActions}>
      <IconButton
        icon="cog-outline"
        onPress={() => (navigation as any).navigate('Settings')}
      />
      <IconButton
        icon="logout"
        onPress={onLogout}
      />
    </View>
  );
};

/**
 * Shared bottom tab navigator component for all user roles
 * Reduces code duplication across ResidentTabs, HousingCompanyTabs, MaintenanceTabs, and ServiceCompanyTabs
 */
export function createRoleBasedTabs<StackParamList extends Record<string, any>, TabParamList extends Record<string, any>>({
  tabs,
  stackParamList,
}: RoleBasedTabsProps<StackParamList, TabParamList>) {
  const Tab = createBottomTabNavigator<TabParamList>();

  const RoleBasedTabsComponent: React.FC = () => {
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
        {tabs.map((tab) => {
          const screenOptions = ({ route }: any) => {
            const params = (route as any).params;
            const title = tab.dynamicTitle 
              ? tab.dynamicTitle(params, t)
              : t(tab.titleKey);
            
            return {
              title,
              headerTitleAlign: 'left' as const,
              headerTitleStyle: {
                fontSize: 18,
              },
              headerTitleContainerStyle: {
                paddingRight: 96,
              },
              headerRightContainerStyle: {
                paddingRight: 4,
              },
              tabBarLabel: t(tab.tabLabelKey),
              tabBarIcon: ({ color, size }: { color: string; size: number }) => (
                <MaterialCommunityIcons name={getIconName(tab.name as string, tab.iconName) as any} size={size} color={color} />
              ),
              headerRight: () => <HeaderActions onLogout={handleLogout} stackParamList={stackParamList} />,
            };
          };

          // If tab has children function, use it; otherwise use component
          if (tab.children) {
            return (
              <Tab.Screen
                key={tab.name as string}
                name={tab.name}
                options={screenOptions}
              >
                {tab.children}
              </Tab.Screen>
            );
          } else if (tab.component) {
            return (
              <Tab.Screen
                key={tab.name as string}
                name={tab.name}
                component={tab.component}
                options={screenOptions}
              />
            );
          }
          return null;
        })}
      </Tab.Navigator>
    );
  };

  return RoleBasedTabsComponent;
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
  },
});
