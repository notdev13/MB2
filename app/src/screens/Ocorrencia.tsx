import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { BotaoPequeno, Campo, Escolha, estilos, Rotulo, TelaRegistro } from '../components/Form';
import { criarOcorrencia, Gravidade, listarOcorrencias, Ocorrencia as Item, resolverOcorrencia } from '../lib/obra';
import { useTema } from '../theme';

const GRAVIDADES: { valor: Gravidade; rotulo: string }[] = [
  { valor: 'baixa', rotulo: 'Baixa' },
  { valor: 'media', rotulo: 'Média' },
  { valor: 'alta', rotulo: 'Alta' },
];
const NOME_GRAVIDADE: Record<Gravidade, string> = { baixa: 'Gravidade baixa', media: 'Gravidade média', alta: 'Gravidade alta' };

const quando = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }) + ', ' + new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

type Props = { obraId: string; obraNome: string; onVoltar: () => void };

export function Ocorrencia({ obraId, obraNome, onVoltar }: Props) {
  const { t } = useTema();
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [gravidade, setGravidade] = useState<Gravidade>('media');
  const [salvando, setSalvando] = useState(false);
  const [itens, setItens] = useState<Item[] | null>(null);

  const carregar = useCallback(async () => {
    try {
      setItens(await listarOcorrencias(obraId));
    } catch {
      setItens([]);
    }
  }, [obraId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function registrar() {
    if (!titulo.trim()) return Alert.alert('Falta o resumo', 'Escreva em poucas palavras o que aconteceu.');
    setSalvando(true);
    try {
      await criarOcorrencia({ obraId, titulo, descricao, gravidade });
      setTitulo('');
      setDescricao('');
      setGravidade('media');
      await carregar();
      Alert.alert('Ocorrência registrada', 'Ela aparece na tela Hoje até ser resolvida.');
    } catch {
      Alert.alert('Não foi possível registrar', 'Confira a conexão. Ocorrências precisam de sinal para subir.');
    } finally {
      setSalvando(false);
    }
  }

  async function alternar(o: Item) {
    try {
      await resolverOcorrencia(o.id, !o.resolvida);
      await carregar();
    } catch {
      Alert.alert('Não foi possível atualizar', 'Confira a conexão e tente de novo.');
    }
  }

  return (
    <TelaRegistro titulo="Ocorrência" subtitulo={obraNome} onVoltar={onVoltar} botao="Registrar ocorrência" onBotao={registrar} ocupado={salvando}>
      <Rotulo>O QUE ACONTECEU</Rotulo>
      <Campo value={titulo} onChangeText={setTitulo} placeholder="Ex.: Infiltração na laje do 2º pav." accessibilityLabel="Resumo da ocorrência" />

      <Rotulo>GRAVIDADE</Rotulo>
      <Escolha opcoes={GRAVIDADES} valor={gravidade} onMudar={setGravidade} />

      <Rotulo>DETALHES (OPCIONAL)</Rotulo>
      <Campo
        value={descricao}
        onChangeText={setDescricao}
        multiline
        placeholder="Onde, desde quando e o que já foi feito. Use o microfone do teclado para ditar."
        accessibilityLabel="Detalhes"
      />

      <Rotulo>OCORRÊNCIAS DA OBRA</Rotulo>
      <View style={[estilos.cartao, { backgroundColor: t.surface }]}>
        {itens === null && <ActivityIndicator color={t.accentText} style={{ padding: 16 }} />}
        {itens?.length === 0 && <Text style={[estilos.sub, { color: t.muted, padding: 16 }]}>Nenhuma ocorrência registrada.</Text>}
        {itens?.map((o, i) => (
          <View key={o.id} style={[estilos.linha, i > 0 && { borderTopWidth: 1, borderTopColor: t.divider }, o.resolvida && { opacity: 0.6 }]}>
            <Text style={[estilos.item, { color: t.text }]}>{o.titulo}</Text>
            {!!o.descricao && <Text style={[estilos.sub, { color: t.text }]}>{o.descricao}</Text>}
            <Text style={[estilos.sub, { color: t.muted }]}>{quando(o.criado_em)}</Text>
            <Text
              style={[
                estilos.etiqueta,
                o.resolvida
                  ? { backgroundColor: t.okBg, color: t.okText }
                  : o.gravidade === 'alta'
                    ? { backgroundColor: t.warnBg, color: t.warnText }
                    : { backgroundColor: t.bg, color: t.text },
              ]}
            >
              {o.resolvida ? 'Resolvida' : NOME_GRAVIDADE[o.gravidade]}
            </Text>
            <View style={estilos.acoes}>
              <BotaoPequeno rotulo={o.resolvida ? 'Reabrir' : 'Marcar como resolvida'} tom={o.resolvida ? 'neutro' : 'principal'} onPress={() => alternar(o)} />
            </View>
          </View>
        ))}
      </View>
    </TelaRegistro>
  );
}
