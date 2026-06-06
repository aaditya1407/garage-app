import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Landing: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  GarageOnboarding: undefined;
  RegistrationThankYou: undefined;
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
        name="ForgotPassword" 
        component={require('../screens/ForgotPasswordScreen').ForgotPasswordScreen} 
        options={{ title: 'Forgot Password', headerShown: false }} 
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
    </Stack.Navigator>
  );
};
