import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icone } from '../components/Icone';
import { carregarResumo, Resumo } from '../lib/dados';
import { carregarDiariosRecentes, DiarioResumo, hojeISO, pendentes, sincronizar } from '../lib/diario';
import { supabase } from '../lib/supabase';
import { useTema } from '../theme';

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

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

const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export type TelaObra = 'obra' | 'diario' | 'material' | 'ocorrencia' | 'equipe';
type Props = { userId: string; onAbrir: (tela: TelaObra, obraId: string, obraNome: string) => void };

export function Hoje({ userId, onAbrir }: Props) {
  const { t, escuro, alternar } = useTema();
  const insets = useSafeAreaInsets();
  const [dados, setDados] = useState<Resumo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const [naFila, setNaFila] = useState(0);
  const [diarios, setDiarios] = useState<DiarioResumo[]>([]);
  const [aberto, setAberto] = useState<string | null>(null);
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
      setDiarios(resumo.obra ? await carregarDiariosRecentes(resumo.obra.id).catch(() => []) : []);
    } catch {
      setErro('Não foi possível carregar. Verifique a conexão e puxe para atualizar.');
    }
  }, [userId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const acoes = [
    { nome: 'diario' as const, rotulo: 'Diário', alerta: false },
    { nome: 'foto' as const, rotulo: 'Foto', alerta: false },
    { nome: 'material' as const, rotulo: 'Material', alerta: false },
    { nome: 'ocorrencia' as const, rotulo: 'Ocorrência', alerta: true },
  ];

  return (
    <ScrollView
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={[s.conteudo, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
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
        <View style={{ gap: 2, flexShrink: 1 }}>
          <View style={s.marca}>
            <View style={[s.quadrado, { backgroundColor: t.orange }]} />
            <Text style={[s.mb2, { color: t.text }]}>MB2 <Text style={{ fontWeight: '300', color: t.muted }}>Obras</Text></Text>
          </View>
          <Text style={[s.data, { color: t.muted }]}>
            {DIAS[hoje.getDay()]}, {hoje.getDate()} de {MESES[hoje.getMonth()]}
          </Text>
          <Text style={[s.titulo, { color: t.text }]}>
            {saudacao(hoje)}{dados?.nome ? `, ${dados.nome}` : ''}
          </Text>
        </View>
        <View style={s.botoesTopo}>
          <Pressable
            onPress={alternar}
            accessibilityRole="button"
            accessibilityLabel={escuro ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            style={[s.redondo, { borderColor: t.border, backgroundColor: t.surface }]}
          >
            <Icone nome={escuro ? 'sol' : 'lua'} cor={t.text} />
          </Pressable>
          <Pressable
            onPress={() => supabase.auth.signOut()}
            accessibilityRole="button"
            accessibilityLabel="Sair"
            style={[s.redondo, { borderColor: t.border, backgroundColor: t.surface }]}
          >
            <Icone nome="sair" cor={t.text} />
          </Pressable>
        </View>
      </View>

      {!dados && !erro && <ActivityIndicator color={t.accentText} style={{ marginTop: 40 }} />}
      {erro && <Text style={[s.aviso, { backgroundColor: t.warnBg, color: t.warnText }]}>{erro}</Text>}

      {dados && !dados.obra && (
        <View style={[s.cartao, { backgroundColor: t.surface }]}>
          <Text style={[s.item, { color: t.text }]}>Você ainda não está em nenhuma obra.</Text>
          <Text style={[s.sub, { color: t.muted }]}>Peça à diretoria para incluir você na equipe de uma obra.</Text>
        </View>
      )}

      {dados?.obra && (
        <>
          <Pressable
            onPress={() => onAbrir('obra', dados.obra!.id, dados.obra!.nome)}
            accessibilityRole="button"
            accessibilityLabel={`${dados.obra.nome}. Ver cronograma`}
            style={[s.hero, { backgroundColor: t.hero, borderColor: t.heroBorder }]}
          >
            <Text style={[s.heroRotulo, { color: t.heroText }]}>OBRA ATIVA</Text>
            <Text style={[s.heroNome, { color: t.heroText }]}>{dados.obra.nome}</Text>
            {dados.obra.etapaAtual && <Text style={[s.heroEtapa, { color: t.heroText }]}>{dados.obra.etapaAtual}</Text>}
            <View style={s.heroLinha}>
              <Text style={[s.heroNum, { color: t.heroText }]}>Executado {dados.executado}%</Text>
              <Text style={[s.heroNum, { color: t.heroText, opacity: 0.8 }]}>Previsto {dados.previsto}%</Text>
            </View>
            <View style={[s.trilha, { backgroundColor: t.heroTrack }]}>
              <View style={[s.barra, { width: `${dados.executado}%`, backgroundColor: t.heroBar }]} />
              <View style={[s.marcador, { left: `${dados.previsto}%`, backgroundColor: t.orange }]} />
            </View>
            <Text style={[s.heroLink, { color: t.heroText }]}>Ver cronograma ›</Text>
          </Pressable>

          <View style={s.acoes}>
            {acoes.map((a) => (
              <Pressable
                key={a.nome}
                onPress={() => dados.obra && onAbrir(a.nome === 'foto' ? 'diario' : a.nome, dados.obra.id, dados.obra.nome)}
                accessibilityRole="button"
                style={[s.acao, { backgroundColor: t.surface }]}
              >
                <View style={[s.acaoIcone, { backgroundColor: a.alerta ? t.warnBg : t.tint }]}>
                  <Icone nome={a.nome} cor={a.alerta ? t.warnText : t.accentText} />
                </View>
                <Text style={[s.acaoTexto, { color: t.text }]}>{a.rotulo}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={() => onAbrir('equipe', dados.obra!.id, dados.obra!.nome)}
            accessibilityRole="button"
            style={[s.cartao, s.equipe, { backgroundColor: t.surface }]}
          >
            <Text style={[s.item, { color: t.text, flex: 1 }]}>Equipe da obra</Text>
            <Icone nome="seta" cor={t.muted} />
          </Pressable>

          {naFila > 0 && (
            <Text style={[s.aviso, { backgroundColor: t.warnBg, color: t.warnText }]}>
              {naFila === 1 ? '1 diário' : `${naFila} diários`} salvo no aparelho, esperando sinal para enviar.
            </Text>
          )}

          {dados.ocorrenciasAbertas > 0 && (
            <Pressable onPress={() => onAbrir('ocorrencia', dados.obra!.id, dados.obra!.nome)} accessibilityRole="button">
              <Text style={[s.aviso, { backgroundColor: t.warnBg, color: t.warnText }]}>
                {dados.ocorrenciasAbertas === 1 ? '1 ocorrência aberta nesta obra.' : `${dados.ocorrenciasAbertas} ocorrências abertas nesta obra.`} Toque para ver.
              </Text>
            </Pressable>
          )}

          <Text style={[s.secao, { color: t.text }]}>Entregas de hoje</Text>
          <View style={[s.cartao, { backgroundColor: t.surface, padding: 0 }]}>
            {dados.entregasHoje.length === 0 && (
              <Text style={[s.sub, { color: t.muted, padding: 16 }]}>Nenhuma entrega marcada para hoje.</Text>
            )}
            {dados.entregasHoje.map((p, i) => (
              <View key={p.id} style={[s.linha, i > 0 && { borderTopWidth: 1, borderTopColor: t.divider }]}>
                <Text style={[s.hora, { color: t.text }]}>{hora(p.entrega_em)}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[s.item, { color: t.text }]}>{p.material}</Text>
                  <Text style={[s.sub, { color: t.muted }]}>
                    {p.quantidade} {p.unidade}{p.fornecedor ? ` · ${p.fornecedor}` : ''}
                  </Text>
                </View>
                <Text
                  style={[
                    s.chip,
                    p.status === 'aprovado' || p.status === 'entregue'
                      ? { backgroundColor: t.okBg, color: t.okText }
                      : { backgroundColor: t.warnBg, color: t.warnText },
                  ]}
                >
                  {p.status === 'entregue' ? 'Entregue' : p.status === 'aprovado' ? 'Confirmada' : 'Aguardando'}
                </Text>
              </View>
            ))}
          </View>

          <Text style={[s.secao, { color: t.text }]}>Últimos diários</Text>
          <View style={[s.cartao, { backgroundColor: t.surface, padding: 0 }]}>
            {diarios.length === 0 && (
              <Text style={[s.sub, { color: t.muted, padding: 16 }]}>Nenhum diário registrado ainda. Toque em Diário para fazer o de hoje.</Text>
            )}
            {diarios.map((d, i) => {
              const ehHoje = d.data === hojeISO();
              const expandido = aberto === d.id;
              const detalhes = [d.clima && CLIMA[d.clima], d.efetivoTotal > 0 && `${d.efetivoTotal} ${d.efetivoTotal === 1 ? 'pessoa' : 'pessoas'}`, d.fotos.length > 0 && `${d.fotos.length} ${d.fotos.length === 1 ? 'foto' : 'fotos'}`]
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
                    {ehHoje && dados.obra && (
                      <Pressable onPress={() => onAbrir('diario', dados.obra!.id, dados.obra!.nome)} accessibilityRole="button" hitSlop={10}>
                        <Text style={[s.editar, { color: t.accentText }]}>Editar</Text>
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
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  conteudo: { paddingHorizontal: 20, gap: 18, maxWidth: 640, width: '100%', alignSelf: 'center' },
  topo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  marca: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  quadrado: { width: 14, height: 14, borderRadius: 3 },
  mb2: { fontSize: 15, fontWeight: '600' },
  data: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  titulo: { fontSize: 28, fontWeight: '300' },
  botoesTopo: { flexDirection: 'row', gap: 8 },
  redondo: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { borderRadius: 20, borderWidth: 1.5, padding: 18, gap: 4 },
  heroRotulo: { fontSize: 12, fontWeight: '600', letterSpacing: 0.8, opacity: 0.8 },
  heroNome: { fontSize: 20, fontWeight: '700' },
  heroEtapa: { fontSize: 14, opacity: 0.85 },
  heroLinha: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  heroLink: { fontSize: 14, fontWeight: '600', marginTop: 10 },
  heroNum: { fontSize: 13, fontWeight: '600' },
  trilha: { height: 8, borderRadius: 4, marginTop: 6 },
  barra: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4 },
  marcador: { position: 'absolute', top: -3, width: 2, height: 14 },
  acoes: { flexDirection: 'row', gap: 10 },
  acao: { flex: 1, borderRadius: 16, paddingVertical: 12, alignItems: 'center', gap: 8, minHeight: 44 },
  acaoIcone: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  acaoTexto: { fontSize: 12, fontWeight: '600' },
  equipe: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingVertical: 12, marginTop: -6 },
  aviso: { borderRadius: 14, padding: 14, fontSize: 14, fontWeight: '500', overflow: 'hidden' },
  secao: { fontSize: 18, fontWeight: '700' },
  cartao: { borderRadius: 18, padding: 16, gap: 4 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  hora: { width: 52, fontSize: 15, fontWeight: '700' },
  item: { fontSize: 15, fontWeight: '600' },
  sub: { fontSize: 13 },
  diario: { paddingHorizontal: 16, paddingVertical: 14, gap: 6 },
  diarioTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editar: { fontSize: 15, fontWeight: '600' },
  corpo: { fontSize: 15, lineHeight: 21 },
  miniaturas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  miniatura: { width: 64, height: 64, borderRadius: 10 },
  fotoGrande: { width: '100%', aspectRatio: 4 / 3, borderRadius: 12 },
  chip: { fontSize: 12, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
});
