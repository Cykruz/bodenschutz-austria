import { Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { NunitoSans_400Regular, NunitoSans_600SemiBold, NunitoSans_700Bold } from '@expo-google-fonts/nunito-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors, fonts } from '@/constants/theme';
import { InquiryProvider } from '@/context/InquiryContext';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
SplashScreen.setOptions({ fade: true, duration: 300 });

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_700Bold,
    Nunito_800ExtraBold,
    NunitoSans_400Regular,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hide();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <InquiryProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.sand },
            headerTintColor: colors.darkGreen,
            headerTitleStyle: { fontFamily: fonts.heading, fontSize: 20, color: colors.darkGreen },
            headerShadowVisible: false,
            headerBackTitle: 'Zurück',
            headerBackButtonDisplayMode: 'default',
            contentStyle: { backgroundColor: colors.sand },
            headerTitleAlign: 'center',
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false, title: 'Start' }} />
          <Stack.Screen name="chat" options={{ title: 'Berater' }} />
          <Stack.Screen name="info" options={{ title: 'Info' }} />
          <Stack.Screen name="anfrage/vorhaben" options={{ title: 'Vorhaben' }} />
          <Stack.Screen name="anfrage/foto" options={{ title: 'Foto' }} />
          <Stack.Screen name="anfrage/masse" options={{ title: 'Maße' }} />
          <Stack.Screen name="anfrage/mengen" options={{ title: 'Mengen' }} />
          <Stack.Screen name="anfrage/kontakt" options={{ title: 'Kontakt' }} />
          <Stack.Screen name="anfrage/senden" options={{ title: 'Senden' }} />
          <Stack.Screen
            name="anfrage/bestaetigung"
            options={{ title: 'Bestätigung', headerBackVisible: false, gestureEnabled: false }}
          />
        </Stack>
      </InquiryProvider>
    </SafeAreaProvider>
  );
}
