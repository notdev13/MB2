import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icone } from '../components/Icone';
import { carregarCarteira, LinhaObra, reaisCurto, SituacaoObra } from '../lib/carteira';
import { fonte, useTema } from '../theme';

const SEGMENTOS: { valor: SituacaoObra; rotulo: string }[] = [
  { valor: 'andamento', rotulo: 'Em andamento' },
  { valor: 'nao_iniciada', rotulo: 'Não iniciadas' },
  { valor: 'arquivada', rotulo: 'Arquivadas' },
];
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const dataBR = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
};

// Mesma régua da tela Obra: gasto mais de 10 pontos acima do executado acende o alerta.
const custoAlto = (o: LinhaObra) => o.gasto !== null && !!o.orcado && (o.gasto / o.orcado) * 100 > o.executado + 10;

type Props = { versao: number; pendencias: number; onAbrirObra: (obra: { id: string; nome: string }) => void; onPendencias: () => void };

export function Painel({ versao, pendencias, onAbrirObra, onPendencias }: Props) {
  const { t } = useTema();
  const [linhas, setLinhas] = useState<LinhaObra[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [seg, setSeg] = useState<SituacaoObra>('andamento');
  const [atualizando, setAtualizando] = useState(false);
  const hoje = new Date();

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      setLinhas(await carregarCarteira());
    } catch {
      setErro('Não foi possível carregar a carteira. Verifique a conexão.');
    }
  }, []);
  useEffect(() => {
    carregar();
  }, [carregar, versao]);

  const ativas = (linhas ?? []).filter((l) => l.situacao !== 'arquivada');
  const comCusto = ativas.filter((l) => l.gasto !== null && l.orcado);
  const orcado = comCusto.reduce((s, l) => s + (l.orcado ?? 0), 0);
  const gasto = comCusto.reduce((s, l) => s + (l.gasto ?? 0), 0);
  const atrasadas = ativas.filter((l) => l.folga !== null && l.folga < -1).length;
  const ocorrencias = ativas.reduce((s, l) => s + l.ocorrencias, 0);
  const visiveis = (linhas ?? []).filter((l) => l.situacao === seg);

  const kpis = [
    { rotulo: 'OBRAS ATIVAS', valor: String(ativas.length), sub: `${ativas.filter((l) => l.situacao === 'andamento').length} em andamento`, alerta: false },
    { rotulo: 'ATRASADAS', valor: String(atrasadas), sub: atrasadas === 0 ? 'nenhuma fora do prazo' : 'mais de 1 dia de atraso', alerta: atrasadas > 0 },
    comCusto.length > 0
      ? { rotulo: 'GASTO / ORÇADO', valor: reaisCurto(gasto), sub: `de ${reaisCurto(orcado)} · ${Math.round((gasto / orcado) * 100)}%`, alerta: false }
      : { rotulo: 'GASTO / ORÇADO', valor: '—', sub: 'sem orçamento cadastrado', alerta: false },
    { rotulo: 'PENDÊNCIAS', valor: String(pendencias), sub: `${ocorrencias} ${ocorrencias === 1 ? 'ocorrência aberta' : 'ocorrências abertas'}`, alerta: pendencias > 0, onPress: onPendencias },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={s.conteudo}
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
      <View style={{ gap: 4 }}>
        <Text style={[s.rotulo, { color: t.muted }]}>
          {`${DIAS[hoje.getDay()]}, ${hoje.toLocaleDateString('pt-BR')}`.toUpperCase()}
        </Text>
        <Text style={[s.titulo, { color: t.text }]} accessibilityRole="header">
          Carteira de obras
        </Text>
      </View>

      <View style={s.kpis}>
        {kpis.map((k) => (
          <Pressable
            key={k.rotulo}
            disabled={!k.onPress}
            onPress={k.onPress}
            accessibilityRole={k.onPress ? 'button' : undefined}
            style={[s.kpi, { backgroundColor: t.surface, borderColor: t.border }]}
          >
            <Text style={[s.rotulo, { color: t.muted }]}>{k.rotulo}</Text>
            <Text style={[s.kpiValor, { color: t.text }]}>{k.valor}</Text>
            <Text style={[s.sub, { color: k.alerta ? t.warnText : t.muted }]}>{k.sub}</Text>
          </Pressable>
        ))}
      </View>

      <View style={[s.quadro, { backgroundColor: t.surface, borderColor: t.border }]}>
        <View style={s.quadroTopo}>
          <Text style={[s.secao, { color: t.text }]}>Obras</Text>
          <View style={[s.segmentos, { backgroundColor: t.bg, borderColor: t.border }]} accessibilityRole="tablist">
            {SEGMENTOS.map((g) => {
              const sel = g.valor === seg;
              const n = (linhas ?? []).filter((l) => l.situacao === g.valor).length;
              return (
                <Pressable
                  key={g.valor}
                  onPress={() => setSeg(g.valor)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: sel }}
                  style={[s.segmento, sel && { backgroundColor: t.surface, borderColor: t.border, borderWidth: 1 }]}
                >
                  <Text style={[s.segmentoTexto, { color: sel ? t.text : t.muted }]}>
                    {g.rotulo} · {n}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {linhas === null && !erro && <ActivityIndicator color={t.accentText} style={{ marginVertical: 32 }} />}
        {erro && <Text style={[s.aviso, { backgroundColor: t.warnBg, color: t.warnText }]}>{erro}</Text>}
        {linhas !== null && visiveis.length === 0 && (
          <Text style={[s.sub, { color: t.muted, paddingVertical: 24 }]}>Nenhuma obra nesta situação.</Text>
        )}

        {visiveis.length > 0 && (
          <ScrollView horizontal contentContainerStyle={{ minWidth: '100%' }}>
            <View style={{ minWidth: 820, flex: 1 }}>
              <View style={[s.linha, s.cabecalho]}>
                <Text style={[s.th, { color: t.muted, flex: 2.2 }]}>OBRA</Text>
                <Text style={[s.th, { color: t.muted, flex: 1.6 }]}>AVANÇO</Text>
                <Text style={[s.th, { color: t.muted, flex: 1.3 }]}>PRAZO</Text>
                <Text style={[s.th, { color: t.muted, flex: 1.6, textAlign: 'right' }]}>GASTO / ORÇADO</Text>
                <Text style={[s.th, { color: t.muted, flex: 1, textAlign: 'right' }]}>PENDENTE</Text>
              </View>
              {visiveis.map((o) => {
                const prazo =
                  o.folga === null
                    ? { texto: 'Sem datas', cor: t.muted, fundo: t.divider, icone: null }
                    : o.folga < -1
                      ? { texto: `Atrasada ${-o.folga} d`, cor: t.warnText, fundo: t.warnBg, icone: 'ocorrencia' as const }
                      : o.folga > 1
                        ? { texto: `Adiantada ${o.folga} d`, cor: t.okText, fundo: t.okBg, icone: 'check' as const }
                        : { texto: 'No prazo', cor: t.okText, fundo: t.okBg, icone: 'check' as const };
                const alto = custoAlto(o);
                return (
                  <Pressable
                    key={o.id}
                    onPress={() => onAbrirObra({ id: o.id, nome: o.nome })}
                    accessibilityRole="button"
                    accessibilityLabel={`Abrir ${o.nome}`}
                    style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                      s.linha,
                      { borderTopColor: t.divider, borderTopWidth: 1 },
                      (pressed || hovered) && { backgroundColor: t.tint },
                    ]}
                  >
                    <View style={{ flex: 2.2, gap: 2, paddingRight: 12 }}>
                      <Text style={[s.item, { color: t.text }]} numberOfLines={1}>{o.nome}</Text>
                      <Text style={[s.sub, { color: t.muted }]} numberOfLines={1}>
                        {[o.etapaAtual, o.entrega ? `entrega ${dataBR(o.entrega)}` : null].filter(Boolean).join(' · ') || o.cidade || '—'}
                      </Text>
                    </View>
                    <View style={{ flex: 1.6, flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 16 }}>
                      <View style={[s.trilha, { backgroundColor: t.heroTrack }]}>
                        <View style={[s.barra, { width: `${o.executado}%`, backgroundColor: t.heroBar }]} />
                        <View style={[s.marcador, { left: `${o.previsto}%`, backgroundColor: t.marcador }]} />
                      </View>
                      <Text style={[s.numero, { color: t.text }]}>{o.executado}%</Text>
                    </View>
                    <View style={{ flex: 1.3, alignItems: 'flex-start' }}>
                      <View style={[s.etiqueta, { backgroundColor: prazo.fundo }]}>
                        {prazo.icone && <Icone nome={prazo.icone} cor={prazo.cor} tamanho={13} espessura={2.2} />}
                        <Text style={[s.etiquetaTexto, { color: prazo.cor }]}>{prazo.texto}</Text>
                      </View>
                    </View>
                    <View style={{ flex: 1.6, alignItems: 'flex-end', gap: 2 }}>
                      {o.gasto === null ? (
                        <Text style={[s.sub, { color: t.muted }]}>sem acesso a custos</Text>
                      ) : (
                        <>
                          <Text style={[s.numero, { color: alto ? t.warnText : t.text }]}>
                            {reaisCurto(o.gasto)}
                            {o.orcado ? ` de ${reaisCurto(o.orcado)}` : ''}
                          </Text>
                          <Text style={[s.sub, { color: alto ? t.warnText : t.muted }]}>
                            {o.orcado ? `${Math.round((o.gasto / o.orcado) * 100)}% gasto${alto ? ' · acima do avanço' : ''}` : 'sem orçamento'}
                          </Text>
                        </>
                      )}
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end', gap: 2 }}>
                      <Text style={[s.numero, { color: o.ocorrencias + o.pedidos > 0 ? t.text : t.muted }]}>{o.ocorrencias + o.pedidos}</Text>
                      <Text style={[s.sub, { color: t.muted }]} numberOfLines={1}>
                        {o.ocorrencias + o.pedidos === 0 ? 'nada' : `${o.pedidos} ped. · ${o.ocorrencias} ocor.`}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>

      <Text style={[s.nota, { color: t.muted }]}>
        Avanço é a média simples das etapas. Gasto soma os lançamentos de custo; só aparece para quem aprova na obra.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  conteudo: { padding: 32, gap: 24, maxWidth: 1240, width: '100%', alignSelf: 'center' },
  rotulo: { fontFamily: fonte.forte, fontSize: 11, letterSpacing: 2 },
  titulo: { fontFamily: fonte.titulo, fontSize: 40, lineHeight: 44 },
  secao: { fontFamily: fonte.titulo, fontSize: 28, lineHeight: 32 },
  sub: { fontFamily: fonte.texto, fontSize: 14 },
  item: { fontFamily: fonte.forte, fontSize: 16 },
  numero: { fontFamily: fonte.negrito, fontSize: 15, fontVariant: ['tabular-nums'] },
  aviso: { borderRadius: 14, padding: 14, fontFamily: fonte.media, fontSize: 15, overflow: 'hidden' },
  nota: { fontFamily: fonte.texto, fontSize: 13 },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpi: { flexGrow: 1, flexBasis: 220, borderWidth: 1, borderRadius: 20, padding: 18, gap: 4 },
  kpiValor: { fontFamily: fonte.titulo, fontSize: 36, lineHeight: 42, fontVariant: ['tabular-nums'] },
  quadro: { borderWidth: 1, borderRadius: 20, padding: 20, gap: 8 },
  quadroTopo: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 },
  segmentos: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 4, gap: 4 },
  segmento: { minHeight: 40, paddingHorizontal: 14, borderRadius: 9, justifyContent: 'center' },
  segmentoTexto: { fontFamily: fonte.forte, fontSize: 14 },
  linha: { flexDirection: 'row', alignItems: 'center', minHeight: 68, paddingHorizontal: 8, borderRadius: 4 },
  cabecalho: { minHeight: 36 },
  th: { fontFamily: fonte.forte, fontSize: 11, letterSpacing: 1.5 },
  trilha: { flex: 1, height: 6, borderRadius: 3 },
  barra: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3 },
  marcador: { position: 'absolute', top: -4, width: 2, height: 14, marginLeft: -1 },
  etiqueta: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  etiquetaTexto: { fontFamily: fonte.negrito, fontSize: 12 },
});
