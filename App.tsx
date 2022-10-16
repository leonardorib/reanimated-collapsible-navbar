import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CollapsibleNavBar from './CollapsibleNavBar';

const App = () => {
  return (
    <SafeAreaProvider>
      <CollapsibleNavBar />
    </SafeAreaProvider>
  );
};

export default App;
