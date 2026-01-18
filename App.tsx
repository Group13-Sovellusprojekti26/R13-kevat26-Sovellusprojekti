import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from './src/app/providers/AppProviders';

/**
 * TaloFix - Property Management App
 * Root component with all providers configured
 */
export default function App() {
  return (
    <>
      <AppProviders />
      <StatusBar style="light" hidden={true} />
    </>
  );
}
