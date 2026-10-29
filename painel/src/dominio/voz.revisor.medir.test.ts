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

export function medirRevisor(ler: (f: string) => ReturnType<typeof interpretarFala>, mutar: (f: string) => string = (f) => f) {
  const r = { total: TODOS.length, comValor: 0, comuns: 0, errados: [] as string[], branco: [] as string[], brancoComuns: [] as string[],
    campos: [] as string[], camposTotal: 0 };
  for (const c of TODOS) {
    const x = ler(mutar(c.f));
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

// Ruído que não muda o sentido: o resultado tem que ser o mesmo da frase limpa (valor, pelo menos).
const MUTACOES: [string, (f: string) => string][] = [
  ['então… né', (f) => `Então, ${f} né`], ['maiúscula e ponto', (f) => f[0].toUpperCase() + f.slice(1) + '.'],
  ['por favor', (f) => `${f}, por favor`], ['lança aí', (f) => `Lança aí: ${f}`], ['tá + tá?', (f) => `Tá, ${f}, tá?`],
  ['tudo maiúsculo', (f) => f.toUpperCase()], ['anota', (f) => `Anota aí que ${f}`],
  ['bom dia', (f) => `Bom dia, ${f}`], ['boa tarde, obrigado', (f) => `Boa tarde, ${f}, obrigado`], ['olha', (f) => `Olha, ${f} viu`],
  ['opa… ok', (f) => `Opa... ${f}... ok`], ['pra mim', (f) => `${f} pra mim`], ['aqui', (f) => `Aqui, ${f} mesmo`],
  ['espaços e quebra', (f) => `  ${f.replace(/ /g, '  ')}\n`], ['escuta', (f) => `Escuta, ${f}, beleza?`],
  ['eu + agora', (f) => `Eu ${f} agora`], ['por gentileza', (f) => `${f}, por gentileza`],
];

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

  it('ruído de fala não muda o valor', () => {
    for (const [nome, mutar] of MUTACOES) {
      const x = medirRevisor((f) => interpretarFala(f, CONTEXTO), mutar);
      if (ENV.VOZ_MEDIR) console.log(`  mutação "${nome}": valor errado=${x.errados.length}, em branco (comuns)=${pct(x.brancoComuns.length, x.comuns)}`, x.errados.slice(0, 8), x.brancoComuns.slice(0, 8));
      expect(x.errados, nome).toEqual([]);
      expect(x.brancoComuns.length / x.comuns, nome).toBeLessThan(0.03);
    }
  });

  it('nunca devolve valor errado', () => {
    expect(m.errados).toEqual([]);
  });

  it('não deixa em branco o que é comum', () => {
    expect(m.brancoComuns.length / m.comuns).toBeLessThan(0.04);
  });
});
