import { StyleSheet, Text, View } from 'react-native';
import { PrevisaoObra } from '../lib/clima';
import { fonte, useTema } from '../theme';
import { Icone } from './Icone';

const horaCurta = (ms: number) => `${new Date(ms).getHours()}h`;

export function CartaoClima({ previsao: p }: { previsao: PrevisaoObra }) {
  const { t } = useTema();
  const chuva = p.chuva || !!p.chuvaAs;
  const amanha = p.amanha && `Amanhã: ${p.amanha.condicao}${p.amanha.prob != null ? `, ${p.amanha.prob}%` : ''}`;
  return (
    <View
      style={[s.cartao, { backgroundColor: t.surface, borderColor: t.border }]}
      accessible
      accessibilityLabel={`Previsão do tempo. Hoje ${p.agora} graus, máxima ${p.max}, mínima ${p.min}, ${p.condicao}.`}
    >
      <View style={s.linha}>
        <View style={[s.icone, { backgroundColor: p.chuvaAs ? t.warnBg : t.tint }]}>
          <Icone nome={chuva ? 'chuva' : 'sol'} cor={p.chuvaAs ? t.warnText : t.accentText} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[s.temp, { color: t.text }]}>
            Hoje {p.agora}° <Text style={[s.faixa, { color: t.muted }]}>· máx {p.max}° mín {p.min}°</Text>
          </Text>
          <Text style={[s.sub, { color: t.muted }]}>{p.condicao}</Text>
        </View>
      </View>
      {p.chuvaAs && (
        <Text style={[s.alerta, { backgroundColor: t.warnBg, color: t.warnText }]}>
          Chuva provável às {p.chuvaAs.hora}h. Vale antecipar a concretagem?
        </Text>
      )}
      {amanha && <Text style={[s.sub, { color: t.muted }]}>{amanha}</Text>}
      <Text style={[s.fonte, { color: t.muted }]}>
        Previsão: Open-Meteo{p.antiga ? ` · sem sinal, dados das ${horaCurta(p.atualizadaEm)}` : ''}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  cartao: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 8 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icone: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  temp: { fontSize: 15, fontFamily: fonte.forte },
  faixa: { fontSize: 13, fontFamily: fonte.texto },
  sub: { fontSize: 13, fontFamily: fonte.texto },
  alerta: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, fontFamily: fonte.media, overflow: 'hidden' },
  fonte: { fontSize: 11, fontFamily: fonte.texto },
});
