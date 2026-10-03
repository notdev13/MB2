import type { Session } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from './src/lib/supabase';
import { Diario } from './src/screens/Diario';
import { Equipe } from './src/screens/Equipe';
import { Hoje, TelaObra } from './src/screens/Hoje';
import { Material } from './src/screens/Material';
import { Obra } from './src/screens/Obra';
import { Ocorrencia } from './src/screens/Ocorrencia';
import { Login } from './src/screens/Login';
import { TemaProvider, useTema } from './src/theme';

function Raiz() {
  const { t, escuro } = useTema();
  const [sessao, setSessao] = useState<Session | null | undefined>(undefined);
  const [tela, setTela] = useState<{ tipo: TelaObra; obraId: string; obraNome: string } | null>(null);

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
      ) : sessao && tela ? (
        tela.tipo === 'obra' ? (
          <Obra obraId={tela.obraId} onVoltar={() => setTela(null)} />
        ) : tela.tipo === 'material' ? (
          <Material obraId={tela.obraId} obraNome={tela.obraNome} onVoltar={() => setTela(null)} />
        ) : tela.tipo === 'ocorrencia' ? (
          <Ocorrencia obraId={tela.obraId} obraNome={tela.obraNome} onVoltar={() => setTela(null)} />
        ) : tela.tipo === 'equipe' ? (
          <Equipe obraId={tela.obraId} obraNome={tela.obraNome} onVoltar={() => setTela(null)} />
        ) : (
          <Diario obraId={tela.obraId} obraNome={tela.obraNome} onVoltar={() => setTela(null)} />
        )
      ) : sessao ? (
        <Hoje userId={sessao.user.id} onAbrir={(tipo, obraId, obraNome) => setTela({ tipo, obraId, obraNome })} />
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
