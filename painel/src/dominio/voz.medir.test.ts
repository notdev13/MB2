import { describe, expect, it } from 'vitest';
import { CASOS_FIXOS, CASOS_ROD3, CASOS_ROD4, CASOS_ROD5, CASOS_ROD7, CASOS_ROD8, CASOS_ROD9, CASOS_ROD10, CASOS_ROD12, CASOS_ROD13, CASOS_ROD14, CASOS_ROD15, CASOS_ROD16, CASOS_ROD17, CASOS_ROD20, CASOS_ROD23, CASOS_ROD24, CASOS_ROD25, CONTEXTO, gerarCaos, gerarCasos, gerarDuplos, gerarFamilias, type Caso } from './voz.corpus';
import { interpretarFala } from './voz';
import { CASOS_ROD26, CASOS_ROD27, CASOS_ROD28 } from './voz.rodadas';
import { CASOS_ROD29 } from './voz.rodadas2';
import { CASOS_ROD30, CASOS_ROD31 } from './voz.rodadas3';
import { CASOS_ROD32 } from './voz.rodadas4';
import { CASOS_ROD35, CASOS_ROD36, CASOS_ROD37 } from './voz.rodadas5';
import { CASOS_ROD40 } from './voz.rodadas6';
import { CASOS_ROD41 } from './voz.rodadas7';
import { CASOS_ROD42 } from './voz.rodadas8';
import { CASOS_ROD43 } from './voz.rodadas9';
import { gerarAdjacentes, gerarCego, gerarServicos } from './voz.fuzz';

// Mede o interpretador de voz contra o corpus (fixo + gerado). `npm run voz:medir` imprime a taxa
// de acerto por campo e a lista de falhas; no `npm run check` só confere as garantias abaixo.

const ENV = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;
const CAMPOS = ['valor', 'data', 'pagamento', 'pago', 'categoria', 'obraId', 'fornecedor'] as const;
type Campo = (typeof CAMPOS)[number];

interface Falha { frase: string; campo: Campo; esperado: unknown; veio: unknown; tipo: string; valorErrado: boolean }

function medir(casos: Caso[]) {
  const certos: Record<string, number> = {};
  const total: Record<string, number> = {};
  const falhas: Falha[] = [];
  let valorErrado = 0;
  let valorNaoEntendido = 0;
  for (const c of casos) {
    const r = interpretarFala(c.frase, CONTEXTO);
    for (const campo of CAMPOS) {
      if (!(campo in c.esperado)) continue;
      const esperado = c.esperado[campo];
      const veio = r[campo];
      total[campo] = (total[campo] ?? 0) + 1;
      if (veio === esperado) { certos[campo] = (certos[campo] ?? 0) + 1; continue; }
      const errado = campo === 'valor' && veio !== null;
      if (campo === 'valor') { if (errado) valorErrado++; else valorNaoEntendido++; }
      falhas.push({ frase: c.frase, campo, esperado, veio, tipo: c.tipo, valorErrado: errado });
    }
  }
  return { certos, total, falhas, valorErrado, valorNaoEntendido };
}

const NIVEIS = [1, 2, 3, 4, 5, 6]; // do simples ao difícil; 3 sementes de 120 frases por nível
const BASE = Number(ENV.VOZ_BASE ?? 0); // VOZ_BASE=100 testa frases novas, nunca vistas
const gerados = NIVEIS.flatMap((nivel) => [1, 2, 3].flatMap((k) => gerarCasos(BASE + nivel * 10 + k, 120, nivel)));

// Frases de caos: o valor tem que ser o certo ou null
const caosPerigoso = [1, 2, 3, 4, 5].flatMap((k) => gerarCaos(BASE + 1000 + k, 600, true));
const duplos = [1, 2, 3].flatMap((k) => gerarDuplos(BASE + 3000 + k, 800));
const familias = [1, 2, 3].flatMap((k) => gerarFamilias(BASE + 4000 + k, 800));
const fuzz = [1, 2, 3].flatMap((k) => [...gerarAdjacentes(BASE + 5000 + k, 700), ...gerarServicos(BASE + 6000 + k, 700), ...gerarCego(BASE + 7000 + k, 700)]);
const caos = [1, 2, 3, 4, 5].flatMap((k) => gerarCaos(BASE + 2000 + k, 600));

