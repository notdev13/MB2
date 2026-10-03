import type { Session } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { codigoDoLink, contarPendentes, Funcao, minhaSituacao, Situacao } from './src/lib/acesso';
import { supabase } from './src/lib/supabase';
import { Acessos } from './src/screens/Acessos';
import { Aguardando } from './src/screens/Aguardando';
import { TrocarSenha } from './src/screens/TrocarSenha';
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
  const [acessos, setAcessos] = useState(false);
  const [conta, setConta] = useState<{ situacao: Situacao; papel: Funcao } | null | undefined>(undefined);
  const [pendentes, setPendentes] = useState(0);
  const [codigoLink, setCodigoLink] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSessao(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // Link de convite (mb2obras://convite/CODIGO), com o app fechado ou aberto.
  useEffect(() => {
    Linking.getInitialURL().then((url) => setCodigoLink(codigoDoLink(url)));
    const sub = Linking.addEventListener('url', ({ url }) => {
      const c = codigoDoLink(url);
      if (c) setCodigoLink(c);
    });
    return () => sub.remove();
  }, []);

  const userId = sessao?.user.id;
  const verificarConta = useCallback(async () => {
    if (!userId) return setConta(undefined);
    const c = await minhaSituacao(userId);
    // Sem sinal: deixa entrar; o banco continua barrando o que não pode.
    setConta(c ?? { situacao: 'ativo', papel: 'visualizador' });
    setPendentes(c?.papel === 'diretoria' && c.situacao === 'ativo' ? await contarPendentes() : 0);
  }, [userId]);

  useEffect(() => {
    setConta(undefined);
    setTela(null);
    setAcessos(false);
    verificarConta();
  }, [verificarConta]);

  const senhaProvisoria = sessao?.user.user_metadata?.senha_provisoria === true;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style={escuro ? 'light' : 'dark'} />
      {sessao === undefined || (sessao && conta === undefined) ? (
        <ActivityIndicator style={{ flex: 1 }} color={t.accentText} />
      ) : sessao && senhaProvisoria ? (
        <TrocarSenha />
      ) : sessao && conta && conta.situacao !== 'ativo' ? (
        <Aguardando bloqueada={conta.situacao === 'bloqueado'} codigoInicial={codigoLink} onVerificar={verificarConta} />
      ) : sessao && acessos ? (
        <Acessos
          onVoltar={() => {
            setAcessos(false);
            verificarConta();
          }}
        />
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
        <Hoje
          userId={sessao.user.id}
          onAbrir={(tipo, obraId, obraNome) => setTela({ tipo, obraId, obraNome })}
          acessos={conta?.papel === 'diretoria' ? { pendentes, abrir: () => setAcessos(true) } : undefined}
        />
      ) : (
        <Login codigoInicial={codigoLink} />
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
