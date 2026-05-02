import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Landing: undefined;
  Login: undefined;
  SignupChoice: undefined;
  GarageOnboarding: undefined;
  RegistrationThankYou: undefined;
  StaffSignup: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

interface AuthNavigatorProps {
  onSwitchToStaff?: () => void;
}

// Screen imports are deferred via require() to reduce the synchronous
// module-loading depth and prevent "Maximum call stack size exceeded"
// on iOS Safari.
export const AuthNavigator: React.FC<AuthNavigatorProps> = ({ onSwitchToStaff }) => {
  return (
    <Stack.Navigator
      initialRouteName="Landing"
      screenOptions={{
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerShadowVisible: false,
        headerTintColor: '#333333',
      }}
    >
      <Stack.Screen 
        name="Landing" 
        component={require('../screens/LandingScreen').LandingScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Login" 
        options={{ headerShown: false }}
      >
        {(props) => {
          const { LoginScreen } = require('../screens/LoginScreen');
          return <LoginScreen {...props} onSwitchToStaff={onSwitchToStaff} />;
        }}
      </Stack.Screen>
      <Stack.Screen 
        name="SignupChoice" 
        component={require('../screens/SignupChoiceScreen').SignupChoiceScreen} 
        options={{ title: 'Create Account' }} 
      />
      <Stack.Screen 
        name="GarageOnboarding" 
        component={require('../screens/GarageOnboardingScreen').GarageOnboardingScreen} 
        options={{ title: 'Register Garage' }} 
      />
      <Stack.Screen 
        name="RegistrationThankYou" 
        component={require('../screens/RegistrationThankYouScreen').RegistrationThankYouScreen} 
        options={{ title: 'Registration Complete', headerShown: false }} 
      />
      <Stack.Screen 
        name="StaffSignup" 
        component={require('../screens/StaffSignupScreen').StaffSignupScreen} 
        options={{ title: 'Join a Garage' }} 
      />
    </Stack.Navigator>
  );
};
