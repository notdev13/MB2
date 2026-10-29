import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecSim, montar } from './simuladorVoz';
import { LIMITE_MS, unirSemRepetir, type ConstrutorVoz } from './sessaoVoz';
import { criarControleFalar } from './Falar.logica';

beforeEach(() => { vi.useFakeTimers(); RecSim.reset(); });
afterEach(() => { vi.useRealTimers(); });

function sorteio(semente: number) {
  let a = semente;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const letras = (n: number) => { let s = ''; do { s = String.fromCharCode(97 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0); return s; };
const acentuar = (p: string, rnd: () => number) => (rnd() < 0.5 ? p.toUpperCase() : p) + (rnd() < 0.3 ? ',' : '');

describe('Rodada 22: propriedades de unirSemRepetir (3000 casos)', () => {
  it('C111 união completa, sem duplicar, sem perder, com repetições disfarçadas', () => {
    for (let s = 1; s <= 3000; s++) {
      const rnd = sorteio(s); let n = 0;
      const novoId = () => letras(n++) + (rnd() < 0.5 ? '1' : ''); // com e sem dígito
      const ant = Array.from({ length: 1 + Math.floor(rnd() * 8) }, novoId);
      const frescas = Array.from({ length: Math.floor(rnd() * 5) }, novoId);
      const modo = Math.floor(rnd() * 4);
      let novo: string[];
      if (modo === 0) novo = [...ant.slice(-(1 + Math.floor(rnd() * ant.length))), ...frescas];      // repete o final
      else if (modo === 1) novo = [...frescas, ...ant, ...Array.from({ length: Math.floor(rnd() * 3) }, novoId)]; // reescreveu com contexto
      else if (modo === 2) novo = frescas;                                                              // fala nova
      else novo = [...ant]; // repete tudo
      const out = unirSemRepetir(ant.join(' '), novo.map((p) => acentuar(p, rnd)).join(' ')).split(' ');
      const norm = out.map((p) => p.toLowerCase().replace(/[^a-z0-9]/g, ''));
      const rotulo = `caso ${s} modo ${modo}: [${ant}] + [${novo}] -> [${out}]`;
      // nenhuma palavra duplicada (todas as palavras geradas são distintas)
      // (exceção documentada: palavra única sem dígito achada no meio do trecho novo pode ser fala nova)
      const ambiguo = ant.length === 1 && !/\d/.test(ant[0]) && modo === 1;
      if (!ambiguo) expect(new Set(norm).size, rotulo).toBe(norm.length);
      // nada se perde: toda palavra, antiga ou nova, continua lá — exceto que palavra única sem dígito pode
      // ser "fala nova" e nesse caso também fica
      for (const p of [...ant, ...novo]) expect(norm, rotulo).toContain(p.toLowerCase());
      // a ordem do que já tinha é mantida
      const pos = ant.map((p) => norm.indexOf(p.toLowerCase()));
      expect([...pos].sort((x, y) => x - y), rotulo).toEqual(pos);
    }
  });
});

describe('Rodada 23: sessão com falhas de start(), repetições e laços (fuzz)', () => {
  it('C112 500 sementes: termina, um aoFim por início, sem timers, sem palavras repetidas', () => {
    for (let s = 40000; s < 40500; s++) {
      RecSim.reset(); vi.clearAllTimers();
      const rnd = sorteio(s); const r = montar();
      let palavra = 0; let iniciadas = 0; let acc: string[] = []; let vista = 0;
      for (let p = 0; p < 70; p++) {
        if (RecSim.todas.length !== vista) { vista = RecSim.todas.length; const antes = acc; acc = rnd() < 0.6 ? antes.slice(-1 - Math.floor(rnd() * 3)) : []; }
        const op = Math.floor(rnd() * 11); const rec = RecSim.ultima();
        if (op === 0) { const estava = r.sessao.ativa(); r.sessao.iniciar(); if (!estava) { iniciadas++; acc = []; vista = RecSim.todas.length; } }
        else if (op === 1) r.sessao.parar();
        else if (op === 2) RecSim.falhasRestantes = Math.floor(rnd() * 4);
        else if (!rec) continue;
        else if (op === 3) rec.abriu();
        else if (op === 4) rec.soStart();
        else if (op === 5) { acc.push(`w${palavra++}`); rec.resultados([acc.join(' '), rnd() > 0.5]); }
        else if (op === 6) rec.fim();
        else if (op === 7) rec.erro(['no-speech', 'aborted', 'network', 'x'][Math.floor(rnd() * 4)]);
        else if (op === 8) vi.advanceTimersByTime(Math.floor(rnd() * 300));
        else if (op === 9) vi.advanceTimersByTime(Math.floor(rnd() * 3000));
        else vi.advanceTimersByTime(LIMITE_MS);
        const t = r.textos[r.textos.length - 1] ?? '';
        const ws = t.split(/\s+/).filter((x) => /^w\d+$/.test(x));
        expect(new Set(ws).size, `semente ${s} passo ${p}: ${t}`).toBe(ws.length);
      }
      RecSim.falhasRestantes = 0; RecSim.falhaNoStart = null;
      for (let k = 0; k < 3; k++) { RecSim.ultima()?.fim(); vi.advanceTimersByTime(LIMITE_MS * 2); }
      expect(r.sessao.ativa(), `semente ${s}`).toBe(false);
      expect(vi.getTimerCount(), `semente ${s}`).toBe(0);
      expect(r.fins.length, `semente ${s}`).toBe(iniciadas);
      for (const f of r.fins) { const ws = f.texto.split(/\s+/).filter((x) => /^w\d+$/.test(x)); expect(new Set(ws).size, `semente ${s} fim`).toBe(ws.length); }
    }
  });
});

describe('Rodada 24: controle com muita edição manual e desmontar dentro do aoEntender', () => {
  it('C113 500 sementes dominadas por digitar/focar/enter; texto digitado nunca se perde', () => {
    for (let s = 50000; s < 50500; s++) {
      RecSim.reset(); vi.clearAllTimers();
      const rnd = sorteio(s); let n = 0; let morto = false; let fixo: string | null = null;
      let depoisDeMorto = 0;
      const c = criarControleFalar({
        obterConstrutor: () => RecSim as unknown as ConstrutorVoz,
        aoEntender: () => { if (morto) depoisDeMorto++; if (rnd() < 0.1) { c.destruir(); morto = true; } },
        aoMudar: () => { if (morto) depoisDeMorto++; },
      });
      let acc: string[] = [];
      for (let p = 0; p < 60 && !morto; p++) {
        const op = Math.floor(rnd() * 12); const rec = RecSim.ultima();
        const v = c.visao();
        if (op <= 2) { const valor = `${v.texto} d${n++}`.trim(); c.digitar(valor); fixo = valor; }
        else if (op === 3) { c.focar(); if (v.estado !== 'pronto' && v.estado !== 'erro') fixo = null; }
        else if (op === 4) { c.enter(); }
        else if (op === 5) { c.ouvir(); acc = []; fixo = null; }
        else if (op === 6) { c.preencher(); }
        else if (!rec) continue;
        else if (op === 7) rec.abriu();
        else if (op === 8) { acc.push(`w${n++}`); rec.resultados([acc.join(' '), rnd() > 0.5]); }
        else if (op === 9) rec.fim();
        else vi.advanceTimersByTime(Math.floor(rnd() * 3000));
        if (!morto && fixo !== null && (op >= 7)) expect(c.visao().texto, `semente ${s} passo ${p}`).toBe(fixo);
      }
      c.destruir(); vi.advanceTimersByTime(LIMITE_MS * 3);
      expect(vi.getTimerCount(), `semente ${s}`).toBe(0);
      expect(depoisDeMorto, `semente ${s}`).toBe(0);
      expect(RecSim.todas.filter((x) => x.onend || x.onresult), `semente ${s}`).toEqual([]);
    }
  });
});
