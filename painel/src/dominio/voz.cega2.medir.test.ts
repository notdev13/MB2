import { describe, expect, it } from 'vitest';
import { CEGA2, medirLinhas } from './voz.cega2.medir';
import { VALIDACAO1 } from './voz.validacao1';
import { VALIDACAO2 } from './voz.validacao2';
import { VALIDACAO3 } from './voz.validacao3';

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

// Validação 1 (rodada 59): foi medida ANTES de qualquer ajuste (4 valores errados em 165) e depois virou treino.
describe('validação 1 (agora treino)', () => {
  const m = medirLinhas(VALIDACAO1);
  it('nenhum valor errado, nenhuma regressão de campos', () => {
    expect(m.errados).toEqual([]);
    expect(m.secundarios).toEqual([]);
  });
});

// Validação 2 (rodada 60): medida ANTES dos ajustes (10 valores errados em 145, quase todos frases que não são custo:
// comando, entrada de dinheiro, preço de tabela, "se der"); depois virou treino.
describe('validação 2 (agora treino)', () => {
  const m = medirLinhas(VALIDACAO2);
  it('nenhum valor errado, nenhuma regressão de campos', () => {
    expect(m.errados).toEqual([]);
    expect(m.secundarios).toEqual([]);
  });
});

// Validação 3 (rodada 61): texto digitado, planilha colada, lembretes e contas soltas. Medida ANTES dos ajustes:
// 16 valores errados em 159 (todos "não é custo": saldo, verba, tabela, aporte, conferência); depois virou treino.
describe('validação 3 (agora treino)', () => {
  const m = medirLinhas(VALIDACAO3);
  it('nenhum valor errado, nenhuma regressão de campos', () => {
    expect(m.errados).toEqual([]);
    expect(m.secundarios).toEqual([]);
  });
});
