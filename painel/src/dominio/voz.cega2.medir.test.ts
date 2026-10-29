import { describe, expect, it } from 'vitest';
import { CEGA2, medirLinhas } from './voz.cega2.medir';

// Conjunto "cega2": 1.020 frases escritas por um revisor independente (sintéticas). Entra como conjunto fixo de treino.
// Desacordos conhecidos e aceitos (o revisor espera outra coisa; anotados no relatório):
//  - "pedreiro ganha 450 reais por dia paguei 900": 900 é o que foi pago ("paguei"), o revisor queria dúvida.
const DESACORDOS_ACEITOS = ['pedreiro ganha 450 reais por dia paguei 900'];

describe('cega2 (revisão cega, treino)', () => {
  const m = medirLinhas(CEGA2);

  it('imprime o relatório (npm run voz:medir)', () => {
    if (!(globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env.VOZ_MEDIR) return;
    console.log(`\ncega2: ${m.total} frases; valor errado=${m.errados.length}; em branco=${m.brancos.length} (${((m.brancos.length / m.total) * 100).toFixed(1)}%); campos secundários errados=${m.secundarios.length}`);
    console.log('  errados: ' + JSON.stringify(m.errados));
    console.log('  brancos: ' + JSON.stringify(m.brancos));
    console.log('  secundários: ' + JSON.stringify(m.secundarios));
  });

  it('nenhum valor errado além dos desacordos aceitos', () => {
    expect(m.errados.filter((e) => !DESACORDOS_ACEITOS.some((d) => e.startsWith(d)))).toEqual([]);
  });

  it('poucas frases em branco', () => {
    expect(m.brancos.length / m.total).toBeLessThan(0.015);
  });
});
