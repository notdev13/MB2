import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { atualizarPercentual, carregarObra, diasDeAtraso, Etapa, ObraDetalhe, previstoHoje, totalGasto } from '../lib/cronograma';
import { podeAprovar } from '../lib/obra';
import { useTema } from '../theme';

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const mesAno = (iso: string) => `${MES[Number(iso.slice(5, 7)) - 1]}/${iso.slice(0, 4)}`;
const diaMes = (iso: string) => `${Number(iso.slice(8, 10))} ${MES[Number(iso.slice(5, 7)) - 1]}`;
const PASSOS = [0, 10, 25, 50, 75, 90, 100];
const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

type Props = { obraId: string; onVoltar: () => void };

export function Obra({ obraId, onVoltar }: Props) {
  const { t } = useTema();
  const insets = useSafeAreaInsets();
  const [obra, setObra] = useState<ObraDetalhe | null>(null);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [gasto, setGasto] = useState<number | null>(null);
  const [aprovador, setAprovador] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const [editando, setEditando] = useState<Etapa | null>(null);
  const [novoPercentual, setNovoPercentual] = useState(0);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const r = await carregarObra(obraId);
      setObra(r.obra);
      setEtapas(r.etapas);
      const ok = await podeAprovar(obraId);
      setAprovador(ok);
      setGasto(ok ? await totalGasto(obraId) : null);
    } catch {
      setErro('Não foi possível carregar. Verifique a conexão e puxe para atualizar.');
    }
  }, [obraId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const executado = etapas.length ? Math.round(etapas.reduce((s, e) => s + e.percentual, 0) / etapas.length) : 0;
  const previsto = etapas.length ? Math.round(etapas.reduce((s, e) => s + (previstoHoje(e) ?? 0), 0) / etapas.length) : 0;
  const atrasoMax = etapas.reduce((m, e) => Math.max(m, diasDeAtraso(e)), 0);
  const financeiro = gasto !== null && obra?.orcamento_total ? Math.round((gasto / Number(obra.orcamento_total)) * 100) : null;

  function abrir(e: Etapa) {
    if (!aprovador) return;
    setNovoPercentual(e.percentual);
    setEditando(e);
  }

  async function salvar() {
    if (!editando) return;
    setSalvando(true);
    try {
      await atualizarPercentual(editando, novoPercentual);
      setEditando(null);
      await carregar();
    } catch {
      Alert.alert('Não foi possível salvar', 'Confira a conexão. Só engenheiro, responsável ou diretoria atualizam o cronograma.');
    } finally {
      setSalvando(false);
    }
  }

  const quadros = [
    { rotulo: 'Executado', valor: `${executado}%`, alerta: false },
    { rotulo: 'Previsto', valor: `${previsto}%`, alerta: false },
    { rotulo: 'Prazo', valor: atrasoMax > 0 ? `+${atrasoMax} d` : 'Em dia', alerta: atrasoMax > 0 },
    ...(financeiro !== null ? [{ rotulo: 'Gasto', valor: `${financeiro}%`, alerta: financeiro > executado + 10 }] : []),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={[s.topo, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={onVoltar} accessibilityRole="button" style={s.voltar}>
          <Text style={[s.voltarTexto, { color: t.accentText }]}>Voltar</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[s.conteudo, { paddingBottom: insets.bottom + 24 }]}
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
        {!obra && !erro && <ActivityIndicator color={t.accentText} style={{ marginTop: 40 }} />}
        {erro && <Text style={[s.aviso, { backgroundColor: t.warnBg, color: t.warnText }]}>{erro}</Text>}

        {obra && (
          <>
            <View style={{ gap: 4 }}>
              <Text style={[s.titulo, { color: t.text }]}>{obra.nome}</Text>
              <Text style={[s.sub, { color: t.muted }]}>
                {[obra.endereco, obra.cidade].filter(Boolean).join(', ')}
                {obra.entrega_prevista ? `${obra.endereco || obra.cidade ? ' · ' : ''}Entrega prevista ${mesAno(obra.entrega_prevista)}` : ''}
              </Text>
            </View>

            <View style={s.quadros}>
              {quadros.map((q) => (
                <View key={q.rotulo} style={[s.quadro, { backgroundColor: t.surface }]}>
                  <Text style={[s.quadroRotulo, { color: t.muted }]}>{q.rotulo}</Text>
                  <Text style={[s.quadroValor, { color: q.alerta ? t.warnText : t.text }]}>{q.valor}</Text>
                </View>
              ))}
            </View>
            {gasto !== null && (
              <Text style={[s.sub, { color: t.muted }]}>
                {reais(gasto)} lançados{obra.orcamento_total ? ` de ${reais(Number(obra.orcamento_total))} orçados` : ''}. Só engenharia e diretoria veem valores.
              </Text>
            )}

            <Text style={[s.secao, { color: t.text }]}>Etapas</Text>
            <View style={[s.cartao, { backgroundColor: t.surface }]}>
              {etapas.length === 0 && <Text style={[s.sub, { color: t.muted, padding: 16 }]}>Nenhuma etapa cadastrada para esta obra.</Text>}
              {etapas.map((e, i) => {
                const atraso = diasDeAtraso(e);
                const prev = previstoHoje(e);
                const chip =
                  e.percentual >= 100
                    ? { texto: 'Concluída', fundo: t.okBg, cor: t.okText }
                    : atraso > 0
                      ? { texto: atraso === 1 ? '1 dia atrasada' : `${atraso} dias atrasada`, fundo: t.warnBg, cor: t.warnText }
                      : e.percentual > 0
                        ? { texto: 'No prazo', fundo: t.okBg, cor: t.okText }
                        : { texto: 'Não iniciada', fundo: t.bg, cor: t.muted };
                return (
                  <Pressable
                    key={e.id}
                    onPress={() => abrir(e)}
                    disabled={!aprovador}
                    accessibilityRole={aprovador ? 'button' : undefined}
                    accessibilityLabel={`${e.nome}, ${Math.round(e.percentual)}% executado, ${chip.texto}`}
                    style={[s.etapa, i > 0 && { borderTopWidth: 1, borderTopColor: t.divider }]}
                  >
                    <View style={s.etapaTopo}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[s.item, { color: t.text }]}>{e.nome}</Text>
                        {e.inicio_previsto && e.fim_previsto && (
                          <Text style={[s.sub, { color: t.muted }]}>
                            {diaMes(e.inicio_previsto)} – {diaMes(e.fim_previsto)} · {Math.round(e.percentual)}%
                          </Text>
                        )}
                      </View>
                      <Text style={[s.chip, { backgroundColor: chip.fundo, color: chip.cor }]}>{chip.texto}</Text>
                    </View>
                    <View style={[s.trilha, { backgroundColor: t.divider }]}>
                      <View style={[s.barra, { width: `${e.percentual}%`, backgroundColor: atraso > 0 ? t.orange : t.accent }]} />
                      {prev !== null && prev > 0 && prev < 100 && <View style={[s.marcador, { left: `${prev}%`, backgroundColor: t.text }]} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[s.sub, { color: t.muted }]}>
              A barra mostra o executado e o traço mostra onde a etapa deveria estar hoje.
              {aprovador ? ' Toque numa etapa para atualizar o percentual.' : ''}
            </Text>
          </>
        )}
      </ScrollView>

      <Modal visible={!!editando} transparent animationType="slide" onRequestClose={() => setEditando(null)}>
        <Pressable style={s.fundoModal} onPress={() => setEditando(null)} accessibilityLabel="Fechar" />
        <View style={[s.folha, { backgroundColor: t.surface, paddingBottom: insets.bottom + 16 }]}>
          <Text style={[s.secao, { color: t.text }]}>{editando?.nome}</Text>
          <Text style={[s.sub, { color: t.muted }]}>Quanto desta etapa já está pronto?</Text>
          <Text style={[s.grande, { color: t.text }]}>{novoPercentual}%</Text>
          <View style={s.passos}>
            {PASSOS.map((p) => {
              const ativo = novoPercentual === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => setNovoPercentual(p)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: ativo }}
                  style={[s.passo, ativo ? { backgroundColor: t.accent } : { borderWidth: 1, borderColor: t.border }]}
                >
                  <Text style={[s.passoTexto, { color: ativo ? t.onAccent : t.text }]}>{p}%</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={s.ajuste}>
            {[-5, -1, 1, 5].map((d) => (
              <Pressable
                key={d}
                onPress={() => setNovoPercentual((v) => Math.min(100, Math.max(0, v + d)))}
                accessibilityRole="button"
                accessibilityLabel={`${d > 0 ? 'Mais' : 'Menos'} ${Math.abs(d)} por cento`}
                style={[s.ajusteBotao, { backgroundColor: t.bg }]}
              >
                <Text style={[s.passoTexto, { color: t.text }]}>{d > 0 ? `+${d}` : d}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={salvar}
            disabled={salvando}
            accessibilityRole="button"
            style={({ pressed }) => [s.salvar, { backgroundColor: t.accent, opacity: pressed || salvando ? 0.8 : 1 }]}
          >
            {salvando ? <ActivityIndicator color={t.onAccent} /> : <Text style={[s.salvarTexto, { color: t.onAccent }]}>Salvar</Text>}
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  topo: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 4 },
  voltar: { minWidth: 80, minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  voltarTexto: { fontSize: 16, fontWeight: '600' },
  conteudo: { paddingHorizontal: 20, gap: 14, maxWidth: 640, width: '100%', alignSelf: 'center' },
  titulo: { fontSize: 28, fontWeight: '300' },
  sub: { fontSize: 13, lineHeight: 18 },
  aviso: { borderRadius: 14, padding: 14, fontSize: 14, fontWeight: '500', overflow: 'hidden' },
  quadros: { flexDirection: 'row', gap: 8 },
  quadro: { flex: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 10, gap: 4 },
  quadroRotulo: { fontSize: 12, fontWeight: '600' },
  quadroValor: { fontSize: 20, fontWeight: '600' },
  secao: { fontSize: 18, fontWeight: '700' },
  cartao: { borderRadius: 18, overflow: 'hidden' },
  etapa: { paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  etapaTopo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  item: { fontSize: 15, fontWeight: '600' },
  chip: { fontSize: 12, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  trilha: { height: 8, borderRadius: 4 },
  barra: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4 },
  marcador: { position: 'absolute', top: -3, width: 2, height: 14 },
  fundoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  folha: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 },
  grande: { fontSize: 44, fontWeight: '300', textAlign: 'center' },
  passos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  passo: { minWidth: 64, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  passoTexto: { fontSize: 15, fontWeight: '700' },
  ajuste: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  ajusteBotao: { width: 64, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  salvar: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  salvarTexto: { fontSize: 17, fontWeight: '700' },
});
