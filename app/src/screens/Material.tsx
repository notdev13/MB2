import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { BotaoPequeno, Campo, Escolha, estilos, Rotulo, TelaRegistro } from '../components/Form';
import { criarPedido, listarPedidos, mudarStatusPedido, Pedido, podeAprovar, StatusPedido } from '../lib/obra';
import { useTema } from '../theme';

const UNIDADES = ['sacos', 'm³', 'un', 'kg', 'm', 'barras', 'latas'].map((u) => ({ valor: u, rotulo: u }));
const DIAS = [
  { valor: '0', rotulo: 'Hoje' },
  { valor: '1', rotulo: 'Amanhã' },
  { valor: '2', rotulo: 'Depois de amanhã' },
  { valor: 'x', rotulo: 'Sem data' },
];
const PERIODOS = [
  { valor: '8', rotulo: 'Manhã (8h)' },
  { valor: '13', rotulo: 'Tarde (13h)' },
];
const STATUS: Record<StatusPedido, string> = { solicitado: 'Aguardando aprovação', aprovado: 'Aprovado', recusado: 'Recusado', entregue: 'Entregue' };

function dataEntrega(dia: string, periodo: string) {
  if (dia === 'x') return null;
  const d = new Date();
  d.setDate(d.getDate() + Number(dia));
  d.setHours(Number(periodo), 0, 0, 0);
  return d;
}

function quando(iso: string | null) {
  if (!iso) return 'Sem data de entrega';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

type Props = { obraId: string; obraNome: string; onVoltar: () => void };

export function Material({ obraId, obraNome, onVoltar }: Props) {
  const { t } = useTema();
  const [material, setMaterial] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState<string>('sacos');
  const [fornecedor, setFornecedor] = useState('');
  const [dia, setDia] = useState('1');
  const [periodo, setPeriodo] = useState('8');
  const [salvando, setSalvando] = useState(false);
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [aprovador, setAprovador] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setPedidos(await listarPedidos(obraId));
    } catch {
      setPedidos([]);
    }
  }, [obraId]);

  useEffect(() => {
    carregar();
    podeAprovar(obraId).then(setAprovador);
  }, [carregar, obraId]);

  async function enviar() {
    const qtd = Number(quantidade.replace(',', '.'));
    if (!material.trim()) return Alert.alert('Falta o material', 'Escreva o que precisa, por exemplo: cimento CP-II.');
    if (!qtd || qtd <= 0) return Alert.alert('Falta a quantidade', 'Informe quanto precisa.');
    setSalvando(true);
    try {
      await criarPedido({ obraId, material, quantidade: qtd, unidade, fornecedor, entregaEm: dataEntrega(dia, periodo) });
      setMaterial('');
      setQuantidade('');
      setFornecedor('');
      await carregar();
      Alert.alert('Pedido enviado', aprovador ? 'O pedido está na lista abaixo para aprovar.' : 'O engenheiro recebe o pedido para aprovar.');
    } catch {
      Alert.alert('Não foi possível enviar', 'Confira a conexão. Pedidos precisam de sinal para subir.');
    } finally {
      setSalvando(false);
    }
  }

  async function mudar(p: Pedido, status: StatusPedido) {
    try {
      await mudarStatusPedido(p.id, status);
      await carregar();
    } catch {
      Alert.alert('Não foi possível atualizar', 'Só engenheiro, responsável ou diretoria podem aprovar e confirmar entregas.');
    }
  }

  return (
    <TelaRegistro titulo="Pedir material" subtitulo={obraNome} onVoltar={onVoltar} botao="Enviar pedido" onBotao={enviar} ocupado={salvando}>
      <Rotulo>MATERIAL</Rotulo>
      <Campo value={material} onChangeText={setMaterial} placeholder="Ex.: Cimento CP-II 50 kg" accessibilityLabel="Material" />

      <Rotulo>QUANTIDADE</Rotulo>
      <Campo value={quantidade} onChangeText={setQuantidade} placeholder="Ex.: 40" keyboardType="decimal-pad" accessibilityLabel="Quantidade" />
      <Escolha opcoes={UNIDADES} valor={unidade} onMudar={setUnidade} />

      <Rotulo>ENTREGA</Rotulo>
      <Escolha opcoes={DIAS} valor={dia} onMudar={setDia} />
      {dia !== 'x' && <Escolha opcoes={PERIODOS} valor={periodo} onMudar={setPeriodo} />}

      <Rotulo>FORNECEDOR (OPCIONAL)</Rotulo>
      <Campo value={fornecedor} onChangeText={setFornecedor} placeholder="Ex.: Casa do Construtor" accessibilityLabel="Fornecedor" />

      <Rotulo>PEDIDOS DA OBRA</Rotulo>
      <View style={[estilos.cartao, { backgroundColor: t.surface }]}>
        {pedidos === null && <ActivityIndicator color={t.accentText} style={{ padding: 16 }} />}
        {pedidos?.length === 0 && <Text style={[estilos.sub, { color: t.muted, padding: 16 }]}>Nenhum pedido ainda.</Text>}
        {pedidos?.map((p, i) => {
          const tom =
            p.status === 'entregue' || p.status === 'aprovado'
              ? { backgroundColor: t.okBg, color: t.okText }
              : p.status === 'recusado'
                ? { backgroundColor: t.bg, color: t.muted }
                : { backgroundColor: t.warnBg, color: t.warnText };
          return (
            <View key={p.id} style={[estilos.linha, i > 0 && { borderTopWidth: 1, borderTopColor: t.divider }]}>
              <Text style={[estilos.item, { color: t.text }]}>
                {Number(p.quantidade).toLocaleString('pt-BR')} {p.unidade} · {p.material}
              </Text>
              <Text style={[estilos.sub, { color: t.muted }]}>
                {quando(p.entrega_em)}{p.fornecedor ? ` · ${p.fornecedor}` : ''}
              </Text>
              <Text style={[estilos.etiqueta, tom]}>{STATUS[p.status]}</Text>
              {aprovador && p.status === 'solicitado' && (
                <View style={estilos.acoes}>
                  <BotaoPequeno rotulo="Aprovar" onPress={() => mudar(p, 'aprovado')} />
                  <BotaoPequeno rotulo="Recusar" tom="neutro" onPress={() => mudar(p, 'recusado')} />
                </View>
              )}
              {aprovador && p.status === 'aprovado' && (
                <View style={estilos.acoes}>
                  <BotaoPequeno rotulo="Chegou na obra" onPress={() => mudar(p, 'entregue')} />
                </View>
              )}
            </View>
          );
        })}
      </View>
    </TelaRegistro>
  );
}
