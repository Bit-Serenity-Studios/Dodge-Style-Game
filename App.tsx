import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GameScreen } from './src/components/GameScreen';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#05060f' }}>
      <SafeAreaProvider>
        <StatusBar style="light" hidden />
        <GameScreen />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
