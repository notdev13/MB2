import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErroAcesso, formatarCodigo, limparCodigo, usarConvite } from '../lib/acesso';
import { supabase } from '../lib/supabase';
import { useTema } from '../theme';

// Conta pendente (esperando a diretoria) ou bloqueada.
type Props = { bloqueada: boolean; codigoInicial?: string | null; onVerificar: () => Promise<void> };

export function Aguardando({ bloqueada, codigoInicial, onVerificar }: Props) {
  const { t } = useTema();
  const insets = useSafeAreaInsets();
  const [codigo, setCodigo] = useState(codigoInicial ? formatarCodigo(codigoInicial) : '');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function usar() {
    setErro(null);
    if (limparCodigo(codigo).length !== 8) return setErro('O código tem 8 letras e números, como ABCD-2345.');
    setOcupado(true);
    try {
      await usarConvite(codigo);
      await onVerificar();
    } catch (e) {
      setErro(e instanceof ErroAcesso ? e.message : 'Sem sinal ou o servidor não respondeu. Tente de novo.');
    } finally {
      setOcupado(false);
    }
  }

  async function verificar() {
    setOcupado(true);
    await onVerificar();
    setOcupado(false);
  }

  return (
    <View style={[s.tela, { backgroundColor: t.bg, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={s.conteudo}>
        <Text style={[s.titulo, { color: t.text }]}>{bloqueada ? 'Conta bloqueada' : 'Conta aguardando aprovação'}</Text>
        <Text style={[s.texto, { color: t.muted }]}>
          {bloqueada
            ? 'Seu acesso às obras foi suspenso pela diretoria da MB2. Se for engano, fale com a diretoria.'
            : 'A diretoria da MB2 precisa liberar seu acesso e escolher suas obras. Você recebe acesso assim que aprovarem.'}
        </Text>

        {!bloqueada && (
          <>
            <Text style={[s.rotulo, { color: t.muted }]}>TEM UM CÓDIGO DE CONVITE?</Text>
            <TextInput
              value={codigo}
              onChangeText={setCodigo}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="ABCD-2345"
              placeholderTextColor={t.muted}
              style={[s.campo, { backgroundColor: t.surface, borderColor: t.border, color: t.text }]}
              accessibilityLabel="Código de convite"
            />
            {erro && <Text style={[s.erro, { color: t.danger }]}>{erro}</Text>}
            <Pressable
              onPress={usar}
              disabled={ocupado}
              accessibilityRole="button"
              style={({ pressed }) => [s.botao, { backgroundColor: t.accent, opacity: pressed || ocupado ? 0.8 : 1 }]}
            >
              {ocupado ? <ActivityIndicator color={t.onAccent} /> : <Text style={[s.botaoTexto, { color: t.onAccent }]}>Usar código</Text>}
            </Pressable>
          </>
        )}

        <Pressable onPress={verificar} accessibilityRole="button" style={s.link}>
          <Text style={[s.linkTexto, { color: t.accentText }]}>Já fui aprovado. Verificar de novo</Text>
        </Pressable>
        <Pressable onPress={() => supabase.auth.signOut()} accessibilityRole="button" style={s.link}>
          <Text style={[s.linkTexto, { color: t.muted }]}>Sair</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, paddingHorizontal: 24 },
  conteudo: { flex: 1, justifyContent: 'center', gap: 10, maxWidth: 440, width: '100%', alignSelf: 'center' },
  titulo: { fontSize: 26, fontWeight: '300' },
  texto: { fontSize: 15, lineHeight: 22, marginBottom: 16 },
  rotulo: { fontSize: 13, fontWeight: '700', letterSpacing: 0.8 },
  campo: { height: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 18, letterSpacing: 2 },
  erro: { fontSize: 14 },
  botao: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  botaoTexto: { fontSize: 17, fontWeight: '700' },
  link: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  linkTexto: { fontSize: 16, fontWeight: '600' },
});
