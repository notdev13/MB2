import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { useTema } from '../theme';

export function Login() {
  const { t } = useTema();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  async function entrar() {
    setErro(null);
    if (!email.trim() || !senha) {
      setErro('Preencha e-mail e senha.');
      return;
    }
    setEntrando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setEntrando(false);
    if (error) setErro('E-mail ou senha incorretos.');
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[s.tela, { backgroundColor: t.bg }]}>
      <View style={s.conteudo}>
        <View style={s.marca}>
          <View style={[s.quadrado, { backgroundColor: t.orange }]} />
          <Text style={[s.mb2, { color: t.text }]}>MB2 <Text style={{ fontWeight: '300', color: t.muted }}>Obras</Text></Text>
        </View>
        <Text style={[s.titulo, { color: t.text }]}>Entre para acompanhar suas obras</Text>

        <Text style={[s.rotulo, { color: t.muted }]}>E-mail</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="voce@mb2incorporacoes.com.br"
          placeholderTextColor={t.muted}
          style={[s.campo, { backgroundColor: t.surface, borderColor: t.border, color: t.text }]}
          accessibilityLabel="E-mail"
        />
        <Text style={[s.rotulo, { color: t.muted }]}>Senha</Text>
        <TextInput
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
          autoComplete="password"
          onSubmitEditing={entrar}
          style={[s.campo, { backgroundColor: t.surface, borderColor: t.border, color: t.text }]}
          accessibilityLabel="Senha"
        />
        {erro && <Text style={[s.erro, { color: t.danger }]}>{erro}</Text>}

        <Pressable
          onPress={entrar}
          disabled={entrando}
          accessibilityRole="button"
          style={({ pressed }) => [s.botao, { backgroundColor: t.accent, opacity: pressed || entrando ? 0.8 : 1 }]}
        >
          {entrando ? <ActivityIndicator color={t.onAccent} /> : <Text style={[s.botaoTexto, { color: t.onAccent }]}>Entrar</Text>}
        </Pressable>
        <Text style={[s.ajuda, { color: t.muted }]}>Não tem acesso? Peça à diretoria da MB2.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { flex: 1, justifyContent: 'center', padding: 24, gap: 8, maxWidth: 440, width: '100%', alignSelf: 'center' },
  marca: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  quadrado: { width: 18, height: 18, borderRadius: 4 },
  mb2: { fontSize: 20, fontWeight: '600' },
  titulo: { fontSize: 28, fontWeight: '300', marginBottom: 24 },
  rotulo: { fontSize: 13, fontWeight: '600', marginTop: 8 },
  campo: { height: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 16 },
  erro: { fontSize: 14, marginTop: 8 },
  botao: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  botaoTexto: { fontSize: 17, fontWeight: '700' },
  ajuda: { fontSize: 14, textAlign: 'center', marginTop: 16 },
});
