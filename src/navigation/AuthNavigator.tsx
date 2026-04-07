import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupChoiceScreen } from '../screens/SignupChoiceScreen';
import { GarageOnboardingScreen } from '../screens/GarageOnboardingScreen';
import { StaffSignupScreen } from '../screens/StaffSignupScreen';

export type AuthStackParamList = {
  Login: undefined;
  SignupChoice: undefined;
  GarageOnboarding: undefined;
  StaffSignup: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

interface AuthNavigatorProps {
  onSwitchToStaff?: () => void;
}

export const AuthNavigator: React.FC<AuthNavigatorProps> = ({ onSwitchToStaff }) => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerShadowVisible: false,
        headerTintColor: '#333333',
      }}
    >
      <Stack.Screen 
        name="Login" 
        options={{ headerShown: false }}
      >
        {(props) => <LoginScreen {...props} onSwitchToStaff={onSwitchToStaff} />}
      </Stack.Screen>
      <Stack.Screen 
        name="SignupChoice" 
        component={SignupChoiceScreen} 
        options={{ title: 'Create Account' }} 
      />
      <Stack.Screen 
        name="GarageOnboarding" 
        component={GarageOnboardingScreen} 
        options={{ title: 'Register Garage' }} 
      />
      <Stack.Screen 
        name="StaffSignup" 
        component={StaffSignupScreen} 
        options={{ title: 'Join a Garage' }} 
      />
    </Stack.Navigator>
  );
};
