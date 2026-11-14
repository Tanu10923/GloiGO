import React from 'react';
import { StatusBar } from 'react-native';
import DriverApp from './src/DriverApp';

export default function App() {
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF9F5" />
      <DriverApp />
    </>
  );
}
