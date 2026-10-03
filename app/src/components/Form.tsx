import type { ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonte, useTema } from '../theme';

// Estrutura comum das telas de registro: topo com Voltar, conteúdo rolável e botão fixo embaixo.
export function TelaRegistro(props: {
  titulo: string;
  subtitulo: string;
  onVoltar: () => void;
  botao: string;
  onBotao: () => void;
  ocupado?: boolean;
  children: ReactNode;
}) {
  const { t } = useTema();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.topo, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={props.onVoltar} accessibilityRole="button" style={s.voltar}>
          <Text style={[s.voltarTexto, { color: t.accentText }]}>Voltar</Text>
        </Pressable>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={[s.topoTitulo, { color: t.text }]}>{props.titulo}</Text>
          <Text style={[s.sub, { color: t.muted }]} numberOfLines={1}>{props.subtitulo}</Text>
        </View>
        <View style={s.voltar} />
      </View>
      <ScrollView contentContainerStyle={s.conteudo} keyboardShouldPersistTaps="handled">
        {props.children}
      </ScrollView>
      <View style={[s.rodape, { backgroundColor: t.surface, borderTopColor: t.divider, paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          onPress={props.onBotao}
          disabled={props.ocupado}
          accessibilityRole="button"
          style={({ pressed }) => [s.botao, { backgroundColor: t.accent, opacity: pressed || props.ocupado ? 0.8 : 1 }]}
        >
          {props.ocupado ? <ActivityIndicator color={t.onAccent} /> : <Text style={[s.botaoTexto, { color: t.onAccent }]}>{props.botao}</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

export function Rotulo({ children }: { children: ReactNode }) {
  const { t } = useTema();
  return <Text style={[s.rotulo, { color: t.muted }]}>{children}</Text>;
}

export function Campo(props: TextInputProps) {
  const { t } = useTema();
  return (
    <TextInput
      placeholderTextColor={t.muted}
      {...props}
      style={[s.campo, { backgroundColor: t.surface, borderColor: t.border, color: t.text }, props.multiline && s.campoAlto, props.style]}
    />
  );
}

export function Escolha<T extends string>(props: { opcoes: { valor: T; rotulo: string }[]; valor: T | null; onMudar: (v: T) => void }) {
  const { t } = useTema();
  return (
    <View style={s.chips}>
      {props.opcoes.map((o) => {
        const ativo = props.valor === o.valor;
        return (
          <Pressable
            key={o.valor}
            onPress={() => props.onMudar(o.valor)}
            accessibilityRole="button"
            accessibilityState={{ selected: ativo }}
            style={[s.chip, ativo ? { backgroundColor: t.accent } : { backgroundColor: t.surface, borderColor: t.border, borderWidth: 1 }]}
          >
            <Text style={[s.chipTexto, { color: ativo ? t.onAccent : t.text }]}>{o.rotulo}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Como Escolha, mas marca várias opções.
export function EscolhaVarias(props: { opcoes: { valor: string; rotulo: string }[]; valores: string[]; onMudar: (v: string[]) => void }) {
  const { t } = useTema();
  return (
    <View style={s.chips}>
      {props.opcoes.map((o) => {
        const ativo = props.valores.includes(o.valor);
        return (
          <Pressable
            key={o.valor}
            onPress={() => props.onMudar(ativo ? props.valores.filter((v) => v !== o.valor) : [...props.valores, o.valor])}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: ativo }}
            style={[s.chip, ativo ? { backgroundColor: t.accent } : { backgroundColor: t.surface, borderColor: t.border, borderWidth: 1 }]}
          >
            <Text style={[s.chipTexto, { color: ativo ? t.onAccent : t.text }]}>{ativo ? '✓ ' : ''}{o.rotulo}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function BotaoPequeno(props: { rotulo: string; onPress: () => void; tom?: 'principal' | 'neutro' }) {
  const { t } = useTema();
  const principal = props.tom !== 'neutro';
  return (
    <Pressable
      onPress={props.onPress}
      accessibilityRole="button"
      style={[s.pequeno, principal ? { backgroundColor: t.tint } : { borderWidth: 1, borderColor: t.border }]}
    >
      <Text style={[s.pequenoTexto, { color: principal ? t.accentText : t.text }]}>{props.rotulo}</Text>
    </Pressable>
  );
}

export const estilos = StyleSheet.create({
  cartao: { borderRadius: 16, overflow: 'hidden' },
  linha: { paddingHorizontal: 16, paddingVertical: 14, gap: 6 },
  item: { fontSize: 15, fontFamily: fonte.forte },
  sub: { fontSize: 13, fontFamily: fonte.texto },
  etiqueta: { fontSize: 12, fontFamily: fonte.negrito, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden', alignSelf: 'flex-start' },
  acoes: { flexDirection: 'row', gap: 8, marginTop: 4 },
});

const s = StyleSheet.create({
  topo: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8 },
  voltar: { minWidth: 80, minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  voltarTexto: { fontSize: 16, fontFamily: fonte.forte },
  topoTitulo: { fontSize: 22, lineHeight: 26, fontFamily: fonte.titulo },
  sub: { fontSize: 13, fontFamily: fonte.texto },
  conteudo: { padding: 20, gap: 10, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' },
  rotulo: { fontSize: 13, fontFamily: fonte.negrito, letterSpacing: 0.8, marginTop: 10 },
  campo: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontFamily: fonte.texto, minHeight: 48 },
  campoAlto: { minHeight: 96, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chipTexto: { fontSize: 15, fontFamily: fonte.negrito },
  pequeno: { minHeight: 44, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pequenoTexto: { fontSize: 14, fontFamily: fonte.negrito },
  rodape: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  botao: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  botaoTexto: { fontSize: 17, fontFamily: fonte.negrito },
});
