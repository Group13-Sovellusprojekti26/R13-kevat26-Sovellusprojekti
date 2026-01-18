import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../../features/auth/views/LoginScreen';
import { InviteCodeScreen } from '../../features/auth/views/InviteCodeScreen';
import { RegisterWithInviteScreen } from '../../features/auth/views/RegisterWithInviteScreen';
import { ResidentInviteCodeScreen } from '../../features/auth/views/ResidentInviteCodeScreen';
import { RegisterAsResidentScreen } from '../../features/auth/views/RegisterAsResidentScreen';
import { InviteTypeSelectionScreen } from '../../features/auth/views/InviteTypeSelectionScreen';
import { ManagementInviteCodeScreen } from '../../features/auth/views/ManagementInviteCodeScreen';
import { RegisterAsManagementScreen } from '../../features/auth/views/RegisterAsManagementScreen';
import { ServiceCompanyInviteCodeScreen } from '../../features/auth/views/ServiceCompanyInviteCodeScreen';
import { RegisterAsServiceCompanyScreen } from '../../features/auth/views/RegisterAsServiceCompanyScreen';
import { ValidatedInviteData } from '../../data/models/HousingCompany';
import { ValidatedResidentInviteData } from '../../data/repositories/residentInvites.repo';
import { ValidatedManagementInviteData } from '../../data/repositories/managementInvites.repo';
import { ValidatedServiceCompanyInviteData } from '../../data/repositories/serviceCompanyInvites.repo';

export type AuthStackParamList = {
  Login: undefined;
  InviteTypeSelection: undefined;
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
  ManagementInviteCode: undefined;
  RegisterAsManagement: {
    inviteCode: string;
    managementData: ValidatedManagementInviteData;
  };
  ServiceCompanyInviteCode: undefined;
  RegisterAsServiceCompany: {
    inviteCode: string;
    serviceCompanyData: ValidatedServiceCompanyInviteData;
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
        name="InviteTypeSelection" 
        component={InviteTypeSelectionScreen}
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
      <Stack.Screen 
        name="ManagementInviteCode" 
        component={ManagementInviteCodeScreen}
      />
      <Stack.Screen 
        name="RegisterAsManagement" 
        component={RegisterAsManagementScreen}
      />
      <Stack.Screen 
        name="ServiceCompanyInviteCode" 
        component={ServiceCompanyInviteCodeScreen}
      />
      <Stack.Screen 
        name="RegisterAsServiceCompany" 
        component={RegisterAsServiceCompanyScreen}
      />
    </Stack.Navigator>
  );
};
