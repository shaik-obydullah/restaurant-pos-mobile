import React, {useEffect} from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import {initDatabase} from './src/core/database/db';

function App(): React.JSX.Element {
  useEffect(() => {
    initDatabase()
      .then(() => console.log('Database initialized'))
      .catch(err => console.error('Database init error:', err));
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default App;
