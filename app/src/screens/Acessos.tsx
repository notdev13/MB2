import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Share, Text, View } from 'react-native';
import { BotaoPequeno, Campo, Escolha, EscolhaVarias, estilos, Rotulo, TelaRegistro } from '../components/Form';
import {
  aprovarConta,
  bloquearConta,
  cancelarConvite,
  Conta,
  Convite,
  criarContaManual,
  criarConvite,
  ErroAcesso,
  formatarCodigo,
  Funcao,
  FUNCOES,
  listarContas,
  listarConvites,
  listarObras,
  O_QUE_FAZ,
  ObraCurta,
  textoDoConvite,
} from '../lib/acesso';
import { avisar, confirmar } from '../lib/aviso';
import { useTema } from '../theme';

type Aba = 'contas' | 'convites' | 'criar';
const ABAS: { valor: Aba; rotulo: string }[] = [
  { valor: 'contas', rotulo: 'Contas' },
  { valor: 'convites', rotulo: 'Convites' },
  { valor: 'criar', rotulo: 'Criar conta' },
];
const OPCOES_FUNCAO = (['engenheiro', 'mestre', 'visualizador', 'diretoria'] as Funcao[]).map((f) => ({ valor: f, rotulo: FUNCOES[f] }));
const SITUACAO = { pendente: 'Aguardando aprovação', ativo: 'Ativa', bloqueado: 'Bloqueada' } as const;

const SEM_SINAL = 'Sem sinal ou o servidor não respondeu. Tente de novo.';
const mensagem = (e: unknown) => (e instanceof ErroAcesso ? e.message : SEM_SINAL);

async function compartilhar(texto: string) {
  if (Platform.OS === 'web') {
    const nav = globalThis.navigator as Navigator | undefined;
    try {
      await nav?.clipboard?.writeText(texto);
      avisar('Convite copiado', 'Cole na conversa do WhatsApp ou no e-mail da pessoa.');
    } catch {
      avisar('Envie este texto', texto);
    }
    return;
  }
  await Share.share({ message: texto });
}

type Props = { onVoltar: () => void };

