import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Text, View } from 'react-native';
import { BotaoPequeno, Campo, Escolha, estilos, Rotulo, TelaRegistro } from '../components/Form';
import { adicionarMembro, ErroEquipe, listarEquipe, Membro, PapelObra, PAPEIS, removerMembro } from '../lib/equipe';
import { podeAprovar } from '../lib/obra';
import { supabase } from '../lib/supabase';
import { useTema } from '../theme';

const OPCOES = (['engenheiro', 'mestre', 'visualizador', 'responsavel'] as PapelObra[]).map((p) => ({ valor: p, rotulo: PAPEIS[p] }));

const SEM_SINAL = 'Sem sinal ou o servidor não respondeu. Tente de novo.';
const mensagem = (e: unknown) => (e instanceof ErroEquipe ? e.message : SEM_SINAL);

// No navegador o Alert do React Native não aparece; usa o aviso do próprio navegador.
const web = globalThis as { alert?: (m: string) => void; confirm?: (m: string) => boolean };
function avisar(titulo: string, texto: string) {
  if (Platform.OS === 'web') web.alert?.(`${titulo}\n\n${texto}`);
  else Alert.alert(titulo, texto);
}

type Props = { obraId: string; obraNome: string; onVoltar: () => void };

export function Equipe({ obraId, obraNome, onVoltar }: Props) {
  const { t } = useTema();
  const [email, setEmail] = useState('');
  const [papel, setPapel] = useState<PapelObra>('mestre');
  const [salvando, setSalvando] = useState(false);
  const [membros, setMembros] = useState<Membro[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aprovador, setAprovador] = useState(false);
  const [meuId, setMeuId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      setMembros(await listarEquipe(obraId));
    } catch (e) {
      setMembros([]);
      setErro(mensagem(e));
    }
  }, [obraId]);

  useEffect(() => {
    carregar();
    podeAprovar(obraId).then(setAprovador);
    supabase.auth.getSession().then(({ data }) => setMeuId(data.session?.user.id ?? null));
  }, [carregar, obraId]);

  // Só responsável ou diretoria (que pode não estar na lista) mexem no responsável — mesma regra do banco.
  const eu = membros?.find((m) => m.perfil_id === meuId);
  const mandaNoResponsavel = aprovador && (!eu || eu.papel === 'responsavel');
  const opcoes = mandaNoResponsavel ? OPCOES : OPCOES.filter((o) => o.valor !== 'responsavel');

  async function adicionar() {
    if (!aprovador) return carregar();
    const e = email.trim();
    if (!e || !e.includes('@')) return avisar('Falta o e-mail', 'Escreva o e-mail que a pessoa usou para criar a conta no app.');
    setSalvando(true);
    try {
      const nome = await adicionarMembro(obraId, e, papel);
      setEmail('');
      await carregar();
      avisar('Pronto', `${nome} agora está na equipe como ${PAPEIS[papel]}.`);
    } catch (err) {
      avisar('Não foi possível adicionar', mensagem(err));
    } finally {
      setSalvando(false);
    }
  }

  function remover(m: Membro) {
    const tirar = async () => {
      try {
        await removerMembro(obraId, m.perfil_id);
        await carregar();
      } catch (err) {
        avisar('Não foi possível remover', mensagem(err));
      }
    };
    const texto = `${m.nome} deixa de ver esta obra.`;
    if (Platform.OS === 'web') {
      if (web.confirm?.(`Tirar da equipe?\n\n${texto}`)) tirar();
      return;
    }
    Alert.alert('Tirar da equipe?', texto, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: tirar },
    ]);
  }

  return (
    <TelaRegistro
      titulo="Equipe da obra"
      subtitulo={obraNome}
      onVoltar={onVoltar}
      botao={aprovador ? 'Adicionar à equipe' : 'Atualizar lista'}
      onBotao={adicionar}
      ocupado={salvando}
    >
      {aprovador && (
        <>
          <Rotulo>E-MAIL DA PESSOA</Rotulo>
          <Campo
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="nome@email.com"
            accessibilityLabel="E-mail da pessoa"
          />
          <Text style={[estilos.sub, { color: t.muted }]}>A pessoa precisa ter criado a conta no app antes.</Text>
          <Rotulo>PAPEL NA OBRA</Rotulo>
          <Escolha opcoes={opcoes} valor={papel} onMudar={setPapel} />
        </>
      )}

      <Rotulo>QUEM ESTÁ NA OBRA</Rotulo>
      {erro && <Text style={[estilos.sub, { color: t.danger }]}>{erro}</Text>}
      <View style={[estilos.cartao, { backgroundColor: t.surface }]}>
        {membros === null && <ActivityIndicator color={t.accentText} style={{ padding: 16 }} />}
        {membros?.length === 0 && !erro && <Text style={[estilos.sub, { color: t.muted, padding: 16 }]}>Ninguém na equipe ainda.</Text>}
        {membros?.map((m, i) => {
          const souEu = m.perfil_id === meuId;
          const podeTirar = aprovador && !souEu && (m.papel !== 'responsavel' || mandaNoResponsavel);
          return (
            <View key={m.perfil_id} style={[estilos.linha, i > 0 && { borderTopWidth: 1, borderTopColor: t.divider }]}>
              <Text style={[estilos.item, { color: t.text }]}>
                {m.nome}
                {souEu ? ' (você)' : ''}
              </Text>
              {!!m.email && m.email !== m.nome && <Text style={[estilos.sub, { color: t.muted }]}>{m.email}</Text>}
              <Text style={[estilos.etiqueta, { backgroundColor: t.tint, color: t.accentText }]}>{PAPEIS[m.papel]}</Text>
              {podeTirar && (
                <View style={estilos.acoes}>
                  <BotaoPequeno rotulo="Remover" tom="neutro" onPress={() => remover(m)} />
                </View>
              )}
            </View>
          );
        })}
      </View>
    </TelaRegistro>
  );
}
