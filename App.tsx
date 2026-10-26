import React, {useEffect} from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import {initDatabase} from './src/core/database/db';
import {seedDemoData} from './src/core/database/seed';
import {SettingsRepository} from './src/core/database/repositories';
import {useAppStore} from './src/store';

function App(): React.JSX.Element {
  useEffect(() => {
    initDatabase()
      .then(async () => {
        console.log('Database initialized');
        await seedDemoData();

        const savedCurrency = await SettingsRepository.get('currency');
        if (savedCurrency) {
          try {
            useAppStore.getState().setCurrency(JSON.parse(savedCurrency));
          } catch (e) {
            console.error('Error parsing saved currency:', e);
          }
        }
      })
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