describe('corpus da voz', () => {
  const TODOS_FIXOS = [...CASOS_FIXOS, ...CASOS_ROD3, ...CASOS_ROD4, ...CASOS_ROD5, ...CASOS_ROD7, ...CASOS_ROD8, ...CASOS_ROD9, ...CASOS_ROD10, ...CASOS_ROD12, ...CASOS_ROD13, ...CASOS_ROD14, ...CASOS_ROD15, ...CASOS_ROD16, ...CASOS_ROD17, ...CASOS_ROD20, ...CASOS_ROD23, ...CASOS_ROD24, ...CASOS_ROD25, ...CASOS_ROD26, ...CASOS_ROD27, ...CASOS_ROD28, ...CASOS_ROD29, ...CASOS_ROD30, ...CASOS_ROD31, ...CASOS_ROD32, ...CASOS_ROD35, ...CASOS_ROD36, ...CASOS_ROD37, ...CASOS_ROD40, ...CASOS_ROD41, ...CASOS_ROD42, ...CASOS_ROD43];
  const fixos = medir(TODOS_FIXOS.filter((c) => !c.pendente));
  const ger = medir(gerados);
  const cao = medir(caos);
  const duplo = medir(duplos);
  const fz = medir(fuzz);
  const fzMarcadas = fuzz.filter((c) => c.tipo.endsWith('marcado'));
  const fzBranco = fzMarcadas.filter((c) => interpretarFala(c.frase, CONTEXTO).valor === null);
  const familia = medir(familias);
  const caoPerigoso = medir(caosPerigoso);

  it('imprime o relatório (npm run voz:medir)', () => {
    if (!ENV.VOZ_MEDIR) return;
    const linhas: string[] = [];
    for (const [nome, m, n] of [['fixos', medir(TODOS_FIXOS), TODOS_FIXOS.length], ['gerados', ger, gerados.length], ['caos', cao, caos.length], ['duplos', duplo, duplos.length], ['fuzz do revisor (adjacentes, serviços, cego)', fz, fuzz.length], ['famílias', familia, familias.length], ['caos-perigoso', caoPerigoso, caosPerigoso.length]] as const) {
      linhas.push(`\n== ${nome}: ${n} frases`);
      for (const campo of CAMPOS) {
        if (m.total[campo]) linhas.push(`  ${campo.padEnd(9)} ${(((m.certos[campo] ?? 0) / m.total[campo]) * 100).toFixed(1)}%  (${m.certos[campo] ?? 0}/${m.total[campo]})`);
      }
      linhas.push(`  VALOR ERRADO: ${m.valorErrado}   valor não entendido: ${m.valorNaoEntendido}`);
      const porTipo = new Map<string, number>();
      for (const f of m.falhas) porTipo.set(`${f.campo} ${f.tipo.replace(/\/m\d$/, '')}`, (porTipo.get(`${f.campo} ${f.tipo.replace(/\/m\d$/, '')}`) ?? 0) + 1);
      linhas.push('  falhas por tipo: ' + [...porTipo].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(', '));
      const max = Number(ENV.VOZ_MAX ?? 40);
      for (const f of m.falhas.slice(0, max)) {
        linhas.push(`   - [${f.campo}${f.valorErrado ? ' ERRADO' : ''}] "${f.frase}" esperado=${JSON.stringify(f.esperado)} veio=${JSON.stringify(f.veio)}`);
      }
    }
    console.log(linhas.join('\n'));
  });

  it('casos fixos com ruído de fala (prefixo, sufixo, caixa): o valor não muda', () => {
    const mutacoes: [string, (f: string) => string][] = [
      ['então… né', (f) => `Então, ${f} né`], ['por favor', (f) => `${f}, por favor`], ['bom dia', (f) => `Bom dia, ${f}`],
      ['caixa alta', (f) => f.toUpperCase()], ['maiúscula e ponto', (f) => f[0].toUpperCase() + f.slice(1) + '.'],
      ['pra mim', (f) => `Olha, ${f} pra mim, obrigado`],
    ];
    const base = TODOS_FIXOS.filter((c) => !c.pendente && typeof c.esperado.valor === 'number');
    for (const [nome, mutar] of mutacoes) {
      const errados: string[] = [];
      const brancos: string[] = [];
      for (const c of base) {
        const v = interpretarFala(mutar(c.frase), CONTEXTO).valor;
        if (v === null) brancos.push(mutar(c.frase));
        else if (v !== c.esperado.valor) errados.push(`${mutar(c.frase)} => ${v} (esperado ${c.esperado.valor})`);
      }
      if (ENV.VOZ_MEDIR) console.log(`  mutação "${nome}" nos casos fixos: errados=${errados.length}, em branco=${brancos.length}/${base.length}`, errados.slice(0, 8), brancos.slice(0, 8));
      expect(errados, nome).toEqual([]);
      expect(brancos.length / base.length, nome).toBeLessThan(0.02);
    }
  });

  it('casos fixos: todos passam (regressão)', () => {
    expect(fixos.falhas).toEqual([]);
  });

  it('nunca devolve valor errado (na dúvida, null)', () => {
    expect(ger.falhas.filter((f) => f.valorErrado)).toEqual([]);
  });

  it('caos: nunca devolve outro número como valor', () => {
    expect(cao.falhas.filter((f) => f.valorErrado)).toEqual([]);
    expect(caoPerigoso.falhas.filter((f) => f.valorErrado)).toEqual([]);
    expect(duplo.falhas.filter((f) => f.valorErrado)).toEqual([]);
    expect(familia.falhas.filter((f) => f.valorErrado)).toEqual([]);
    expect(fz.falhas.filter((f) => f.valorErrado)).toEqual([]);
  });

  it('caos com números inofensivos: ainda acha o valor', () => {
    expect((cao.certos.valor ?? 0) / cao.total.valor).toBeGreaterThan(0.97);
  });

  it('fuzz: valor com "R$"/"reais" colado quase nunca fica em branco', () => {
    if (ENV.VOZ_MEDIR) console.log(`fuzz marcadas em branco: ${fzBranco.length}/${fzMarcadas.length}`, fzBranco.slice(0, 15).map((c) => c.frase));
    expect(fzBranco.length / fzMarcadas.length).toBeLessThan(0.03);
  });

  it('entende o valor na grande maioria das frases geradas', () => {
    expect((ger.certos.valor ?? 0) / ger.total.valor).toBeGreaterThan(0.97);
  });
});
