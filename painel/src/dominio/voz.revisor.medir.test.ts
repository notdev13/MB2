import { describe, expect, it } from 'vitest';
import { CASOS, CASOS2, type C } from './voz.revisor';
import { CONTEXTO } from './voz.corpus';
import { interpretarFala } from './voz';

// Régua do revisor independente: frases escritas por outra pessoa, com gabarito dela.
// Mede (a) valor errado (tem que ser 0), (b) valor em branco em frase comum (excesso de cautela) e
// (c) data, pagamento e pago. `npm run voz:medir` imprime o relatório e a lista das falhas.

const ENV = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;
const OBRAS: Record<string, string> = { lote39: 'l39', casa12: 'l12' };
const TODOS: C[] = [...CASOS, ...CASOS2];

export function medirRevisor(ler: (f: string) => ReturnType<typeof interpretarFala>) {
  const r = { total: TODOS.length, comValor: 0, comuns: 0, errados: [] as string[], branco: [] as string[], brancoComuns: [] as string[],
    campos: [] as string[], camposTotal: 0 };
  for (const c of TODOS) {
    const x = ler(c.f);
    const esperado = c.v === null ? null : Math.round(c.v * 100);
    if (esperado !== null) { r.comValor++; if (!c.dificil) r.comuns++; }
    if (x.valor !== null && x.valor !== esperado) r.errados.push(`${c.f} => ${x.valor} (esperado ${esperado})`);
    if (esperado !== null && x.valor === null) { r.branco.push(c.f); if (!c.dificil) r.brancoComuns.push(c.f); }
    const checa: [string, unknown, unknown][] = [];
    if (c.d !== undefined) checa.push(['data', x.data, c.d]);
    if (c.p !== undefined) checa.push(['pagamento', x.pagamento, c.p]);
    if (c.pago !== undefined) checa.push(['pago', x.pago, c.pago]);
    if (c.o !== undefined) checa.push(['obra', x.obraId, c.o === null ? null : OBRAS[c.o]]);
    for (const [nome, veio, esp] of checa) { r.camposTotal++; if (veio !== esp) r.campos.push(`${c.f} [${nome}] veio=${JSON.stringify(veio)} esperado=${JSON.stringify(esp)}`); }
  }
  return r;
}

describe('régua do revisor', () => {
  const m = medirRevisor((f) => interpretarFala(f, CONTEXTO));
  const pct = (a: number, b: number) => `${((a / b) * 100).toFixed(1)}% (${a}/${b})`;

  it('imprime o relatório (npm run voz:medir)', () => {
    if (!ENV.VOZ_MEDIR) return;
    console.log([
      `\n== revisor: ${m.total} frases (${m.comValor} com valor, ${m.comuns} comuns)`,
      `  VALOR ERRADO: ${m.errados.length}`, ...m.errados.map((e) => `   ! ${e}`),
      `  em branco (todas com valor): ${pct(m.branco.length, m.comValor)}`,
      `  em branco (comuns, sem as difíceis): ${pct(m.brancoComuns.length, m.comuns)}`,
      ...m.brancoComuns.map((e) => `   - ${e}`),
      `  data/pagamento/pago/obra errados: ${pct(m.campos.length, m.camposTotal)}`, ...m.campos.map((e) => `   ~ ${e}`),
    ].join('\n'));
  });

  it('nunca devolve valor errado', () => {
    expect(m.errados).toEqual([]);
  });

  it('não deixa em branco o que é comum', () => {
    expect(m.brancoComuns.length / m.comuns).toBeLessThan(0.04);
  });
});
