// App.js
//
// This is the entry point of the entire React Native app.
// It does two things:
//   1. Wraps everything in <AuthProvider> so every screen can read auth state.
//   2. Decides WHICH set of screens to show based on whether the user is logged in.
//
// How React Navigation works (at a high level):
//   - NavigationContainer is the outermost wrapper that manages nav state.
//   - createNativeStackNavigator() creates a "stack" of screens — like a stack
//     of cards. Navigating forward pushes a new card on top; going back pops it.
//   - We use TWO separate stacks:
//       AuthStack  — Login + Signup  (shown when not logged in)
//       AppStack   — Dashboard + ListDetail  (shown when logged in)
//   - React Navigation handles the transition animation between screens.

import React from 'react';
import { registerRootComponent } from 'expo';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider, useAuth } from './context/AuthContext';

import LoginScreen    from './screens/LoginScreen';
import SignupScreen   from './screens/SignupScreen';
import DashboardScreen from './screens/DashboardScreen';
import ListDetailScreen from './screens/ListDetailScreen';

// createNativeStackNavigator() returns an object with two components:
//   Stack.Navigator  — the container for a group of screens
//   Stack.Screen     — registers one screen inside a Navigator
const Stack = createNativeStackNavigator();

// ------------------------------------------------------------------
// Auth stack — shown to users who are NOT logged in
// ------------------------------------------------------------------
function AuthStack() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,       // we draw our own header inside each screen
        animation: 'fade',
      }}
    >
      <Stack.Screen name="Login"  component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

// ------------------------------------------------------------------
// App stack — shown to users who ARE logged in
// ------------------------------------------------------------------
function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#4F46E5' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ headerShown: false }}  // Dashboard has its own header UI
      />
      <Stack.Screen
        name="ListDetail"
        component={ListDetailScreen}
        // title is set dynamically inside ListDetailScreen via navigation.setOptions()
        options={{ title: 'List' }}
      />
    </Stack.Navigator>
  );
}

// ------------------------------------------------------------------
// Root navigator — reads the token and picks which stack to show.
// This component must be INSIDE AuthProvider (it calls useAuth()).
// ------------------------------------------------------------------
function RootNavigator() {
  // token is null when nobody is logged in, and a JWT string when they are.
  // Whenever token changes (login / logout), this component re-renders
  // and React Navigation swaps between AuthStack and AppStack automatically.
  const { token } = useAuth();

  return (
    <NavigationContainer>
      {token ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

// ------------------------------------------------------------------
// App — the root component.
// We use registerRootComponent() instead of `export default` because this is a
// plain App.js entry point (not expo-router). registerRootComponent does two things:
//   1. Calls AppRegistry.registerComponent('main', ...) — which is what was missing
//   2. Ensures the Expo environment (fonts, splash screen, etc.) is set up first.
// ------------------------------------------------------------------
function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

registerRootComponent(App);
