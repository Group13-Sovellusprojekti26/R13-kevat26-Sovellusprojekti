import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../../features/auth/views/LoginScreen';
import { InviteCodeScreen } from '../../features/auth/views/InviteCodeScreen';
import { RegisterWithInviteScreen } from '../../features/auth/views/RegisterWithInviteScreen';
import { ResidentInviteCodeScreen } from '../../features/auth/views/ResidentInviteCodeScreen';
import { RegisterAsResidentScreen } from '../../features/auth/views/RegisterAsResidentScreen';
import { ValidatedInviteData } from '../../data/models/HousingCompany';
import { ValidatedResidentInviteData } from '../../data/repositories/residentInvites.repo';

export type AuthStackParamList = {
  Login: undefined;
  InviteCode: undefined;
  RegisterWithInvite: {
    inviteCode: string;
    companyData: ValidatedInviteData;
  };
  ResidentInviteCode: undefined;
  RegisterAsResident: {
    inviteCode: string;
    residentData: ValidatedResidentInviteData;
  };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * Authentication navigation stack
 * Handles all authentication-related screens
 */
export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
      />
      <Stack.Screen 
        name="InviteCode" 
        component={InviteCodeScreen}
      />
      <Stack.Screen 
        name="RegisterWithInvite" 
        component={RegisterWithInviteScreen}
      />
      <Stack.Screen 
        name="ResidentInviteCode" 
        component={ResidentInviteCodeScreen}
      />
      <Stack.Screen 
        name="RegisterAsResident" 
        component={RegisterAsResidentScreen}
      />
    </Stack.Navigator>
  );
};
