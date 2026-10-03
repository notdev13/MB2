import type { Session } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from './src/lib/supabase';
import { Hoje } from './src/screens/Hoje';
import { Login } from './src/screens/Login';
import { TemaProvider, useTema } from './src/theme';

function Raiz() {
  const { t, escuro } = useTema();
  const [sessao, setSessao] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSessao(s));
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style={escuro ? 'light' : 'dark'} />
      {sessao === undefined ? (
        <ActivityIndicator style={{ flex: 1 }} color={t.accentText} />
      ) : sessao ? (
        <Hoje userId={sessao.user.id} />
      ) : (
        <Login />
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <TemaProvider>
        <Raiz />
      </TemaProvider>
    </SafeAreaProvider>
  );
}
