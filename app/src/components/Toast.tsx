import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonte, useTema } from '../theme';

export type Toast = { texto: string; desfazer?: () => void } | null;

// Aviso discreto embaixo, que some sozinho (no lugar de janelas de alerta).
export function Toast({ toast, onFechar, baixo }: { toast: Toast; onFechar: () => void; baixo: number }) {
  const { t, escuro } = useTema();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (toast) timer.current = setTimeout(onFechar, 5000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [toast, onFechar]);

  if (!toast) return null;
  // Aviso em contraste com a tela: escuro no tema claro, claro no tema escuro.
  const fundo = t.text;
  const letra = t.bg;
  const acao = escuro ? '#7A532E' : '#6FD49A';
  return (
    <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={[s.caixa, { bottom: baixo, backgroundColor: fundo }]}>
      <Text style={[s.texto, { color: letra }]} numberOfLines={2}>
        {toast.texto}
      </Text>
      {toast.desfazer && (
        <Pressable
          onPress={() => {
            toast.desfazer?.();
            onFechar();
          }}
          accessibilityRole="button"
          hitSlop={8}
          style={s.botao}
        >
          <Text style={[s.botaoTexto, { color: acao }]}>Desfazer</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  caixa: {
    position: 'absolute', left: 16, right: 16, maxWidth: 560, alignSelf: 'center',
    minHeight: 52, borderRadius: 14, paddingLeft: 16, paddingRight: 6,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  texto: { flex: 1, fontFamily: fonte.media, fontSize: 15 },
  botao: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  botaoTexto: { fontFamily: fonte.negrito, fontSize: 15 },
});
