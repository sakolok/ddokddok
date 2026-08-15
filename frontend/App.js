import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { UserProvider } from './src/services/UserContext';

import LandingScreen from './src/screens/LandingScreen';
import LoginScreen from './src/screens/LoginScreen';
import ForgotScreen from './src/screens/ForgotScreen';
import SignupInfoScreen from './src/screens/SignupInfoScreen';
import PINScreen from './src/screens/PINScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';

import DashboardScreen from './src/screens/DashboardScreen';
import HealthScreen from './src/screens/HealthScreen';
import GameScreen from './src/screens/GameScreen';
import AIScreen from './src/screens/AIScreen';

import CardMatchGame from './src/screens/CardMatchGame';
import NumberMemoryGame from './src/screens/NumberMemoryGame';
import QuickMathGame from './src/screens/QuickMathGame';
import ColorRecognitionGame from './src/screens/ColorRecognitionGame';

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <UserProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Landing"
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Forgot" component={ForgotScreen} />
            <Stack.Screen name="SignupInfo" component={SignupInfoScreen} />
            <Stack.Screen name="PIN" component={PINScreen} />
            <Stack.Screen name="Welcome" component={WelcomeScreen} />

            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Health" component={HealthScreen} />
            <Stack.Screen name="Game" component={GameScreen} />
            <Stack.Screen name="AI" component={AIScreen} />

            <Stack.Screen name="CardMatchGame" component={CardMatchGame} />
            <Stack.Screen name="NumberMemoryGame" component={NumberMemoryGame} />
            <Stack.Screen name="QuickMathGame" component={QuickMathGame} />
            <Stack.Screen name="ColorRecognitionGame" component={ColorRecognitionGame} />
          </Stack.Navigator>
        </NavigationContainer>
      </UserProvider>
    </SafeAreaProvider>
  );
}
