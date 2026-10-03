import type { Session } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// Importa só os pesos usados (o pacote inteiro somaria ~20 arquivos de fonte ao app).
import { CormorantGaramond_500Medium } from '@expo-google-fonts/cormorant-garamond/500Medium';
import { CormorantGaramond_600SemiBold } from '@expo-google-fonts/cormorant-garamond/600SemiBold';
import { Manrope_400Regular } from '@expo-google-fonts/manrope/400Regular';
import { Manrope_500Medium } from '@expo-google-fonts/manrope/500Medium';
import { Manrope_600SemiBold } from '@expo-google-fonts/manrope/600SemiBold';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
import { useFonts } from 'expo-font';
import { Aba, BarraAbas, Folha, ItemFolha, MenuLateral } from './src/components/Abas';
import { codigoDoLink, contarPendentes, Funcao, minhaSituacao, Situacao } from './src/lib/acesso';
import { lembrarObra } from './src/lib/dados';
import { carregarPendencias } from './src/lib/pendencias';
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
import { Painel } from './src/screens/Painel';
import { Pendencias } from './src/screens/Pendencias';
import { Login } from './src/screens/Login';
import { TemaProvider, useTema } from './src/theme';

function Raiz() {
  const { t, escuro, alternar } = useTema();
  // Computador ou tablet deitado: menu lateral e Painel da carteira.
  const largo = useWindowDimensions().width >= 1024;
  const [sessao, setSessao] = useState<Session | null | undefined>(undefined);
  const [tela, setTela] = useState<{ tipo: Exclude<TelaObra, 'obra'>; obraId: string; obraNome: string } | null>(null);
  const [acessos, setAcessos] = useState(false);
  const [conta, setConta] = useState<{ situacao: Situacao; papel: Funcao } | null | undefined>(undefined);
  const [pendentes, setPendentes] = useState(0);
  const [codigoLink, setCodigoLink] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>('hoje');
  const [folha, setFolha] = useState<'registrar' | 'mais' | null>(null);
  const [obraAtual, setObraAtual] = useState<{ id: string; nome: string } | null>(null);
  const [versao, setVersao] = useState(0);
  const [nPendencias, setNPendencias] = useState(0);

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
    setAba(largo ? 'painel' : 'hoje');
    setFolha(null);
    verificarConta();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a aba inicial só é escolhida ao entrar
  }, [verificarConta]);

  const diretoria = conta?.papel === 'diretoria';
  const contaAtiva = conta?.situacao === 'ativo';
  // Número no ícone de Pendências, mesmo antes de abrir a aba.
  useEffect(() => {
    if (!userId || !contaAtiva) return setNPendencias(0);
    carregarPendencias(diretoria).then((l) => setNPendencias(l.length), () => {});
  }, [userId, contaAtiva, diretoria, versao]);

  const senhaProvisoria = sessao?.user.user_metadata?.senha_provisoria === true;
  const fecharTela = () => {
    setTela(null);
    setVersao((v) => v + 1); // a tela Hoje recarrega ao voltar de um registro
  };
  const abrir = (tipo: TelaObra) => {
    setFolha(null);
    if (!obraAtual) return;
    if (tipo === 'obra') return setAba('obra');
    setTela({ tipo, obraId: obraAtual.id, obraNome: obraAtual.nome });
  };
  const abrirObraDoPainel = async (o: { id: string; nome: string }) => {
    await lembrarObra(o.id);
    setObraAtual(o);
    setVersao((v) => v + 1); // Hoje passa a mostrar a obra escolhida
    setAba('obra');
  };
  const abrirDePendencias = (tipo: 'material' | 'ocorrencia', o: { id: string; nome: string }) =>
    setTela({ tipo, obraId: o.id, obraNome: o.nome });
  // No celular não existe Painel: cai em Hoje.
  const abaVisivel: Aba = !largo && aba === 'painel' ? 'hoje' : aba;

  if (sessao === undefined || (sessao && conta === undefined)) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <ActivityIndicator style={{ flex: 1 }} color={t.accentText} />
      </View>
    );
  }
  if (!sessao) return <Login codigoInicial={codigoLink} />;
  if (senhaProvisoria) return <TrocarSenha />;
  if (conta && conta.situacao !== 'ativo') {
    return <Aguardando bloqueada={conta.situacao === 'bloqueado'} codigoInicial={codigoLink} onVerificar={verificarConta} />;
  }
  if (acessos) {
    return (
      <Acessos
        onVoltar={() => {
          setAcessos(false);
          verificarConta();
        }}
      />
    );
  }
  if (tela) {
    const props = { obraId: tela.obraId, obraNome: tela.obraNome, onVoltar: fecharTela };
    if (tela.tipo === 'material') return <Material {...props} />;
    if (tela.tipo === 'ocorrencia') return <Ocorrencia {...props} />;
    if (tela.tipo === 'equipe') return <Equipe {...props} />;
    return <Diario {...props} />;
  }

  const telas = (
    <View style={{ flex: 1 }}>
      {largo && abaVisivel === 'painel' && (
        <Painel versao={versao} pendencias={nPendencias} onAbrirObra={abrirObraDoPainel} onPendencias={() => setAba('pendencias')} />
      )}
      {/* Hoje fica montada ao trocar de aba, para não recarregar tudo a cada toque. */}
      <View style={{ flex: 1, display: abaVisivel === 'hoje' ? 'flex' : 'none' }}>
        <Hoje
          userId={sessao.user.id}
          versao={versao}
          onAbrir={(tipo) => abrir(tipo)}
          onObra={setObraAtual}
          onPerfil={() => setFolha('mais')}
          acessos={diretoria ? { pendentes, abrir: () => setAcessos(true) } : undefined}
        />
      </View>
      {abaVisivel === 'obra' &&
        (obraAtual ? (
          <Obra obraId={obraAtual.id} onVoltar={() => setAba('hoje')} comAbas />
        ) : (
          <ActivityIndicator style={{ flex: 1 }} color={t.accentText} />
        ))}
      {abaVisivel === 'pendencias' && (
        <Pendencias
          diretoria={diretoria}
          versao={versao}
          largo={largo}
          onContagem={setNPendencias}
          onAbrir={abrirDePendencias}
          onContas={() => setAcessos(true)}
        />
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, flexDirection: largo ? 'row' : 'column' }}>
      {largo && (
        <MenuLateral
          ativa={abaVisivel}
          onAba={setAba}
          onRegistrar={() => setFolha('registrar')}
          obraNome={obraAtual?.nome ?? null}
          pendencias={nPendencias}
          extras={[
            { icone: 'equipe', rotulo: 'Equipe da obra', onPress: () => abrir('equipe') },
            ...(diretoria ? [{ icone: 'chave' as const, rotulo: 'Contas e convites', aviso: pendentes > 0, onPress: () => setAcessos(true) }] : []),
            { icone: escuro ? 'sol' : 'lua', rotulo: escuro ? 'Tema claro' : 'Tema escuro', onPress: alternar },
            { icone: 'sair', rotulo: 'Sair', onPress: () => supabase.auth.signOut() },
          ]}
        />
      )}
      {telas}

      {!largo && (
        <BarraAbas
          ativa={abaVisivel}
          onAba={setAba}
          onRegistrar={() => setFolha('registrar')}
          onMais={() => setFolha('mais')}
          avisoMais={diretoria && pendentes > 0}
          pendencias={nPendencias}
        />
      )}

      <Folha visivel={folha === 'registrar'} onFechar={() => setFolha(null)} titulo={obraAtual ? `Registrar · ${obraAtual.nome}` : 'Registrar'}>
        <ItemFolha primeiro icone="diario" rotulo="Diário de hoje" sub="Atividades, efetivo e clima" onPress={() => abrir('diario')} />
        <ItemFolha icone="foto" rotulo="Foto" sub="Anexada ao diário de hoje" onPress={() => abrir('diario')} />
        <ItemFolha icone="material" rotulo="Pedir material" sub="Com data de entrega" onPress={() => abrir('material')} />
        <ItemFolha icone="ocorrencia" alerta rotulo="Ocorrência" sub="Problema, risco ou não conformidade" onPress={() => abrir('ocorrencia')} />
      </Folha>

      <Folha visivel={folha === 'mais'} onFechar={() => setFolha(null)} titulo="Mais">
        <ItemFolha primeiro icone="equipe" rotulo="Equipe da obra" sub={obraAtual?.nome} onPress={() => abrir('equipe')} />
        {diretoria && (
          <ItemFolha
            icone="chave"
            alerta={pendentes > 0}
            rotulo="Contas e convites"
            sub={pendentes === 0 ? 'Aprovar contas e gerar convites' : pendentes === 1 ? '1 conta aguardando aprovação' : `${pendentes} contas aguardando aprovação`}
            onPress={() => {
              setFolha(null);
              setAcessos(true);
            }}
          />
        )}
        <ItemFolha
          icone={escuro ? 'sol' : 'lua'}
          rotulo={escuro ? 'Usar tema claro' : 'Usar tema escuro'}
          sub={escuro ? 'Melhor no sol forte' : 'Mais confortável à noite'}
          onPress={alternar}
        />
        <ItemFolha
          icone="sair"
          rotulo="Sair"
          onPress={() => {
            setFolha(null);
            supabase.auth.signOut();
          }}
        />
      </Folha>
    </View>
  );
}

function BarraStatus() {
  const { escuro } = useTema();
  return <StatusBar style={escuro ? 'light' : 'dark'} />;
}

export default function App() {
  // Se a fonte falhar, o app segue com a do sistema em vez de travar na abertura.
  const [fontesOk, erroFontes] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
  });
  if (!fontesOk && !erroFontes) return null;
  return (
    <SafeAreaProvider>
      <TemaProvider>
        <BarraStatus />
        <Raiz />
      </TemaProvider>
    </SafeAreaProvider>
  );
}
