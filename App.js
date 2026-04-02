import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AnovaScreen from './screens/AnovaScreen';
import RegressionScreen from './screens/RegressionScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }) {
  const icons = {
    ANOVA: '📊',
    'Regresión': '📈',
  };
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 22 }}>{icons[label]}</Text>
      <Text
        style={{
          fontSize: 10,
          marginTop: 2,
          color: focused ? '#1565C0' : '#90A4AE',
          fontWeight: focused ? '700' : '400',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FA" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#1565C0',
              elevation: 4,
              shadowOpacity: 0.3,
            },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 16,
              letterSpacing: 0.5,
            },
            tabBarStyle: {
              backgroundColor: '#FFFFFF',
              borderTopWidth: 1,
              borderTopColor: '#E0E0E0',
              height: 65,
              paddingBottom: 8,
              paddingTop: 4,
            },
            tabBarShowLabel: false,
          }}
        >
          <Tab.Screen
            name="ANOVA"
            component={AnovaScreen}
            options={{
              title: 'ANOVA de un Factor',
              tabBarIcon: ({ focused }) => (
                <TabIcon label="ANOVA" focused={focused} />
              ),
            }}
          />
          <Tab.Screen
            name="Regresion"
            component={RegressionScreen}
            options={{
              title: 'Regresión Lineal Múltiple',
              tabBarIcon: ({ focused }) => (
                <TabIcon label="Regresión" focused={focused} />
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
