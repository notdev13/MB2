import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ALTURA_ABAS } from '../components/Abas';
import { Icone } from '../components/Icone';
import { Toast } from '../components/Toast';
import { mudarStatusPedido, resolverOcorrencia } from '../lib/obra';
import { carregarPendencias, idade, Pendencia, TipoPendencia, voltarPedido } from '../lib/pendencias';
import { fonte, useTema } from '../theme';

type Filtro = 'todas' | TipoPendencia;
const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'pedido', rotulo: 'Pedidos' },
  { valor: 'ocorrencia', rotulo: 'Ocorrências' },
  { valor: 'contas', rotulo: 'Contas' },
];
const TIPO: Record<TipoPendencia, string> = { pedido: 'PEDIDO', ocorrencia: 'OCORRÊNCIA', contas: 'ACESSO' };

type Props = {
  diretoria: boolean;
  versao: number;
  largo?: boolean; // computador: sem barra de abas embaixo
  onContagem: (n: number) => void;
  onAbrir: (tipo: 'material' | 'ocorrencia', obra: { id: string; nome: string }) => void;
  onContas: () => void;
};

export function Pendencias({ diretoria, versao, largo, onContagem, onAbrir, onContas }: Props) {
  const { t } = useTema();
  const insets = useSafeAreaInsets();
  const [itens, setItens] = useState<Pendencia[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [atualizando, setAtualizando] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const fecharToast = useCallback(() => setToast(null), []);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const lista = await carregarPendencias(diretoria);
      setItens(lista);
      onContagem(lista.length);
    } catch {
      setErro('Não foi possível carregar. Verifique a conexão e puxe para atualizar.');
    }
  }, [diretoria, onContagem]);

  useEffect(() => {
    carregar();
  }, [carregar, versao]);

  // Some da lista na hora; se o banco recusar, volta e avisa.
  async function agir(p: Pendencia, acao: 'aprovar' | 'recusar' | 'resolver') {
    if (!itens) return;
    const antes = itens;
    setOcupado(p.chave);
    const depois = itens.filter((i) => i.chave !== p.chave);
    try {
      if (acao === 'resolver') await resolverOcorrencia(p.id, true);
      else await mudarStatusPedido(p.id, acao === 'aprovar' ? 'aprovado' : 'recusado');
      setItens(depois);
      onContagem(depois.length);
      const texto =
        acao === 'resolver' ? `Ocorrência resolvida · ${p.obraNome}` : acao === 'aprovar' ? `Pedido aprovado · ${p.obraNome}` : `Pedido recusado · ${p.obraNome}`;
      setToast({
        texto,
        desfazer: async () => {
          try {
            if (acao === 'resolver') await resolverOcorrencia(p.id, false);
            else await voltarPedido(p.id);
            setItens(antes);
            onContagem(antes.length);
          } catch {
            setToast({ texto: 'Não foi possível desfazer. Confira a conexão.' });
          }
        },
      });
    } catch {
      setToast({ texto: 'Não foi possível salvar. Confira a conexão e tente de novo.' });
    } finally {
      setOcupado(null);
    }
  }

  const contar = (f: Filtro) => (itens ?? []).filter((i) => f === 'todas' || i.tipo === f).length;
  const visiveis = (itens ?? []).filter((i) => filtro === 'todas' || i.tipo === filtro);
  const filtros = FILTROS.filter((f) => f.valor !== 'contas' || diretoria);
  const baixo = largo ? 24 : insets.bottom + ALTURA_ABAS + 12;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView
        contentContainerStyle={[s.conteudo, { paddingTop: largo ? 32 : insets.top + 16, paddingBottom: baixo + 64 }]}
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
          <Text style={[s.rotulo, { color: t.muted }]}>TODAS AS OBRAS</Text>
          <Text style={[s.titulo, { color: t.text }]} accessibilityRole="header">
            Pendências
          </Text>
          <Text style={[s.sub, { color: t.muted }]}>
            {itens === null ? 'Carregando…' : itens.length === 0 ? 'Nada esperando você.' : `${itens.length} ${itens.length === 1 ? 'decisão espera' : 'decisões esperam'} por você.`}
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filtros}>
          {filtros.map((f) => {
            const sel = f.valor === filtro;
            return (
              <Pressable
                key={f.valor}
                onPress={() => setFiltro(f.valor)}
                accessibilityRole="button"
                accessibilityState={{ selected: sel }}
                style={[s.chip, { backgroundColor: sel ? t.accent : t.surface, borderColor: sel ? t.accent : t.border }]}
              >
                <Text style={[s.chipTexto, { color: sel ? t.onAccent : t.text }]}>
                  {f.rotulo} · {contar(f.valor)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {itens === null && !erro && <ActivityIndicator color={t.accentText} style={{ marginTop: 32 }} />}
        {erro && <Text style={[s.aviso, { backgroundColor: t.warnBg, color: t.warnText }]}>{erro}</Text>}

        {itens !== null && visiveis.length === 0 && (
          <View style={[s.vazio, { backgroundColor: t.surface, borderColor: t.border }]}>
            <View style={[s.vazioIcone, { backgroundColor: t.okBg }]}>
              <Icone nome="check" cor={t.okText} tamanho={22} />
            </View>
            <Text style={[s.item, { color: t.text }]}>Tudo em dia por aqui.</Text>
            <Text style={[s.sub, { color: t.muted, textAlign: 'center' }]}>
              Pedidos para aprovar e ocorrências abertas das suas obras aparecem nesta lista.
            </Text>
          </View>
        )}

        {visiveis.map((p) => (
          <View key={p.chave} style={[s.cartao, { backgroundColor: t.surface, borderColor: p.urgente ? t.orange : t.border }]}>
            <View style={s.cartaoTopo}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[s.rotulo, { color: t.muted }]} numberOfLines={1}>
                  {TIPO[p.tipo]}
                  {p.obraNome ? ` · ${p.obraNome.toUpperCase()}` : ''}
                </Text>
                <Text style={[s.item, { color: t.text }]}>{p.titulo}</Text>
                <Text style={[s.sub, { color: t.muted }]}>{p.sub}</Text>
              </View>
              {p.urgente ? (
                <View style={[s.etiqueta, { backgroundColor: t.warnBg }]}>
                  <Icone nome="ocorrencia" cor={t.warnText} tamanho={13} espessura={2.2} />
                  <Text style={[s.etiquetaTexto, { color: t.warnText }]}>Urgente</Text>
                </View>
              ) : (
                !!p.criadoEm && <Text style={[s.idade, { color: t.muted }]}>{idade(p.criadoEm)}</Text>
              )}
            </View>

            <View style={s.botoes}>
              {p.tipo === 'contas' && <Botao rotulo="Abrir contas e convites" principal onPress={onContas} />}
              {p.tipo === 'pedido' && (
                <>
                  <Botao rotulo="Aprovar" principal ocupado={ocupado === p.chave} onPress={() => agir(p, 'aprovar')} />
                  <Botao rotulo="Recusar" onPress={() => agir(p, 'recusar')} />
                  <Botao rotulo="Ver" onPress={() => p.obraId && onAbrir('material', { id: p.obraId, nome: p.obraNome ?? '' })} />
                </>
              )}
              {p.tipo === 'ocorrencia' && (
                <>
                  <Botao rotulo="Marcar resolvida" principal ocupado={ocupado === p.chave} onPress={() => agir(p, 'resolver')} />
                  <Botao rotulo="Ver" onPress={() => p.obraId && onAbrir('ocorrencia', { id: p.obraId, nome: p.obraNome ?? '' })} />
                </>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
      <Toast toast={toast} onFechar={fecharToast} baixo={baixo} />
    </View>
  );
}

function Botao(props: { rotulo: string; onPress: () => void; principal?: boolean; ocupado?: boolean }) {
  const { t } = useTema();
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.ocupado}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.botao,
        props.principal ? { backgroundColor: t.accent, flexGrow: 1 } : { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
        pressed && { opacity: 0.8 },
      ]}
    >
      {props.ocupado ? (
        <ActivityIndicator color={t.onAccent} />
      ) : (
        <Text style={[s.botaoTexto, { color: props.principal ? t.onAccent : t.text }]}>{props.rotulo}</Text>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  conteudo: { paddingHorizontal: 20, gap: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  rotulo: { fontFamily: fonte.forte, fontSize: 11, letterSpacing: 2 },
  titulo: { fontFamily: fonte.titulo, fontSize: 36, lineHeight: 40 },
  sub: { fontFamily: fonte.texto, fontSize: 15 },
  item: { fontFamily: fonte.forte, fontSize: 16 },
  aviso: { borderRadius: 14, padding: 14, fontFamily: fonte.media, fontSize: 15, overflow: 'hidden' },
  filtros: { gap: 8, paddingRight: 20 },
  chip: { minHeight: 44, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, justifyContent: 'center' },
  chipTexto: { fontFamily: fonte.forte, fontSize: 15 },
  vazio: { borderRadius: 20, borderWidth: 1, padding: 24, alignItems: 'center', gap: 8 },
  vazioIcone: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  cartao: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 14 },
  cartaoTopo: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  etiqueta: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  etiquetaTexto: { fontFamily: fonte.negrito, fontSize: 12 },
  idade: { fontFamily: fonte.media, fontSize: 13 },
  botoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  botao: { minHeight: 48, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  botaoTexto: { fontFamily: fonte.forte, fontSize: 15 },
});
