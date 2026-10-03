import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icone } from '../components/Icone';
import { carregarDiarioDoDia, Clima, Efetivo, guardarFoto, hojeISO, novoId, salvarDiario } from '../lib/diario';
import { useTema } from '../theme';

const FUNCOES = ['Pedreiros', 'Serventes', 'Pintores', 'Armadores', 'Eletricistas', 'Encanadores'];
const CLIMAS: { valor: Clima; rotulo: string }[] = [
  { valor: 'sol', rotulo: 'Sol' },
  { valor: 'nublado', rotulo: 'Nublado' },
  { valor: 'chuva', rotulo: 'Chuva' },
];

type Props = { obraId: string; obraNome: string; onVoltar: () => void };

export function Diario({ obraId, obraNome, onVoltar }: Props) {
  const { t } = useTema();
  const insets = useSafeAreaInsets();
  const [clima, setClima] = useState<Clima | null>(null);
  const [atividades, setAtividades] = useState('');
  const [efetivo, setEfetivo] = useState<Efetivo[]>(FUNCOES.map((funcao) => ({ funcao, quantidade: 0 })));
  const [novaFuncao, setNovaFuncao] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);

  // Se o diário de hoje já existe, abre preenchido para continuar.
  useEffect(() => {
    carregarDiarioDoDia(obraId)
      .then((d) => {
        if (!d) return;
        setClima(d.clima);
        setAtividades(d.atividades ?? '');
        setEfetivo((atual) => {
          const mapa = new Map(atual.map((e) => [e.funcao, e]));
          d.diario_efetivo.forEach((e) => mapa.set(e.funcao, { funcao: e.funcao, quantidade: e.quantidade }));
          return [...mapa.values()];
        });
      })
      .catch(() => {});
  }, [obraId]);

  const mudar = (funcao: string, delta: number) =>
    setEfetivo((l) => l.map((e) => (e.funcao === funcao ? { ...e, quantidade: Math.max(0, e.quantidade + delta) } : e)));

  function adicionarFuncao() {
    const nome = novaFuncao.trim();
    if (!nome || efetivo.some((e) => e.funcao.toLowerCase() === nome.toLowerCase())) return;
    setEfetivo((l) => [...l, { funcao: nome, quantidade: 1 }]);
    setNovaFuncao('');
  }

  async function adicionarFoto(origem: 'camera' | 'galeria') {
    const permissao =
      origem === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert('Permissão negada', origem === 'camera' ? 'Libere o acesso à câmera nos ajustes do celular.' : 'Libere o acesso às fotos nos ajustes do celular.');
      return;
    }
    const opcoes: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, allowsMultipleSelection: origem === 'galeria', selectionLimit: 10 };
    const r = origem === 'camera' ? await ImagePicker.launchCameraAsync(opcoes) : await ImagePicker.launchImageLibraryAsync(opcoes);
    if (r.canceled) return;
    const guardadas = await Promise.all(r.assets.map((a) => guardarFoto(a.uri)));
    setFotos((f) => [...f, ...guardadas]);
  }

  async function salvar() {
    setSalvando(true);
    try {
      const resultado = await salvarDiario({ id: novoId(), obraId, data: hojeISO(), clima, atividades, efetivo, fotos });
      Alert.alert(
        resultado === 'enviado' ? 'Diário salvo' : 'Salvo no aparelho',
        resultado === 'enviado' ? 'O diário de hoje foi registrado.' : 'Sem sinal agora. O diário sobe sozinho quando a conexão voltar.',
      );
      onVoltar();
    } catch {
      Alert.alert('Não foi possível salvar', 'Confira se você tem permissão para registrar nesta obra.');
    } finally {
      setSalvando(false);
    }
  }

  const total = efetivo.reduce((s, e) => s + e.quantidade, 0);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={[s.topo, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={onVoltar} accessibilityRole="button" style={s.voltar}>
          <Text style={[s.voltarTexto, { color: t.accentText }]}>Cancelar</Text>
        </Pressable>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={[s.topoTitulo, { color: t.text }]}>Diário de hoje</Text>
          <Text style={[s.sub, { color: t.muted }]} numberOfLines={1}>{obraNome}</Text>
        </View>
        <View style={s.voltar} />
      </View>

      <ScrollView contentContainerStyle={s.conteudo} keyboardShouldPersistTaps="handled">
        <Text style={[s.rotulo, { color: t.muted }]}>CLIMA</Text>
        <View style={s.linhaClima}>
          {CLIMAS.map((c) => {
            const ativo = clima === c.valor;
            return (
              <Pressable
                key={c.valor}
                onPress={() => setClima(ativo ? null : c.valor)}
                accessibilityRole="button"
                accessibilityState={{ selected: ativo }}
                style={[s.clima, ativo ? { backgroundColor: t.accent } : { backgroundColor: t.surface, borderColor: t.border, borderWidth: 1 }]}
              >
                <Text style={[s.climaTexto, { color: ativo ? t.onAccent : t.text }]}>{c.rotulo}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[s.rotulo, { color: t.muted }]}>EFETIVO NA OBRA · {total} {total === 1 ? 'PESSOA' : 'PESSOAS'}</Text>
        <View style={[s.cartao, { backgroundColor: t.surface }]}>
          {efetivo.map((e, i) => (
            <View key={e.funcao} style={[s.linhaEfetivo, i > 0 && { borderTopWidth: 1, borderTopColor: t.divider }]}>
              <Text style={[s.funcao, { color: t.text }]}>{e.funcao}</Text>
              <Pressable onPress={() => mudar(e.funcao, -1)} accessibilityLabel={`Diminuir ${e.funcao}`} style={[s.passo, { backgroundColor: t.bg }]}>
                <Text style={[s.passoTexto, { color: t.text }]}>−</Text>
              </Pressable>
              <Text style={[s.qtd, { color: t.text }]}>{e.quantidade}</Text>
              <Pressable onPress={() => mudar(e.funcao, 1)} accessibilityLabel={`Aumentar ${e.funcao}`} style={[s.passo, { backgroundColor: t.bg }]}>
                <Text style={[s.passoTexto, { color: t.text }]}>+</Text>
              </Pressable>
            </View>
          ))}
          <View style={[s.linhaEfetivo, { borderTopWidth: 1, borderTopColor: t.divider }]}>
            <TextInput
              value={novaFuncao}
              onChangeText={setNovaFuncao}
              onSubmitEditing={adicionarFuncao}
              placeholder="Outra função (ex.: Carpinteiros)"
              placeholderTextColor={t.muted}
              style={[s.funcao, { color: t.text, paddingVertical: 10 }]}
              accessibilityLabel="Nova função"
            />
            <Pressable onPress={adicionarFuncao} accessibilityRole="button" style={[s.passo, { backgroundColor: t.tint, width: 'auto', paddingHorizontal: 14 }]}>
              <Text style={[s.adicionar, { color: t.accentText }]}>Adicionar</Text>
            </Pressable>
          </View>
        </View>

        <Text style={[s.rotulo, { color: t.muted }]}>O QUE FOI FEITO HOJE</Text>
        <TextInput
          value={atividades}
          onChangeText={setAtividades}
          multiline
          placeholder="Ex.: Elevação de alvenaria eixo B-C, 3º pav. Use o microfone do teclado para ditar."
          placeholderTextColor={t.muted}
          style={[s.texto, { backgroundColor: t.surface, borderColor: t.border, color: t.text }]}
          accessibilityLabel="O que foi feito hoje"
        />

        <Text style={[s.rotulo, { color: t.muted }]}>FOTOS</Text>
        <View style={s.fotos}>
          <Pressable onPress={() => adicionarFoto('camera')} accessibilityRole="button" accessibilityLabel="Tirar foto" style={[s.addFoto, { borderColor: t.border }]}>
            <Icone nome="foto" cor={t.accentText} tamanho={24} />
            <Text style={[s.addTexto, { color: t.accentText }]}>Câmera</Text>
          </Pressable>
          <Pressable onPress={() => adicionarFoto('galeria')} accessibilityRole="button" accessibilityLabel="Escolher da galeria" style={[s.addFoto, { borderColor: t.border }]}>
            <Icone nome="diario" cor={t.accentText} tamanho={24} />
            <Text style={[s.addTexto, { color: t.accentText }]}>Galeria</Text>
          </Pressable>
          {fotos.map((uri) => (
            <Pressable key={uri} onLongPress={() => setFotos((f) => f.filter((x) => x !== uri))} accessibilityLabel="Foto. Toque e segure para remover">
              <Image source={{ uri }} style={s.miniatura} />
            </Pressable>
          ))}
        </View>
        {fotos.length > 0 && <Text style={[s.sub, { color: t.muted }]}>Toque e segure uma foto para remover.</Text>}
      </ScrollView>

      <View style={[s.rodape, { backgroundColor: t.surface, borderTopColor: t.divider, paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          onPress={salvar}
          disabled={salvando}
          accessibilityRole="button"
          style={({ pressed }) => [s.salvar, { backgroundColor: t.accent, opacity: pressed || salvando ? 0.8 : 1 }]}
        >
          {salvando ? <ActivityIndicator color={t.onAccent} /> : <Text style={[s.salvarTexto, { color: t.onAccent }]}>Salvar diário</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  topo: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8 },
  voltar: { minWidth: 80, minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  voltarTexto: { fontSize: 16, fontWeight: '600' },
  topoTitulo: { fontSize: 16, fontWeight: '700' },
  sub: { fontSize: 13 },
  conteudo: { padding: 20, gap: 10, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' },
  rotulo: { fontSize: 13, fontWeight: '700', letterSpacing: 0.8, marginTop: 10 },
  linhaClima: { flexDirection: 'row', gap: 8 },
  clima: { flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  climaTexto: { fontSize: 15, fontWeight: '700' },
  cartao: { borderRadius: 16, overflow: 'hidden' },
  linhaEfetivo: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 8, paddingVertical: 6, gap: 4 },
  funcao: { flex: 1, fontSize: 15, fontWeight: '600' },
  passo: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  passoTexto: { fontSize: 22, fontWeight: '600' },
  qtd: { width: 34, textAlign: 'center', fontSize: 17, fontWeight: '700' },
  adicionar: { fontSize: 14, fontWeight: '700' },
  texto: { minHeight: 110, borderWidth: 1, borderRadius: 16, padding: 14, fontSize: 15, textAlignVertical: 'top' },
  fotos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  addFoto: { width: 84, height: 84, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  addTexto: { fontSize: 12, fontWeight: '700' },
  miniatura: { width: 84, height: 84, borderRadius: 14 },
  rodape: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  salvar: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  salvarTexto: { fontSize: 17, fontWeight: '700' },
});
