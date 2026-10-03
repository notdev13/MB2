import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonte, useTema } from '../theme';
import { Icone, Nome } from './Icone';
import { Marca } from './Marca';

// Altura da barra sem a área segura de baixo (home indicator).
export const ALTURA_ABAS = 64;

export type Aba = 'painel' | 'hoje' | 'obra' | 'pendencias';

type Props = {
  ativa: Aba;
  onAba: (a: Aba) => void;
  onRegistrar: () => void;
  onMais: () => void;
  avisoMais?: boolean;
  pendencias?: number;
};

export function BarraAbas({ ativa, onAba, onRegistrar, onMais, avisoMais, pendencias = 0 }: Props) {
  const { t } = useTema();
  const insets = useSafeAreaInsets();
  const aba = (nome: Aba | 'mais', icone: Nome, rotulo: string, onPress: () => void, aviso = false, numero = 0) => {
    const ligada = nome === ativa;
    const cor = ligada ? t.accentText : t.muted;
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityState={{ selected: ligada }}
        accessibilityLabel={numero > 0 ? `${rotulo}, ${numero}` : aviso ? `${rotulo}, há pendências` : rotulo}
        style={s.aba}
      >
        <View>
          <Icone nome={icone} cor={cor} tamanho={22} />
          {aviso && numero === 0 && <View style={[s.ponto, { backgroundColor: t.orange, borderColor: t.bg }]} />}
          {numero > 0 && (
            <View style={[s.numero, { backgroundColor: t.orange, borderColor: t.bg }]}>
              <Text style={[s.numeroTexto, { color: t.onOrange }]}>{numero > 99 ? '99+' : numero}</Text>
            </View>
          )}
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
      {aba('pendencias', 'caixa', 'Pendências', () => onAba('pendencias'), false, pendencias)}
      {aba('mais', 'pontos', 'Mais', onMais, avisoMais)}
    </View>
  );
}

// Computador (tela larga): menu lateral fixo no lugar da barra de baixo.
// Só lista o que já funciona; módulos futuros entram quando existirem.
export function MenuLateral(props: {
  ativa: Aba;
  onAba: (a: Aba) => void;
  onRegistrar: () => void;
  obraNome: string | null;
  pendencias: number;
  extras: { icone: Nome; rotulo: string; aviso?: boolean; onPress: () => void }[];
}) {
  const { t } = useTema();
  const item = (nome: Aba, icone: Nome, rotulo: string, sub?: string | null, numero = 0) => {
    const ligada = nome === props.ativa;
    return (
      <Pressable
        key={nome}
        onPress={() => props.onAba(nome)}
        accessibilityRole="tab"
        accessibilityState={{ selected: ligada }}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          s.menuItem,
          { backgroundColor: ligada ? t.tint : pressed || hovered ? t.divider : 'transparent' },
        ]}
      >
        <Icone nome={icone} cor={ligada ? t.accentText : t.muted} />
        <View style={{ flex: 1 }}>
          <Text style={[s.menuTexto, { color: t.text }]}>{rotulo}</Text>
          {!!sub && <Text style={[s.menuSub, { color: t.muted }]} numberOfLines={1}>{sub}</Text>}
        </View>
        {numero > 0 && (
          <View style={[s.numero, { position: 'relative', top: 0, right: 0, backgroundColor: t.orange, borderColor: 'transparent' }]}>
            <Text style={[s.numeroTexto, { color: t.onOrange }]}>{numero > 99 ? '99+' : numero}</Text>
          </View>
        )}
      </Pressable>
    );
  };
  return (
    <View accessibilityRole="tablist" style={[s.menu, { backgroundColor: t.surface, borderRightColor: t.border }]}>
      <View style={{ paddingHorizontal: 12, paddingBottom: 20 }}>
        <Marca />
      </View>
      <Pressable
        onPress={props.onRegistrar}
        accessibilityRole="button"
        style={({ pressed }) => [s.menuRegistrar, { backgroundColor: t.fab, opacity: pressed ? 0.85 : 1 }]}
      >
        <Icone nome="mais" cor={t.onFab} tamanho={20} espessura={2.2} />
        <Text style={[s.menuTexto, { color: t.onFab }]}>Registrar</Text>
      </Pressable>
      <View style={{ gap: 4, marginTop: 16 }}>
        {item('painel', 'painel', 'Painel', 'Todas as obras')}
        {item('hoje', 'inicio', 'Hoje', props.obraNome)}
        {item('obra', 'cronograma', 'Cronograma', props.obraNome)}
        {item('pendencias', 'caixa', 'Pendências', 'Todas as obras', props.pendencias)}
      </View>
      <View style={[s.menuRodape, { borderTopColor: t.divider }]}>
        {props.extras.map((e) => (
          <Pressable
            key={e.rotulo}
            onPress={e.onPress}
            accessibilityRole="button"
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [s.menuItem, (pressed || hovered) && { backgroundColor: t.divider }]}
          >
            <View>
              <Icone nome={e.icone} cor={t.muted} />
              {e.aviso && <View style={[s.ponto, { backgroundColor: t.orange, borderColor: t.surface }]} />}
            </View>
            <Text style={[s.menuTexto, { color: t.text, flex: 1 }]}>{e.rotulo}</Text>
          </Pressable>
        ))}
      </View>
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
  numero: { position: 'absolute', top: -6, right: -12, minWidth: 18, height: 18, borderRadius: 9, borderWidth: 2, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center' },
  numeroTexto: { fontFamily: fonte.negrito, fontSize: 10 },
  menu: { width: 248, borderRightWidth: 1, paddingHorizontal: 12, paddingVertical: 24 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingHorizontal: 12, borderRadius: 12 },
  menuTexto: { fontFamily: fonte.forte, fontSize: 15 },
  menuSub: { fontFamily: fonte.texto, fontSize: 12 },
  menuRegistrar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderRadius: 12 },
  menuRodape: { marginTop: 'auto', paddingTop: 12, borderTopWidth: 1, gap: 4 },
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
