import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useTema } from '../theme';

// Primeiro acesso de conta criada pela diretoria: troca a senha provisória.
export function TrocarSenha() {
  const { t } = useTema();
  const insets = useSafeAreaInsets();
  const [senha, setSenha] = useState('');
  const [repetir, setRepetir] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function salvar() {
    setErro(null);
    if (senha.length < 8) return setErro('Use pelo menos 8 letras ou números.');
    if (senha !== repetir) return setErro('As duas senhas não estão iguais.');
    setOcupado(true);
    const { error } = await supabase.auth.updateUser({ password: senha, data: { senha_provisoria: false } });
    setOcupado(false);
    if (error) {
      setErro(
        error.code === 'same_password'
          ? 'Escolha uma senha diferente da provisória.'
          : error.code === 'weak_password'
            ? 'Senha fraca. Misture letras e números.'
            : 'Não foi possível salvar. Confira a conexão e tente de novo.',
      );
    }
  }

  const campo = [s.campo, { backgroundColor: t.surface, borderColor: t.border, color: t.text }];
  return (
    <View style={[s.tela, { backgroundColor: t.bg, paddingTop: insets.top + 24 }]}>
      <View style={s.conteudo}>
        <Text style={[s.titulo, { color: t.text }]}>Crie sua senha</Text>
        <Text style={[s.texto, { color: t.muted }]}>Sua conta foi criada pela diretoria com uma senha provisória. Escolha uma senha só sua.</Text>
        <Text style={[s.rotulo, { color: t.muted }]}>Nova senha</Text>
        <TextInput value={senha} onChangeText={setSenha} secureTextEntry autoComplete="new-password" style={campo} accessibilityLabel="Nova senha" />
        <Text style={[s.rotulo, { color: t.muted }]}>Repita a senha</Text>
        <TextInput value={repetir} onChangeText={setRepetir} secureTextEntry onSubmitEditing={salvar} style={campo} accessibilityLabel="Repita a senha" />
        {erro && <Text style={[s.erro, { color: t.danger }]}>{erro}</Text>}
        <Pressable
          onPress={salvar}
          disabled={ocupado}
          accessibilityRole="button"
          style={({ pressed }) => [s.botao, { backgroundColor: t.accent, opacity: pressed || ocupado ? 0.8 : 1 }]}
        >
          {ocupado ? <ActivityIndicator color={t.onAccent} /> : <Text style={[s.botaoTexto, { color: t.onAccent }]}>Salvar senha</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, paddingHorizontal: 24 },
  conteudo: { flex: 1, justifyContent: 'center', gap: 8, maxWidth: 440, width: '100%', alignSelf: 'center' },
  titulo: { fontSize: 26, fontWeight: '300' },
  texto: { fontSize: 15, lineHeight: 22, marginBottom: 16 },
  rotulo: { fontSize: 13, fontWeight: '600', marginTop: 8 },
  campo: { height: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 16 },
  erro: { fontSize: 14, marginTop: 8 },
  botao: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  botaoTexto: { fontSize: 17, fontWeight: '700' },
});
