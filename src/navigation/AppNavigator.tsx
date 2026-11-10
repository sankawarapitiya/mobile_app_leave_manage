import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../store/useAuthStore';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { SplashScreen } from '../components/SplashScreen';

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, initialize, currentOrgName } = useAuthStore();
  const [splashFinished, setSplashFinished] = useState(false);

  useEffect(() => {
    initialize();
  }, []);

  const showSplash = isLoading || !splashFinished;

  return (
    <View style={styles.root}>
      <NavigationContainer>
        {isAuthenticated ? <MainTabNavigator /> : <AuthNavigator />}
      </NavigationContainer>

      {showSplash && (
        <SplashScreen
          onAnimationComplete={() => setSplashFinished(true)}
          orgName={currentOrgName || 'Divisional Secretariat Office'}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
