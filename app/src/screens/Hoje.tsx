import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ALTURA_ABAS, Folha, ItemFolha } from '../components/Abas';
import { CartaoClima } from '../components/CartaoClima';
import { Icone, Nome } from '../components/Icone';
import { Marca } from '../components/Marca';
import { carregarPrevisao, PrevisaoObra } from '../lib/clima';
import { carregarResumo, diasDeFolga, lembrarObra, Resumo } from '../lib/dados';
import { carregarDiariosRecentes, DiarioResumo, hojeISO, pendentes, sincronizar } from '../lib/diario';
import { fonte, Tema, useTema } from '../theme';

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function saudacao(d: Date) {
  const h = d.getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}
const CLIMA = { sol: 'Sol', nublado: 'Nublado', chuva: 'Chuva' } as const;

function rotuloDia(iso: string) {
  const hoje = new Date();
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);
  if (iso === hojeISO(hoje)) return 'Hoje';
  if (iso === hojeISO(ontem)) return 'Ontem';
  const [a, m, d] = iso.split('-').map(Number);
  const data = new Date(a, m - 1, d);
  return `${DIAS[data.getDay()]}, ${d} de ${MESES[m - 1]}`;
}

const hora = (iso: string) => `${new Date(iso).getHours()}h${String(new Date(iso).getMinutes()).padStart(2, '0').replace(/^00$/, '')}`;
const mesAno = (iso: string) => {
  const [a, m] = iso.split('-').map(Number);
  return `${MESES_CURTOS[m - 1]}/${a}`;
};
const plural = (n: number, um: string, varios: string) => (n === 1 ? `1 ${um}` : `${n} ${varios}`);

// Selo do prazo em linguagem simples. Folga de até 1 dia conta como "no prazo".
function seloPrazo(executado: number, previsto: number, folga: number | null) {
  if (folga === null) return executado >= previsto ? { texto: 'No prazo', alerta: false } : { texto: 'Abaixo do previsto', alerta: true };
  if (folga > 1) return { texto: `${folga} dias adiantada`, alerta: false };
  if (folga < -1) return { texto: `${-folga} dias atrasada`, alerta: true };
  return { texto: 'No prazo', alerta: false };
}

export type TelaObra = 'obra' | 'diario' | 'material' | 'ocorrencia' | 'equipe';
type Props = {
  userId: string;
  versao: number; // muda ao voltar de um registro: recarrega
  onAbrir: (tela: TelaObra) => void;
  onObra: (obra: { id: string; nome: string } | null) => void;
  onPerfil: () => void;
  // Só para a diretoria: contas e convites.
  acessos?: { pendentes: number; abrir: () => void };
};

type Pendencia = { chave: string; icone: Nome; titulo: string; sub: string; alerta: boolean; onPress: () => void };

