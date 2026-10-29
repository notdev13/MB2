import { describe, expect, it } from 'vitest';
import { CEGA2, medirLinhas } from './voz.cega2.medir';
import { VALIDACAO1 } from './voz.validacao1';
import { VALIDACAO2 } from './voz.validacao2';
import { VALIDACAO3 } from './voz.validacao3';
import { VALIDACAO4 } from './voz.validacao4';
import { VALIDACAO5 } from './voz.validacao5';
import { VALIDACAO6 } from './voz.validacao6';

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

// Validação 4 (rodada 62): conversa com sócio, receita e cobrança ao cliente, acumulados, gírias. Medida ANTES dos ajustes:
// 16 valores errados em 155 (cobrança ao cliente, "até agora", "é de", "2,5" sem mil); depois virou treino.
describe('validação 4 (agora treino)', () => {
  const m = medirLinhas(VALIDACAO4);
  it('nenhum valor errado, nenhuma regressão de campos', () => {
    expect(m.errados).toEqual([]);
    expect(m.secundarios).toEqual([]);
  });
});

// Validação 5 (rodada 63): "um dia de obra no WhatsApp" (gastos do mestre, pedidos de dinheiro, salário, horário, oferta).
// Medida ANTES dos ajustes: 17 valores errados em 168; depois virou treino.
describe('validação 5 (agora treino)', () => {
  const m = medirLinhas(VALIDACAO5);
  it('nenhum valor errado, nenhuma regressão de campos', () => {
    expect(m.errados).toEqual([]);
    expect(m.secundarios).toEqual([]);
  });
});

// Validação 6 (rodada 64): estilo do revisor, com palavras novas e cláusulas de contrato. Medida ANTES dos ajustes:
// 18 valores errados em 162 (14 deles cláusulas/aditivo/garantia/orçamento; 4 quantidades ambíguas); depois virou treino.
describe('validação 6 (agora treino)', () => {
  const m = medirLinhas(VALIDACAO6);
  it('nenhum valor errado, nenhuma regressão de campos', () => {
    expect(m.errados).toEqual([]);
    expect(m.secundarios).toEqual([]);
  });
});
