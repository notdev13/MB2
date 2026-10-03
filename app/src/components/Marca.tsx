import { StyleSheet, Text, View } from 'react-native';
import { fonte, useTema } from '../theme';

// Assinatura MB² · OBRAS (versão tipográfica do logo; troca pelo arquivo oficial quando houver).
export function Marca({ grande = false }: { grande?: boolean }) {
  const { t, escuro } = useTema();
  const tam = grande ? 30 : 22;
  return (
    <View style={s.linha} accessible accessibilityRole="header" accessibilityLabel="MB2 Obras">
      <Text style={{ fontFamily: fonte.forte, fontSize: tam, letterSpacing: -0.5, color: escuro ? t.bronze : t.text }}>
        MB<Text style={{ fontSize: tam * 0.55, color: t.bronze }}>²</Text>
      </Text>
      <Text style={[s.obras, { color: t.muted, fontSize: grande ? 12 : 11 }]}>OBRAS</Text>
    </View>
  );
}

const s = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  obras: { fontFamily: fonte.media, letterSpacing: 3.5 },
});
