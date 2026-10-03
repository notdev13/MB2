import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTema } from '../theme';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const NOMES_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

const mesmoDia = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const semHora = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// Calendário em folha que sobe de baixo. Dias passados ficam desativados.
export function Calendario(props: { visivel: boolean; valor: Date | null; onEscolher: (d: Date | null) => void; onFechar: () => void; titulo?: string }) {
  const { t } = useTema();
  const insets = useSafeAreaInsets();
  const hoje = semHora(new Date());
  const inicial = props.valor ?? hoje;
  const [mes, setMes] = useState(new Date(inicial.getFullYear(), inicial.getMonth(), 1));

  const primeiroDia = mes.getDay();
  const diasNoMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const celulas: (Date | null)[] = [
    ...Array.from({ length: primeiroDia }, () => null),
    ...Array.from({ length: diasNoMes }, (_, i) => new Date(mes.getFullYear(), mes.getMonth(), i + 1)),
  ];
  while (celulas.length % 7) celulas.push(null);
  const semanas = Array.from({ length: celulas.length / 7 }, (_, i) => celulas.slice(i * 7, i * 7 + 7));
  const podeVoltar = mes > new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const mudarMes = (d: number) => setMes(new Date(mes.getFullYear(), mes.getMonth() + d, 1));

  return (
    <Modal visible={props.visivel} transparent animationType="slide" onRequestClose={props.onFechar}>
      <Pressable style={s.fundo} onPress={props.onFechar} accessibilityLabel="Fechar calendário" />
      <View style={[s.folha, { backgroundColor: t.surface, paddingBottom: insets.bottom + 16 }]}>
        <Text style={[s.titulo, { color: t.text }]}>{props.titulo ?? 'Data de entrega'}</Text>

        <View style={s.cabecalho}>
          <Pressable
            onPress={() => mudarMes(-1)}
            disabled={!podeVoltar}
            accessibilityRole="button"
            accessibilityLabel="Mês anterior"
            style={[s.seta, { backgroundColor: t.bg, opacity: podeVoltar ? 1 : 0.3 }]}
          >
            <Text style={[s.setaTexto, { color: t.text }]}>‹</Text>
          </Pressable>
          <Text style={[s.mes, { color: t.text }]}>
            {MESES[mes.getMonth()]} {mes.getFullYear()}
          </Text>
          <Pressable onPress={() => mudarMes(1)} accessibilityRole="button" accessibilityLabel="Próximo mês" style={[s.seta, { backgroundColor: t.bg }]}>
            <Text style={[s.setaTexto, { color: t.text }]}>›</Text>
          </Pressable>
        </View>

        <View style={s.linha}>
          {SEMANA.map((d, i) => (
            <Text key={i} style={[s.diaSemana, { color: t.muted }]}>{d}</Text>
          ))}
        </View>
        {semanas.map((sem, i) => (
          <View key={i} style={s.linha}>
            {sem.map((d, j) => {
              if (!d) return <View key={j} style={s.celula} />;
              const passado = d < hoje;
              const escolhido = props.valor && mesmoDia(d, props.valor);
              const ehHoje = mesmoDia(d, hoje);
              return (
                <Pressable
                  key={j}
                  disabled={passado}
                  onPress={() => {
                    props.onEscolher(d);
                    props.onFechar();
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: !!escolhido, disabled: passado }}
                  accessibilityLabel={`${NOMES_SEMANA[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}${ehHoje ? ', hoje' : ''}`}
                  style={s.celula}
                >
                  <View
                    style={[
                      s.dia,
                      escolhido ? { backgroundColor: t.accent } : ehHoje ? { borderWidth: 1.5, borderColor: t.accentText } : null,
                    ]}
                  >
                    <Text style={[s.diaTexto, { color: escolhido ? t.onAccent : passado ? t.border : t.text }]}>{d.getDate()}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}

        <View style={s.rodape}>
          <Pressable
            onPress={() => {
              props.onEscolher(null);
              props.onFechar();
            }}
            accessibilityRole="button"
            style={[s.botao, { borderWidth: 1, borderColor: t.border }]}
          >
            <Text style={[s.botaoTexto, { color: t.text }]}>Sem data</Text>
          </Pressable>
          <Pressable onPress={props.onFechar} accessibilityRole="button" style={[s.botao, { backgroundColor: t.tint }]}>
            <Text style={[s.botaoTexto, { color: t.accentText }]}>Fechar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  folha: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 20, gap: 6 },
  titulo: { fontSize: 18, fontWeight: '700', paddingHorizontal: 4 },
  cabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 },
  seta: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  setaTexto: { fontSize: 26, fontWeight: '400', marginTop: -3 },
  mes: { fontSize: 17, fontWeight: '700' },
  linha: { flexDirection: 'row' },
  diaSemana: { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '700', paddingVertical: 4 },
  celula: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center' },
  dia: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  diaTexto: { fontSize: 16, fontWeight: '600' },
  rodape: { flexDirection: 'row', gap: 8, marginTop: 10 },
  botao: { flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  botaoTexto: { fontSize: 15, fontWeight: '700' },
});