export function Acessos({ onVoltar }: Props) {
  const { t } = useTema();
  const [aba, setAba] = useState<Aba>('contas');
  const [obras, setObras] = useState<ObraCurta[]>([]);
  const [contas, setContas] = useState<Conta[] | null>(null);
  const [convites, setConvites] = useState<Convite[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  // Formulário de convite / conta manual
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [funcao, setFuncao] = useState<Funcao>('mestre');
  const [obrasEscolhidas, setObrasEscolhidas] = useState<string[]>([]);

  // Aprovação de uma conta pendente
  const [aprovando, setAprovando] = useState<string | null>(null);
  const [funcaoAprovar, setFuncaoAprovar] = useState<Funcao>('mestre');
  const [obrasAprovar, setObrasAprovar] = useState<string[]>([]);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const o = await listarObras();
      setObras(o);
      const [c, v] = await Promise.all([listarContas(), listarConvites(o)]);
      setContas(c);
      setConvites(v);
    } catch (e) {
      setContas((c) => c ?? []);
      setConvites((v) => v ?? []);
      setErro(mensagem(e));
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const opcoesObras = obras.map((o) => ({ valor: o.id, rotulo: o.nome }));
  const precisaObra = (f: Funcao) => f !== 'diretoria';

  function limparFormulario() {
    setNome('');
    setEmail('');
    setSenha('');
    setObrasEscolhidas([]);
  }

  function validar(manual: boolean): string | null {
    if (!nome.trim()) return 'Escreva o nome da pessoa.';
    const e = email.trim();
    if (manual && !e) return 'Para criar a conta, o e-mail é obrigatório.';
    if (e && !/^\S+@\S+\.\S+$/.test(e)) return 'O e-mail parece incompleto.';
    if (manual && senha.length < 8) return 'A senha provisória precisa ter pelo menos 8 letras ou números.';
    if (precisaObra(funcao) && obrasEscolhidas.length === 0) return 'Escolha pelo menos uma obra.';
    return null;
  }

  async function gerarConvite() {
    const falta = validar(false);
    if (falta) return avisar('Falta algo', falta);
    setOcupado(true);
    try {
      const obrasDoConvite = precisaObra(funcao) ? obrasEscolhidas : [];
      const codigo = await criarConvite(nome, email, funcao, obrasDoConvite);
      const expira = new Date(Date.now() + 7 * 86400000).toISOString();
      const texto = textoDoConvite({ codigo, nome, papel: funcao, expira_em: expira });
      limparFormulario();
      await carregar();
      await compartilhar(texto);
    } catch (e) {
      avisar('Não foi possível gerar o convite', mensagem(e));
    } finally {
      setOcupado(false);
    }
  }

  async function criarManual() {
    const falta = validar(true);
    if (falta) return avisar('Falta algo', falta);
    setOcupado(true);
    try {
      const quem = nome.trim();
      const r = await criarContaManual({ nome, email, senha, papel: funcao, obras: precisaObra(funcao) ? obrasEscolhidas : [] });
      limparFormulario();
      await carregar();
      avisar(
        'Conta criada',
        `${quem} já pode entrar com o e-mail e a senha provisória. No primeiro acesso o app pede uma senha nova.` +
          (r.precisaConfirmarEmail ? '\n\nAntes, a pessoa precisa tocar no link de confirmação que chegou no e-mail dela.' : ''),
      );
    } catch (e) {
      avisar('Não foi possível criar a conta', mensagem(e));
    } finally {
      setOcupado(false);
    }
  }

  function abrirAprovacao(c: Conta) {
    setAprovando(c.id);
    setFuncaoAprovar(c.papel === 'diretoria' ? 'diretoria' : c.papel === 'visualizador' ? 'mestre' : c.papel);
    setObrasAprovar([]);
  }

  async function confirmarAprovacao(c: Conta) {
    if (precisaObra(funcaoAprovar) && obrasAprovar.length === 0) return avisar('Falta algo', 'Escolha pelo menos uma obra.');
    try {
      await aprovarConta(c.id, funcaoAprovar, precisaObra(funcaoAprovar) ? obrasAprovar : []);
      setAprovando(null);
      await carregar();
    } catch (e) {
      avisar('Não foi possível aprovar', mensagem(e));
    }
  }

  function bloquear(c: Conta) {
    const texto = c.situacao === 'pendente' ? `${c.nome} não terá acesso ao app.` : `${c.nome} perde o acesso a todas as obras.`;
    confirmar(c.situacao === 'pendente' ? 'Recusar conta?' : 'Bloquear conta?', texto, c.situacao === 'pendente' ? 'Recusar' : 'Bloquear', async () => {
      try {
        await bloquearConta(c.id);
        await carregar();
      } catch (e) {
        avisar('Não foi possível bloquear', mensagem(e));
      }
    });
  }

  function cancelar(v: Convite) {
    confirmar('Cancelar convite?', `O código ${formatarCodigo(v.codigo)} de ${v.nome} deixa de funcionar.`, 'Cancelar convite', async () => {
      try {
        await cancelarConvite(v.codigo);
        await carregar();
      } catch (e) {
        avisar('Não foi possível cancelar', mensagem(e));
      }
    });
  }

  const formulario = (manual: boolean) => (
    <>
      <Rotulo>NOME</Rotulo>
      <Campo value={nome} onChangeText={setNome} autoCapitalize="words" placeholder="Nome e sobrenome" accessibilityLabel="Nome" />
      <Rotulo>{manual ? 'E-MAIL' : 'E-MAIL (OPCIONAL)'}</Rotulo>
      <Campo
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="nome@email.com"
        accessibilityLabel="E-mail"
      />
      {!manual && <Text style={[estilos.sub, { color: t.muted }]}>Com e-mail, só essa pessoa consegue usar o convite.</Text>}
      {manual && (
        <>
          <Rotulo>SENHA PROVISÓRIA</Rotulo>
          <Campo value={senha} onChangeText={setSenha} autoCapitalize="none" placeholder="Mínimo 8 letras ou números" accessibilityLabel="Senha provisória" />
          <Text style={[estilos.sub, { color: t.muted }]}>Passe a senha para a pessoa. No primeiro acesso o app pede uma senha nova.</Text>
        </>
      )}
      <Rotulo>FUNÇÃO</Rotulo>
      <Escolha opcoes={OPCOES_FUNCAO} valor={funcao} onMudar={setFuncao} />
      <Text style={[estilos.sub, { color: t.muted }]}>{O_QUE_FAZ[funcao]}</Text>
      {precisaObra(funcao) && (
        <>
          <Rotulo>OBRAS</Rotulo>
          {obras.length === 0 ? (
            <Text style={[estilos.sub, { color: t.muted }]}>Nenhuma obra cadastrada ainda.</Text>
          ) : (
            <EscolhaVarias opcoes={opcoesObras} valores={obrasEscolhidas} onMudar={setObrasEscolhidas} />
          )}
        </>
      )}
    </>
  );

  const pendentes = contas?.filter((c) => c.situacao === 'pendente').length ?? 0;

  return (
    <TelaRegistro
      titulo="Contas e convites"
      subtitulo={pendentes > 0 ? `${pendentes} aguardando aprovação` : 'Diretoria'}
      onVoltar={onVoltar}
      botao={aba === 'convites' ? 'Gerar convite e enviar' : aba === 'criar' ? 'Criar conta' : 'Atualizar lista'}
      onBotao={aba === 'convites' ? gerarConvite : aba === 'criar' ? criarManual : carregar}
      ocupado={ocupado}
    >
      <Escolha opcoes={ABAS} valor={aba} onMudar={setAba} />
      {erro && <Text style={[estilos.sub, { color: t.danger }]}>{erro}</Text>}

      {aba === 'contas' && (
        <>
          <Text style={[estilos.sub, { color: t.muted }]}>
            Quem cria conta sem convite fica aguardando. Aprove escolhendo a função e as obras.
          </Text>
          <View style={[estilos.cartao, { backgroundColor: t.surface }]}>
            {contas === null && <ActivityIndicator color={t.accentText} style={{ padding: 16 }} />}
            {contas?.length === 0 && !erro && <Text style={[estilos.sub, { color: t.muted, padding: 16 }]}>Nenhuma conta ainda.</Text>}
            {contas?.map((c, i) => (
              <View key={c.id} style={[estilos.linha, i > 0 && { borderTopWidth: 1, borderTopColor: t.divider }]}>
                <Text style={[estilos.item, { color: t.text }]}>{c.nome}</Text>
                {!!c.email && c.email !== c.nome && <Text style={[estilos.sub, { color: t.muted }]}>{c.email}</Text>}
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  <Text
                    style={[
                      estilos.etiqueta,
                      c.situacao === 'pendente'
                        ? { backgroundColor: t.warnBg, color: t.warnText }
                        : c.situacao === 'bloqueado'
                          ? { backgroundColor: t.divider, color: t.muted }
                          : { backgroundColor: t.tint, color: t.accentText },
                    ]}
                  >
                    {c.situacao === 'ativo' ? FUNCOES[c.papel] : SITUACAO[c.situacao]}
                  </Text>
                </View>
                {c.situacao === 'ativo' && c.obras.length > 0 && <Text style={[estilos.sub, { color: t.muted }]}>{c.obras.join(' · ')}</Text>}

                {aprovando === c.id ? (
                  <View style={{ gap: 8, marginTop: 6 }}>
                    <Rotulo>FUNÇÃO</Rotulo>
                    <Escolha opcoes={OPCOES_FUNCAO} valor={funcaoAprovar} onMudar={setFuncaoAprovar} />
                    <Text style={[estilos.sub, { color: t.muted }]}>{O_QUE_FAZ[funcaoAprovar]}</Text>
                    {precisaObra(funcaoAprovar) && (
                      <>
                        <Rotulo>OBRAS</Rotulo>
                        <EscolhaVarias opcoes={opcoesObras} valores={obrasAprovar} onMudar={setObrasAprovar} />
                      </>
                    )}
                    <View style={estilos.acoes}>
                      <BotaoPequeno rotulo="Confirmar" onPress={() => confirmarAprovacao(c)} />
                      <BotaoPequeno rotulo="Voltar" tom="neutro" onPress={() => setAprovando(null)} />
                    </View>
                  </View>
                ) : (
                  <View style={estilos.acoes}>
                    {c.situacao === 'pendente' && <BotaoPequeno rotulo="Aprovar" onPress={() => abrirAprovacao(c)} />}
                    {c.situacao === 'bloqueado' && <BotaoPequeno rotulo="Reativar" onPress={() => abrirAprovacao(c)} />}
                    {c.situacao !== 'bloqueado' && c.papel !== 'diretoria' && (
                      <BotaoPequeno rotulo={c.situacao === 'pendente' ? 'Recusar' : 'Bloquear'} tom="neutro" onPress={() => bloquear(c)} />
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        </>
      )}

      {aba === 'convites' && (
        <>
          <Text style={[estilos.sub, { color: t.muted }]}>
            O convite já leva a função e as obras. A pessoa cria a conta com o código e entra liberada, sem esperar aprovação.
          </Text>
          {formulario(false)}
          <Rotulo>CONVITES EM ABERTO</Rotulo>
          <View style={[estilos.cartao, { backgroundColor: t.surface }]}>
            {convites === null && <ActivityIndicator color={t.accentText} style={{ padding: 16 }} />}
            {convites?.length === 0 && <Text style={[estilos.sub, { color: t.muted, padding: 16 }]}>Nenhum convite em aberto.</Text>}
            {convites?.map((v, i) => (
              <View key={v.codigo} style={[estilos.linha, i > 0 && { borderTopWidth: 1, borderTopColor: t.divider }]}>
                <Text style={[estilos.item, { color: t.text }]}>{v.nome}</Text>
                <Text style={[estilos.sub, { color: t.muted }]}>
                  {FUNCOES[v.papel]} · código {formatarCodigo(v.codigo)} · vale até{' '}
                  {new Date(v.expira_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </Text>
                {v.obras.length > 0 && <Text style={[estilos.sub, { color: t.muted }]}>{v.obras.join(' · ')}</Text>}
                <View style={estilos.acoes}>
                  <BotaoPequeno rotulo="Enviar de novo" onPress={() => compartilhar(textoDoConvite(v))} />
                  <BotaoPequeno rotulo="Cancelar" tom="neutro" onPress={() => cancelar(v)} />
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {aba === 'criar' && (
        <>
          <Text style={[estilos.sub, { color: t.muted }]}>
            Para quem não vai criar a conta sozinho. Você define e-mail e senha provisória e passa para a pessoa.
          </Text>
          {formulario(true)}
        </>
      )}
    </TelaRegistro>
  );
}