export function Hoje({ userId, versao, onAbrir, onObra, onPerfil, acessos }: Props) {
  const { t } = useTema();
  const insets = useSafeAreaInsets();
  const [dados, setDados] = useState<Resumo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const [naFila, setNaFila] = useState(0);
  const [diarios, setDiarios] = useState<DiarioResumo[]>([]);
  const [aberto, setAberto] = useState<string | null>(null);
  const [escolhendoObra, setEscolhendoObra] = useState(false);
  const [previsao, setPrevisao] = useState<PrevisaoObra | null>(null);
  const hoje = new Date();

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      await sincronizar();
    } catch {}
    setNaFila(await pendentes());
    try {
      const resumo = await carregarResumo(userId);
      setDados(resumo);
      if (resumo.obra) carregarPrevisao(resumo.obra.cidade).then(setPrevisao, () => {});
      setDiarios(resumo.obra ? await carregarDiariosRecentes(resumo.obra.id).catch(() => []) : []);
    } catch {
      setErro('Não foi possível carregar. Verifique a conexão e puxe para atualizar.');
    }
  }, [userId]);

  useEffect(() => {
    carregar();
  }, [carregar, versao]);

  const obraId = dados?.obra?.id;
  const obraNome = dados?.obra?.nome;
  useEffect(() => {
    if (dados) onObra(obraId && obraNome ? { id: obraId, nome: obraNome } : null);
  }, [dados, obraId, obraNome, onObra]);

  async function trocarObra(id: string) {
    setEscolhendoObra(false);
    if (id === dados?.obra?.id) return;
    await lembrarObra(id);
    setDados(null);
    setDiarios([]);
    setPrevisao(null);
    setAberto(null);
    await carregar();
  }

  const obra = dados?.obra;
  const folga = obra ? diasDeFolga(dados.executado, dados.previsto, obra.inicio, obra.termino) : null;
  const selo = dados && seloPrazo(dados.executado, dados.previsto, folga);
  const diarioDeHojeFeito = diarios.some((d) => d.data === hojeISO());

  // O que pede ação de quem abriu o app, do mais urgente ao menos.
  const pendencias: Pendencia[] = [];
  if (obra && dados.ocorrenciasAbertas > 0) {
    pendencias.push({
      chave: 'ocorrencias',
      icone: 'ocorrencia',
      titulo: plural(dados.ocorrenciasAbertas, 'ocorrência aberta', 'ocorrências abertas'),
      sub: 'Nesta obra',
      alerta: true,
      onPress: () => onAbrir('ocorrencia'),
    });
  }
  if (acessos && acessos.pendentes > 0) {
    pendencias.push({
      chave: 'contas',
      icone: 'chave',
      titulo: plural(acessos.pendentes, 'conta aguardando aprovação', 'contas aguardando aprovação'),
      sub: 'Contas e convites',
      alerta: false,
      onPress: acessos.abrir,
    });
  }
  if (obra && !diarioDeHojeFeito && naFila === 0) {
    pendencias.push({
      chave: 'diario',
      icone: 'diario',
      titulo: 'Diário de hoje ainda não feito',
      sub: 'Atividades, efetivo, clima e fotos',
      alerta: false,
      onPress: () => onAbrir('diario'),
    });
  }
  if (naFila > 0) {
    pendencias.push({
      chave: 'fila',
      icone: 'nuvem',
      titulo: `${plural(naFila, 'diário', 'diários')} esperando sinal`,
      sub: 'Toque para tentar enviar agora',
      alerta: false,
      onPress: carregar,
    });
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ backgroundColor: t.bg }}
        contentContainerStyle={[s.conteudo, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + ALTURA_ABAS + 28 }]}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            tintColor={t.muted}
            onRefresh={async () => {
              setAtualizando(true);
              await carregar();
              setAtualizando(false);
            }}
          />
        }
      >
        <View style={s.topo}>
          <Marca />
          <Pressable
            onPress={onPerfil}
            accessibilityRole="button"
            accessibilityLabel="Perfil, tema e sair"
            style={[s.avatar, { borderColor: t.border, backgroundColor: t.surface }]}
          >
            <Text style={[s.avatarTexto, { color: t.text }]}>{dados?.nome ? dados.nome.slice(0, 1).toUpperCase() : '·'}</Text>
          </Pressable>
        </View>

        <View style={{ gap: 4 }}>
          <Text style={[s.rotulo, { color: t.muted }]}>
            {`${DIAS[hoje.getDay()]}, ${hoje.getDate()} de ${MESES[hoje.getMonth()]}`.toUpperCase()}
          </Text>
          <Text style={[s.saudacao, { color: t.text }]} accessibilityRole="header">
            {saudacao(hoje)}
            {dados?.nome ? `, ${dados.nome}` : ''}.
          </Text>
        </View>

        {!dados && !erro && <ActivityIndicator color={t.accentText} style={{ marginTop: 40 }} />}
        {erro && <Text style={[s.aviso, { backgroundColor: t.warnBg, color: t.warnText }]}>{erro}</Text>}

        {dados && !obra && (
          <View style={[s.cartao, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Text style={[s.item, { color: t.text }]}>Você ainda não está em nenhuma obra.</Text>
            <Text style={[s.sub, { color: t.muted }]}>Peça à diretoria para incluir você na equipe de uma obra.</Text>
          </View>
        )}

        {dados && obra && selo && (
          <>
            <View style={[s.obra, { backgroundColor: t.hero, borderColor: t.heroBorder }]}>
              <View style={s.obraTopo}>
                <Text style={[s.rotulo, { color: t.muted }]}>OBRA ATIVA</Text>
                {dados.obras.length > 1 && (
                  <Pressable
                    onPress={() => setEscolhendoObra(true)}
                    accessibilityRole="button"
                    accessibilityLabel={`Trocar de obra. ${dados.obras.length} obras`}
                    hitSlop={6}
                    style={[s.trocar, { borderColor: t.border }]}
                  >
                    <Text style={[s.trocarTexto, { color: t.heroText }]}>Trocar</Text>
                    <Icone nome="abrir" cor={t.heroText} tamanho={14} espessura={2} />
                  </Pressable>
                )}
              </View>

              <View style={{ gap: 2 }}>
                <Text style={[s.obraNome, { color: t.heroText }]}>{obra.nome}</Text>
                {obra.etapaAtual && (
                  <Text style={[s.sub, { color: t.muted, fontSize: 14 }]}>
                    {obra.etapaNumero ? `Etapa ${obra.etapaNumero} de ${obra.etapasTotal} · ` : ''}
                    {obra.etapaAtual}
                  </Text>
                )}
              </View>

              <View style={s.numeros}>
                <View accessible accessibilityLabel={`${dados.executado} por cento executado`}>
                  <Text style={[s.percentual, { color: t.heroText }]}>
                    {dados.executado}
                    <Text style={[s.percentualSinal, { color: t.bronze }]}>%</Text>
                  </Text>
                  <Text style={[s.sub, { color: t.muted, fontSize: 12 }]}>executado</Text>
                </View>
                <View style={[s.selo, { backgroundColor: selo.alerta ? t.warnBg : t.okBg }]}>
                  <Icone nome={selo.alerta ? 'ocorrencia' : 'check'} cor={selo.alerta ? t.warnText : t.okText} tamanho={14} espessura={2.2} />
                  <Text style={[s.seloTexto, { color: selo.alerta ? t.warnText : t.okText }]}>{selo.texto}</Text>
                </View>
              </View>

              <View style={{ gap: 8 }}>
                <View
                  style={[s.trilha, { backgroundColor: t.heroTrack }]}
                  accessible
                  accessibilityLabel={`Executado ${dados.executado}%, previsto para hoje ${dados.previsto}%`}
                >
                  <View style={[s.barra, { width: `${dados.executado}%`, backgroundColor: t.heroBar }]} />
                  <View style={[s.marcador, { left: `${dados.previsto}%`, backgroundColor: t.marcador }]} />
                </View>
                <View style={s.legenda}>
                  <Text style={[s.sub, { color: t.muted, fontSize: 12 }]}>Previsto para hoje: {dados.previsto}%</Text>
                  {obra.termino && <Text style={[s.sub, { color: t.muted, fontSize: 12 }]}>Entrega: {mesAno(obra.termino)}</Text>}
                </View>
              </View>

              <Pressable
                onPress={() => onAbrir('obra')}
                accessibilityRole="button"
                style={({ pressed }) => [s.verCronograma, { borderTopColor: t.border }, pressed && { opacity: 0.7 }]}
              >
                <Text style={[s.link, { color: t.accentText }]}>Ver cronograma</Text>
                <Icone nome="seta" cor={t.accentText} tamanho={16} />
              </Pressable>
            </View>

            <View style={{ gap: 10 }}>
              <View style={s.secaoTopo}>
                <Text style={[s.rotulo, { color: t.muted }]}>PRECISA DE VOCÊ</Text>
                {pendencias.length > 0 && (
                  <View style={[s.contador, { backgroundColor: t.orange }]}>
                    <Text style={[s.contadorTexto, { color: t.bg }]}>{pendencias.length}</Text>
                  </View>
                )}
              </View>
              <View style={[s.lista, { backgroundColor: t.surface, borderColor: t.border }]}>
                {pendencias.length === 0 && (
                  <View style={s.pendencia}>
                    <View style={[s.pendenciaIcone, { backgroundColor: t.okBg }]}>
                      <Icone nome="check" cor={t.okText} />
                    </View>
                    <Text style={[s.item, { color: t.text, flex: 1 }]}>Tudo em dia por aqui.</Text>
                  </View>
                )}
                {pendencias.map((p, i) => (
                  <Pressable
                    key={p.chave}
                    onPress={p.onPress}
                    accessibilityRole="button"
                    style={({ pressed }) => [s.pendencia, i > 0 && { borderTopWidth: 1, borderTopColor: t.divider }, pressed && { opacity: 0.7 }]}
                  >
                    <View style={[s.pendenciaIcone, { backgroundColor: p.alerta ? t.warnBg : t.tint }]}>
                      <Icone nome={p.icone} cor={p.alerta ? t.warnText : t.accentText} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[s.item, { color: t.text }]}>{p.titulo}</Text>
                      <Text style={[s.sub, { color: t.muted }]}>{p.sub}</Text>
                    </View>
                    <Icone nome="seta" cor={t.muted} tamanho={16} />
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={s.atalhos}>
              {(
                [
                  { nome: 'diario', rotulo: 'Diário', tela: 'diario', alerta: false },
                  { nome: 'foto', rotulo: 'Foto', tela: 'diario', alerta: false },
                  { nome: 'material', rotulo: 'Material', tela: 'material', alerta: false },
                  { nome: 'ocorrencia', rotulo: 'Ocorrência', tela: 'ocorrencia', alerta: true },
                ] as const
              ).map((a) => (
                <Pressable
                  key={a.nome}
                  onPress={() => onAbrir(a.tela)}
                  accessibilityRole="button"
                  style={({ pressed }) => [s.atalho, { backgroundColor: t.surface, borderColor: t.border }, pressed && { opacity: 0.7 }]}
                >
                  <Icone nome={a.nome} cor={a.alerta ? t.orange : t.accentText} tamanho={22} />
                  <Text style={[s.atalhoTexto, { color: t.text }]}>{a.rotulo}</Text>
                </Pressable>
              ))}
            </View>

            {previsao && <CartaoClima previsao={previsao} />}

            <View style={{ gap: 10 }}>
              <Text style={[s.rotulo, { color: t.muted }]}>ENTREGAS DE HOJE</Text>
              {dados.entregasHoje.length === 0 ? (
                <Text style={[s.sub, { color: t.muted }]}>Nenhuma entrega marcada para hoje.</Text>
              ) : (
                <View>
                  {dados.entregasHoje.map((p, i) => {
                    const ultima = i === dados.entregasHoje.length - 1;
                    return (
                      <View key={p.id} style={s.entrega}>
                        <View style={s.entregaHora}>
                          <Text style={[s.horaTexto, { color: t.text }]}>{hora(p.entrega_em)}</Text>
                          {!ultima && <View style={[s.fio, { backgroundColor: t.border }]} />}
                        </View>
                        <View style={[s.entregaCorpo, !ultima && { paddingBottom: 18 }]}>
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text style={[s.item, { color: t.text }]}>{p.material}</Text>
                            <Text style={[s.sub, { color: t.muted }]}>
                              {p.quantidade} {p.unidade}
                              {p.fornecedor ? ` · ${p.fornecedor}` : ''}
                            </Text>
                          </View>
                          <EtiquetaEntrega status={p.status} t={t} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={{ gap: 10 }}>
              <Text style={[s.rotulo, { color: t.muted }]}>ÚLTIMOS DIÁRIOS</Text>
              <View style={[s.lista, { backgroundColor: t.surface, borderColor: t.border }]}>
                {diarios.length === 0 && (
                  <Text style={[s.sub, { color: t.muted, padding: 16 }]}>Nenhum diário registrado ainda. Toque no + para fazer o de hoje.</Text>
                )}
                {diarios.map((d, i) => {
                  const ehHoje = d.data === hojeISO();
                  const expandido = aberto === d.id;
                  const detalhes = [
                    d.clima && CLIMA[d.clima],
                    d.efetivoTotal > 0 && plural(d.efetivoTotal, 'pessoa', 'pessoas'),
                    d.fotos.length > 0 && plural(d.fotos.length, 'foto', 'fotos'),
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <Pressable
                      key={d.id}
                      onPress={() => setAberto(expandido ? null : d.id)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: expandido }}
                      style={[s.diario, i > 0 && { borderTopWidth: 1, borderTopColor: t.divider }]}
                    >
                      <View style={s.diarioTopo}>
                        <Text style={[s.item, { color: t.text }]}>{rotuloDia(d.data)}</Text>
                        {ehHoje && (
                          <Pressable onPress={() => onAbrir('diario')} accessibilityRole="button" hitSlop={10}>
                            <Text style={[s.link, { color: t.accentText }]}>Editar</Text>
                          </Pressable>
                        )}
                      </View>
                      {!!detalhes && <Text style={[s.sub, { color: t.muted }]}>{detalhes}</Text>}
                      {!!d.atividades && (
                        <Text style={[s.corpo, { color: t.text }]} numberOfLines={expandido ? undefined : 2}>
                          {d.atividades}
                        </Text>
                      )}
                      {d.fotos.length > 0 && (
                        <View style={s.miniaturas}>
                          {(expandido ? d.fotos : d.fotos.slice(0, 4)).map((url) => (
                            <Image key={url} source={{ uri: url }} style={[expandido ? s.fotoGrande : s.miniatura, { backgroundColor: t.divider }]} />
                          ))}
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <Folha visivel={escolhendoObra} onFechar={() => setEscolhendoObra(false)} titulo="Suas obras">
        {dados?.obras.map((o, i) => (
          <ItemFolha
            key={o.id}
            primeiro={i === 0}
            icone="cronograma"
            rotulo={o.nome}
            selecionado={o.id === dados.obra?.id}
            onPress={() => trocarObra(o.id)}
          />
        ))}
      </Folha>
    </View>
  );
}

function EtiquetaEntrega({ status, t }: { status: string; t: Tema }) {
  const confirmada = status === 'aprovado' || status === 'entregue';
  const texto = status === 'entregue' ? 'Entregue' : status === 'aprovado' ? 'Confirmada' : 'Aguardando';
  return (
    <Text
      style={[
        s.etiqueta,
        confirmada ? { backgroundColor: t.okBg, color: t.okText } : { borderWidth: 1, borderColor: t.orange, color: t.orange },
      ]}
    >
      {texto}
    </Text>
  );
}

const s = StyleSheet.create({
  conteudo: { paddingHorizontal: 20, gap: 22, maxWidth: 640, width: '100%', alignSelf: 'center' },
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontFamily: fonte.forte, fontSize: 16 },
  rotulo: { fontFamily: fonte.forte, fontSize: 11, letterSpacing: 2.5 },
  saudacao: { fontFamily: fonte.tituloLeve, fontSize: 36, lineHeight: 40 },
  aviso: { borderRadius: 14, padding: 14, fontFamily: fonte.media, fontSize: 14, overflow: 'hidden' },
  cartao: { borderRadius: 18, padding: 16, gap: 4, borderWidth: 1 },

  obra: { borderRadius: 22, borderWidth: 1, padding: 20, paddingBottom: 0, gap: 14 },
  obraTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trocar: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, minHeight: 36 },
  trocarTexto: { fontFamily: fonte.forte, fontSize: 13 },
  obraNome: { fontFamily: fonte.titulo, fontSize: 30, lineHeight: 34 },
  numeros: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  percentual: { fontFamily: fonte.titulo, fontSize: 56, lineHeight: 58 },
  percentualSinal: { fontFamily: fonte.titulo, fontSize: 28 },
  selo: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  seloTexto: { fontFamily: fonte.forte, fontSize: 13 },
  trilha: { height: 6, borderRadius: 3 },
  barra: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3 },
  marcador: { position: 'absolute', top: -5, width: 2, height: 16, marginLeft: -1 },
  legenda: { flexDirection: 'row', justifyContent: 'space-between' },
  verCronograma: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 50, borderTopWidth: 1, marginHorizontal: -20, paddingHorizontal: 20 },
  link: { fontFamily: fonte.forte, fontSize: 14 },

  secaoTopo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contador: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  contadorTexto: { fontFamily: fonte.negrito, fontSize: 11 },
  lista: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  pendencia: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, minHeight: 64 },
  pendenciaIcone: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  atalhos: { flexDirection: 'row', gap: 10 },
  atalho: { flex: 1, borderRadius: 16, borderWidth: 1, paddingVertical: 14, alignItems: 'center', gap: 8, minHeight: 76 },
  atalhoTexto: { fontFamily: fonte.forte, fontSize: 12 },

  entrega: { flexDirection: 'row', gap: 14 },
  entregaHora: { width: 48, alignItems: 'center' },
  horaTexto: { fontFamily: fonte.titulo, fontSize: 20, lineHeight: 24 },
  fio: { flex: 1, width: 1, marginTop: 6 },
  entregaCorpo: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  etiqueta: { fontFamily: fonte.forte, fontSize: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, overflow: 'hidden' },

  item: { fontFamily: fonte.forte, fontSize: 15 },
  sub: { fontFamily: fonte.texto, fontSize: 13 },
  diario: { paddingHorizontal: 16, paddingVertical: 14, gap: 6 },
  diarioTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  corpo: { fontFamily: fonte.texto, fontSize: 15, lineHeight: 21 },
  miniaturas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  miniatura: { width: 64, height: 64, borderRadius: 10 },
  fotoGrande: { width: '100%', aspectRatio: 4 / 3, borderRadius: 12 },
});
