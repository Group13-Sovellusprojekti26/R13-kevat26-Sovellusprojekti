import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../data/firebase/firebase';
import { AuthNavigator } from './AuthNavigator';
import { ResidentTabs } from './ResidentTabs';
import { ResidentStack } from './ResidentStack';
import { AdminStack } from './AdminStack';
import { HousingCompanyStack } from './HousingCompanyStack';
import { MaintenanceStack } from './MaintenanceStack';
import { ServiceCompanyStack } from './ServiceCompanyStack';
import { getUserProfile } from '../../data/repositories/users.repo';
import { UserRole } from '../../data/models/enums';
import { ActivityIndicator, View } from 'react-native';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Root navigator with authentication gate and role-based routing
 * Routes to Auth, Admin, HousingCompany, or Resident stack based on authentication and role
 */
export const RootNavigator: React.FC = () => {
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen to authentication state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in, fetch their profile to determine role
        try {
          const profile = await getUserProfile();
          if (profile) {
            setUserRole(profile.role);
            setIsSignedIn(true);
          } else {
            // Profile not found, sign out
            setIsSignedIn(false);
            setUserRole(null);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setIsSignedIn(false);
          setUserRole(null);
        }
      } else {
        // User is signed out
        setIsSignedIn(false);
        setUserRole(null);
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  // Show loading screen while checking auth state
  if (isLoading || isSignedIn === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Determine which stack to show based on role
  const getMainStack = () => {
    if (userRole === UserRole.ADMIN) {
      return <Stack.Screen name="Main" component={AdminStack} />;
    }
    if (userRole === UserRole.HOUSING_COMPANY) {
      return <Stack.Screen name="Main" component={HousingCompanyStack} />;
    }
    if (userRole === UserRole.MAINTENANCE) {
      return <Stack.Screen name="Main" component={MaintenanceStack} />;
    }
    if (userRole === UserRole.SERVICE_COMPANY) {
      return <Stack.Screen name="Main" component={ServiceCompanyStack} />;
    }
    // Default to resident stack for resident role
    return <Stack.Screen name="Main" component={ResidentStack} />;
  };

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {isSignedIn ? (
        getMainStack()
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
};
