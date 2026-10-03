import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonte, useTema } from '../theme';
import { Icone, Nome } from './Icone';

// Altura da barra sem a área segura de baixo (home indicator).
export const ALTURA_ABAS = 64;

export type Aba = 'hoje' | 'obra';

type Props = {
  ativa: Aba;
  onAba: (a: Aba) => void;
  onRegistrar: () => void;
  onMais: () => void;
  avisoMais?: boolean;
};

export function BarraAbas({ ativa, onAba, onRegistrar, onMais, avisoMais }: Props) {
  const { t } = useTema();
  const insets = useSafeAreaInsets();
  const aba = (nome: Aba | 'mais', icone: Nome, rotulo: string, onPress: () => void, aviso = false) => {
    const ligada = nome === ativa;
    const cor = ligada ? t.accentText : t.muted;
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityState={{ selected: ligada }}
        accessibilityLabel={aviso ? `${rotulo}, há pendências` : rotulo}
        style={s.aba}
      >
        <View>
          <Icone nome={icone} cor={cor} tamanho={22} />
          {aviso && <View style={[s.ponto, { backgroundColor: t.orange, borderColor: t.bg }]} />}
        </View>
        <Text style={[s.rotulo, { color: cor }]}>{rotulo}</Text>
      </Pressable>
    );
  };
  return (
    <View
      accessibilityRole="tablist"
      style={[s.barra, { backgroundColor: t.barra, borderTopColor: t.border, height: ALTURA_ABAS + insets.bottom, paddingBottom: insets.bottom }]}
    >
      {aba('hoje', 'inicio', 'Hoje', () => onAba('hoje'))}
      {aba('obra', 'cronograma', 'Obra', () => onAba('obra'))}
      <View style={s.aba}>
        <Pressable
          onPress={onRegistrar}
          accessibilityRole="button"
          accessibilityLabel="Registrar: diário, foto, material ou ocorrência"
          style={({ pressed }) => [s.fab, { backgroundColor: t.fab, opacity: pressed ? 0.85 : 1 }]}
        >
          <Icone nome="mais" cor={t.onFab} tamanho={26} espessura={2.2} />
        </Pressable>
      </View>
      {aba('mais', 'pontos', 'Mais', onMais, avisoMais)}
    </View>
  );
}

// Folha que sobe de baixo (menus do "+" e do "Mais", troca de obra).
export function Folha(props: { visivel: boolean; onFechar: () => void; titulo: string; children: ReactNode }) {
  const { t } = useTema();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={props.visivel} transparent animationType="slide" onRequestClose={props.onFechar}>
      <Pressable style={s.fundo} onPress={props.onFechar} accessibilityLabel="Fechar" />
      <View style={[s.folha, { backgroundColor: t.surface, paddingBottom: insets.bottom + 16 }]}>
        <View style={[s.alca, { backgroundColor: t.border }]} />
        <Text style={[s.folhaTitulo, { color: t.muted }]}>{props.titulo.toUpperCase()}</Text>
        <ScrollView style={{ maxHeight: 460 }}>{props.children}</ScrollView>
      </View>
    </Modal>
  );
}

export function ItemFolha(props: {
  icone: Nome;
  rotulo: string;
  sub?: string;
  alerta?: boolean;
  selecionado?: boolean;
  primeiro?: boolean;
  onPress: () => void;
}) {
  const { t } = useTema();
  return (
    <Pressable
      onPress={props.onPress}
      accessibilityRole="button"
      accessibilityState={props.selecionado ? { selected: true } : undefined}
      style={({ pressed }) => [s.item, !props.primeiro && { borderTopWidth: 1, borderTopColor: t.divider }, pressed && { opacity: 0.7 }]}
    >
      <View style={[s.itemIcone, { backgroundColor: props.alerta ? t.warnBg : t.tint }]}>
        <Icone nome={props.icone} cor={props.alerta ? t.warnText : t.accentText} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[s.itemTexto, { color: t.text }]}>{props.rotulo}</Text>
        {!!props.sub && <Text style={[s.itemSub, { color: t.muted }]}>{props.sub}</Text>}
      </View>
      {props.selecionado ? <Icone nome="check" cor={t.accentText} /> : <Icone nome="seta" cor={t.muted} tamanho={16} />}
    </Pressable>
  );
}

const s = StyleSheet.create({
  barra: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', borderTopWidth: 1, paddingHorizontal: 8 },
  aba: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 48 },
  rotulo: { fontFamily: fonte.forte, fontSize: 11 },
  ponto: { position: 'absolute', top: -2, right: -4, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  fab: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginTop: -22 },
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  folha: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10 },
  alca: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  folhaTitulo: { fontFamily: fonte.forte, fontSize: 11, letterSpacing: 2.5, marginBottom: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60, paddingVertical: 10 },
  itemIcone: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemTexto: { fontFamily: fonte.forte, fontSize: 15 },
  itemSub: { fontFamily: fonte.texto, fontSize: 13 },
});
