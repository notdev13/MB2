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
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);

  function trocarModo() {
    setCriando(!criando);
    setErro(null);
    setAviso(null);
  }

  async function entrar() {
    setErro(null);
    setAviso(null);
    if (!email.trim() || !senha) {
      setErro('Preencha e-mail e senha.');
      return;
    }
    setEntrando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setEntrando(false);
    if (error) setErro('E-mail ou senha incorretos.');
  }

  async function criarConta() {
    setErro(null);
    setAviso(null);
    if (!nome.trim() || !email.trim() || !senha) {
      setErro('Preencha nome, e-mail e senha.');
      return;
    }
    if (senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 letras ou números.');
      return;
    }
    setEntrando(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: { data: { nome: nome.trim() } },
    });
    setEntrando(false);
    if (error) {
      const c = error.code;
      setErro(
        c === 'user_already_exists' || c === 'email_exists'
          ? 'Já existe uma conta com esse e-mail. Use Entrar.'
          : c === 'weak_password'
            ? 'Senha fraca. Use uma senha maior, misturando letras e números.'
            : c === 'email_address_invalid'
              ? 'E-mail inválido. Confira o que foi digitado.'
              : c === 'over_email_send_rate_limit' || c === 'over_request_rate_limit'
                ? 'Muitas tentativas. Espere alguns minutos e tente de novo.'
                : c === 'signup_disabled'
                  ? 'Criação de conta desligada. Peça acesso à diretoria da MB2.'
                  : 'Não foi possível criar a conta. Confira a conexão e tente de novo.',
      );
      return;
    }
    // Com sessão, o app já entra sozinho. Sem sessão, falta confirmar o e-mail.
    if (!data.session) {
      setCriando(false);
      setSenha('');
      setAviso('Conta criada. Abra o e-mail que enviamos e toque no link para confirmar. Depois é só entrar aqui.');
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[s.tela, { backgroundColor: t.bg }]}>
      <View style={s.conteudo}>
        <View style={s.marca}>
          <View style={[s.quadrado, { backgroundColor: t.orange }]} />
          <Text style={[s.mb2, { color: t.text }]}>MB2 <Text style={{ fontWeight: '300', color: t.muted }}>Obras</Text></Text>
        </View>
        <Text style={[s.titulo, { color: t.text }]}>{criando ? 'Crie sua conta' : 'Entre para acompanhar suas obras'}</Text>

        {criando && (
          <>
            <Text style={[s.rotulo, { color: t.muted }]}>Nome</Text>
            <TextInput
              value={nome}
              onChangeText={setNome}
              autoCapitalize="words"
              autoComplete="name"
              placeholder="Como a equipe te chama"
              placeholderTextColor={t.muted}
              style={[s.campo, { backgroundColor: t.surface, borderColor: t.border, color: t.text }]}
              accessibilityLabel="Nome"
            />
          </>
        )}

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
          autoComplete={criando ? 'new-password' : 'password'}
          onSubmitEditing={criando ? criarConta : entrar}
          style={[s.campo, { backgroundColor: t.surface, borderColor: t.border, color: t.text }]}
          accessibilityLabel="Senha"
        />
        {erro && <Text style={[s.erro, { color: t.danger }]}>{erro}</Text>}
        {aviso && <Text style={[s.aviso, { backgroundColor: t.okBg, color: t.okText }]}>{aviso}</Text>}

        <Pressable
          onPress={criando ? criarConta : entrar}
          disabled={entrando}
          accessibilityRole="button"
          style={({ pressed }) => [s.botao, { backgroundColor: t.accent, opacity: pressed || entrando ? 0.8 : 1 }]}
        >
          {entrando ? <ActivityIndicator color={t.onAccent} /> : <Text style={[s.botaoTexto, { color: t.onAccent }]}>{criando ? 'Criar conta' : 'Entrar'}</Text>}
        </Pressable>
        <Pressable onPress={trocarModo} accessibilityRole="button" style={s.trocar}>
          <Text style={[s.trocarTexto, { color: t.accentText }]}>{criando ? 'Já tenho conta. Entrar' : 'Não tem conta? Criar conta'}</Text>
        </Pressable>
        <Text style={[s.ajuda, { color: t.muted }]}>
          {criando
            ? 'Conta nova não vê nenhuma obra. Depois de criar, peça ao engenheiro ou à diretoria para adicionar seu e-mail na equipe da obra.'
            : 'Não vê sua obra? Peça à diretoria da MB2 para incluir você na equipe.'}
        </Text>
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
  aviso: { fontSize: 14, fontWeight: '500', borderRadius: 14, padding: 14, marginTop: 8, overflow: 'hidden' },
  trocar: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  trocarTexto: { fontSize: 16, fontWeight: '600' },
  ajuda: { fontSize: 14, textAlign: 'center', marginTop: 16 },
});
