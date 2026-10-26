import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import HomeScreen from '../features/dashboard/HomeScreen';
import AboutScreen from '../features/about/AboutScreen';
import InventoryScreen from '../features/inventory/InventoryScreen';
import CustomersScreen from '../features/customers/CustomersScreen';
import SettingsScreen from '../features/settings/SettingsScreen';
import PosScreen from '../features/pos/PosScreen';
import OrdersScreen from '../features/orders/OrdersScreen';
import AccountingScreen from '../features/accounting/AccountingScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({color, size}) => {
          let iconName = 'home';
          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'POS') {
            iconName = 'cart';
          } else if (route.name === 'Orders') {
            iconName = 'receipt';
          } else if (route.name === 'Inventory') {
            iconName = 'package-variant';
          } else if (route.name === 'Accounting') {
            iconName = 'cash-multiple';
          } else if (route.name === 'Customers') {
            iconName = 'account-group';
          } else if (route.name === 'Settings') {
            iconName = 'cog';
          } else if (route.name === 'About') {
            iconName = 'information';
          }
          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2e7d32',
        tabBarInactiveTintColor: 'gray',
        tabBarLabelStyle: {fontSize: 10},
        headerShown: false,
      })}>
      <Tab.Screen name="Home" component={HomeScreen} options={{title: 'Home'}} />
      <Tab.Screen name="POS" component={PosScreen} options={{title: 'POS'}} />
      <Tab.Screen name="Orders" component={OrdersScreen} options={{title: 'Orders'}} />
      <Tab.Screen name="Accounting" component={AccountingScreen} options={{title: 'Accounting'}} />
      <Tab.Screen name="Inventory" component={InventoryScreen} options={{title: 'Inventory'}} />
      <Tab.Screen name="Customers" component={CustomersScreen} options={{title: 'Customers'}} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{title: 'Settings'}} />
      <Tab.Screen name="About" component={AboutScreen} options={{title: 'About'}} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Main" component={TabNavigator} options={{headerShown: false}} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
