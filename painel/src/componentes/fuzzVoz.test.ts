import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecSim, montar } from './simuladorVoz';
import { LIMITE_MS, unirSemRepetir, type ConstrutorVoz } from './sessaoVoz';
import { criarControleFalar } from './Falar.logica';

// Sequências aleatórias (sementes fixas: mesma semente, mesma sequência) com invariantes que valem
// sempre. Se uma semente falhar, o rótulo da mensagem diz qual e em que passo.

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
const CODIGOS = ['no-speech', 'aborted', 'network', 'not-allowed', 'service-not-allowed', 'audio-capture', 'x'];
const soPalavras = (t: string) => t.split(/\s+/).filter((x) => /^[wd]\d+$/.test(x));

/** O Safari, ao reiniciar, repete (às vezes) o final do que já falou: sempre 3 ou mais palavras. */
function repeticao(anterior: string[], rnd: () => number, chance: number): string[] {
  return anterior.length >= 3 && rnd() < chance ? anterior.slice(-(3 + Math.floor(rnd() * 3))) : [];
}

describe('unirSemRepetir: propriedades (3000 casos)', () => {
  it('repetição longa some; repetição curta ou só de valor nunca apaga nada', () => {
    for (let s = 1; s <= 3000; s++) {
      const rnd = sorteio(s); let n = 0;
      const id = () => letras(n++) + (rnd() < 0.5 ? '1' : '');   // palavras distintas, com e sem dígito
      const ant = Array.from({ length: 1 + Math.floor(rnd() * 8) }, id);
      const frescas = Array.from({ length: Math.floor(rnd() * 5) }, id);
      const modo = Math.floor(rnd() * 5);
      const k3 = ant.length >= 3;
      let novo: string[]; let repetidas = 0;
      if (modo === 0 && k3) { repetidas = 3 + Math.floor(rnd() * (ant.length - 2)); novo = [...ant.slice(-repetidas), ...frescas]; }
      else if (modo === 1 && k3) { repetidas = ant.length; novo = [...frescas, ...ant, ...frescas.map((p) => `${p}z`)]; }
      else if (modo === 2) novo = frescas;
      else if (modo === 3) { const k = 1 + Math.floor(rnd() * Math.min(2, ant.length)); novo = [...ant.slice(-k), ...frescas]; }   // 1-2 palavras
      else novo = frescas;
      const rotulo = `caso ${s} modo ${modo}: [${ant}] + [${novo}]`;
      const a = ant.join(' ');
      const b = novo.map((p) => (rnd() < 0.5 ? p.toUpperCase() : p) + (rnd() < 0.3 ? ',' : '')).join(' ');
      const out = unirSemRepetir(a, b).split(' ');
      const norm = out.map((p) => p.toLowerCase().replace(/[^a-z0-9]/g, ''));
      // sem repetição longa: NADA é descartado (o resultado é a concatenação exata)
      if (repetidas === 0) expect(out.length, rotulo).toBe(ant.length + novo.length);
      else {
        expect(new Set(norm).size, rotulo).toBe(norm.length);                        // repetição longa foi descartada
        for (const p of [...ant, ...novo]) expect(norm, rotulo).toContain(p.toLowerCase());   // e nada novo se perdeu
      }
      const pos = ant.map((p) => norm.indexOf(p.toLowerCase()));                           // a ordem do que já havia é mantida
      expect([...pos].sort((x, y) => x - y), rotulo).toEqual(pos);
    }
  });
});

describe('dois valores iguais legítimos nunca somem (sessão com reinícios)', () => {
  it('600 sementes: cada frase falada continua no texto final, mesmo com valor igual e repetição do Safari', () => {
    const valores = ['360', '2 mil', 'dois mil', '50', '1,50', 'dois mil e quinhentos', '2 mil reais'];
    const materiais = ['cimento', 'areia', 'brita', 'tijolo', 'ferro', 'cal'];
    for (let s = 60000; s < 60600; s++) {
      RecSim.reset(); vi.clearAllTimers();
      const rnd = sorteio(s); const r = montar();
      const v = valores[Math.floor(rnd() * valores.length)];
      // Frases que terminam no valor ("paguei 360") seguidas de outra que começa por ele ("360 de areia"),
      // que é exatamente onde uma regra apressada apagaria um valor legítimo.
      const frases = Array.from({ length: 2 + Math.floor(rnd() * 3) }, (_, i) => {
        const inicio = i === 0 ? 'paguei ' : ['', 'e ', 'mais '][Math.floor(rnd() * 3)];
        const termina = i < 3 && rnd() < 0.4 && i === 0 ? '' : ` de ${materiais[i]}`;
        return `${inicio}${v}${termina}`;
      });
      r.sessao.iniciar(); RecSim.ultima().abriu();
      frases.forEach((f, i) => {
        const anterior = frases[i - 1] ?? '';   // o Safari só repete frases longas (3+ palavras) como erro
        const repete = i > 0 && anterior.split(' ').length >= 3 && anterior.includes(' de ') && rnd() < 0.5 ? `${anterior} ` : '';
        RecSim.ultima().resultados([repete + f, true]);
        if (i < frases.length - 1) { RecSim.ultima().fim(); RecSim.ultima().abriu(); }
      });
      r.sessao.parar(); RecSim.ultima().fim();
      const final = r.fins[0].texto;
      const contagem = final.split(v).length - 1;
      expect(contagem, `semente ${s}: "${final}" (esperava ${frases.length} × "${v}")`).toBe(frases.length);
      for (const m of materiais.slice(0, frases.length)) expect(final.split(m).length - 1 <= 1, `semente ${s} ${m}: ${final}`).toBe(true);
    }
  });
});

describe('sessão: sequências aleatórias com falhas de start() e repetições', () => {
  it('500 sementes: sempre termina, um aoFim por início, sem timers, sem palavras repetidas', () => {
    for (let s = 40000; s < 40500; s++) {
      RecSim.reset(); vi.clearAllTimers();
      const rnd = sorteio(s); const r = montar();
      let palavra = 0; let iniciadas = 0; let acc: string[] = []; let vista = 0;
      for (let p = 0; p < 70; p++) {
        if (RecSim.todas.length !== vista) { vista = RecSim.todas.length; acc = repeticao(acc, rnd, 0.6); }
        const op = Math.floor(rnd() * 11); const rec = RecSim.ultima();
        if (op === 0) { const estava = r.sessao.ativa(); r.sessao.iniciar(); if (!estava) { iniciadas++; acc = []; vista = RecSim.todas.length; } }
        else if (op === 1) r.sessao.parar();
        else if (op === 2) RecSim.falhasRestantes = Math.floor(rnd() * 4);
        else if (!rec) continue;
        else if (op === 3) rec.abriu();
        else if (op === 4) rec.soStart();
        else if (op === 5) { acc.push(`w${palavra++}`); rec.resultados([acc.join(' '), rnd() > 0.5]); }
        else if (op === 6) rec.fim();
        else if (op === 7) rec.erro(CODIGOS[Math.floor(rnd() * CODIGOS.length)]);
        else if (op === 8) vi.advanceTimersByTime(Math.floor(rnd() * 300));
        else if (op === 9) vi.advanceTimersByTime(Math.floor(rnd() * 3000));
        else vi.advanceTimersByTime(LIMITE_MS);
        const ws = soPalavras(r.textos[r.textos.length - 1] ?? '');
        expect(new Set(ws).size, `semente ${s} passo ${p}`).toBe(ws.length);
      }
      RecSim.falhasRestantes = 0; RecSim.falhaNoStart = null;
      for (let k = 0; k < 3; k++) { RecSim.ultima()?.fim(); vi.advanceTimersByTime(LIMITE_MS * 2); }
      expect(r.sessao.ativa(), `semente ${s}`).toBe(false);
      expect(vi.getTimerCount(), `semente ${s}`).toBe(0);
      expect(r.fins.length, `semente ${s}`).toBe(iniciadas);
      if (iniciadas > 0) expect(['pronto', 'erro'], `semente ${s}`).toContain(r.estados[r.estados.length - 1]);
      for (const f of r.fins) { const ws = soPalavras(f.texto); expect(new Set(ws).size, `semente ${s} fim`).toBe(ws.length); }
    }
  });
});

interface Opcoes { semente: number; passos: number; destruirNoMeio?: boolean; reentrante?: boolean; muitaEdicao?: boolean; repeteMuito?: boolean }

/** Controle completo: confere as invariantes a cada passo. Devolve estatísticas. */
function rodarControle({ semente, passos, destruirNoMeio = false, reentrante = false, muitaEdicao = false, repeteMuito = false }: Opcoes) {
  RecSim.reset(); vi.clearAllTimers();
  const rnd = sorteio(semente);
  let morto = false; let nPalavra = 0; let sessoes = 0; let explicitos = 0; let depoisDeMorto = 0;
  let fixo: string | null = null; let prefixo = ''; let usado = false;
  const entendidos: { t: string; naTela: string }[] = [];
  const c = criarControleFalar({
    obterConstrutor: () => RecSim as unknown as ConstrutorVoz,
    aoEntender: (t) => {
      if (morto) depoisDeMorto++;
      entendidos.push({ t, naTela: c.visao().texto });
      usado = true;
      if (reentrante && rnd() < 0.3) {                          // o formulário reagindo ("lançar outro", limpar, fechar)
        const acao = rnd();
        if (acao < 0.6) c.novoLancamento(); else if (acao < 0.9) c.limpar(); else { c.destruir(); morto = true; }
        fixo = null; prefixo = ''; usado = false;
      }
    },
    aoMudar: () => { if (morto) depoisDeMorto++; },
  });
  let acc: string[] = []; let vista = 0;
  for (let p = 0; p < passos && !morto; p++) {
    const rec = RecSim.ultima();
    if (RecSim.todas.length !== vista) { vista = RecSim.todas.length; acc = repeticao(acc, rnd, repeteMuito ? 0.9 : 0.4); }
    const total = muitaEdicao ? 13 : 15;
    const op = Math.floor(rnd() * total);
    const v0 = c.visao(); const ativa = ['pedindo', 'ouvindo', 'processando'].includes(v0.estado);
    let nome: string;
    if (op <= 1) { nome = 'ouvir'; if (!ativa) { sessoes++; fixo = null; prefixo = v0.texto; acc = []; vista = RecSim.todas.length + 1; } c.ouvir(); }
    else if (op === 2 || (muitaEdicao && op === 11)) { nome = 'digitar'; const valor = `${v0.texto} d${nPalavra++}`.trim(); c.digitar(valor); fixo = valor; prefixo = valor; }
    else if (op === 3) { nome = 'focar'; c.focar(); if (ativa) { fixo = null; prefixo = c.visao().texto; } }
    else if (op === 4) { nome = 'enter'; const tinha = v0.texto.trim() !== ''; if (tinha) explicitos++; c.enter(); if (ativa && tinha) fixo = c.visao().texto; }
    else if (op === 5) { nome = 'limpar'; c.limpar(); fixo = null; prefixo = ''; usado = false; }
    else if (op === 6) { nome = 'preencher'; if (v0.texto.trim()) explicitos++; c.preencher(); }
    else if (op === total - 1) {                                  // "Salvar e lançar outro" no formulário
      nome = 'novo'; c.novoLancamento();
      if (usado) { expect(c.visao().texto, `semente ${semente} passo ${p} novo apaga o já usado`).toBe(''); fixo = null; prefixo = ''; usado = false; }
      else expect(c.visao().texto, `semente ${semente} passo ${p} novo não apaga rascunho`).toBe(v0.texto);
    }
    else if (!rec) continue;
    else if (op === 7) { nome = 'abriu'; rec.abriu(); }
    else if (op === 8) { nome = 'falar'; acc.push(`w${nPalavra++}`); rec.resultados([acc.join(' '), rnd() > 0.5]); }
    else if (op === 9) { nome = 'fim'; rec.fim(); }
    else if (op === 10) { nome = 'erro'; rec.erro(CODIGOS[Math.floor(rnd() * CODIGOS.length)]); }
    else { nome = 'tempo'; vi.advanceTimersByTime(rnd() < 0.2 ? LIMITE_MS : Math.floor(rnd() * 2500)); }
    if (destruirNoMeio && rnd() < 0.04) { c.destruir(); morto = true; }
    if (morto) break;
    const v = c.visao(); const r = `semente ${semente} passo ${p} (${nome})`;
    // 1. o que a pessoa digitou nunca é perdido ou sobrescrito
    if (fixo !== null) expect(v.texto, `${r} fixo`).toBe(fixo);
    expect(v.texto.startsWith(prefixo), `${r} prefixo "${prefixo}" -> "${v.texto}"`).toBe(true);
    // 2. nenhuma palavra é duplicada (todas as palavras geradas são distintas)
    const ws = soPalavras(v.texto); expect(new Set(ws).size, `${r} duplicou: ${v.texto}`).toBe(ws.length);
    // 3b. aviso de erro coerente com o estado: nunca durante a escuta; "erro" sempre com mensagem
    if (['pedindo', 'ouvindo'].includes(v.estado)) expect(v.erro, `${r} erro durante a escuta`).toBeNull();
    if (v.estado === 'erro') expect(v.erro, `${r} estado erro sem mensagem`).not.toBeNull();
    // 3. aoEntender nunca recebe vazio e sempre recebe o que está na tela
    for (const e of entendidos) { expect(e.t.trim(), r).not.toBe(''); expect(e.t, r).toBe(e.naTela.trim()); }
  }
  if (!morto) {
    for (let k = 0; k < 3; k++) { RecSim.ultima()?.fim(); vi.advanceTimersByTime(LIMITE_MS * 2); }
    // 4. nunca fica preso em pedindo/ouvindo/processando
    expect(['pronto', 'erro'], `semente ${semente} estado final`).toContain(c.visao().estado);
    // 5. no máximo um aoEntender por ação explícita ou por sessão
    expect(entendidos.length, `semente ${semente} entender demais`).toBeLessThanOrEqual(explicitos + sessoes);
  }
  c.destruir(); vi.advanceTimersByTime(LIMITE_MS * 3);
  // 6. depois de destruir: sem timers, sem instâncias ligadas, sem callbacks
  expect(vi.getTimerCount(), `semente ${semente} timers`).toBe(0);
  expect(RecSim.todas.filter((x) => x.onend || x.onresult || x.onerror || x.onaudiostart), `semente ${semente} instâncias`).toEqual([]);
  expect(depoisDeMorto, `semente ${semente} callbacks depois de destruir`).toBe(0);
  return { entendidos: entendidos.length, instancias: RecSim.todas.length };
}

describe('controle: sequências aleatórias (6 invariantes)', () => {
  it('600 sementes × 50 passos', () => {
    let entendidos = 0; let instancias = 0;
    for (let s = 1; s <= 600; s++) { const r = rodarControle({ semente: s, passos: 50 }); entendidos += r.entendidos; instancias += r.instancias; }
    expect(entendidos).toBeGreaterThan(100); expect(instancias).toBeGreaterThan(1000);   // o sorteio de fato exercita o código
  });
  it('400 sementes com o Safari repetindo o final em 90% dos reinícios', () => {
    for (let s = 10000; s < 10400; s++) rodarControle({ semente: s, passos: 60, repeteMuito: true });
  });
  it('400 sementes com desmontar no meio e "lançar outro" dentro do aoEntender', () => {
    for (let s = 20000; s < 20400; s++) rodarControle({ semente: s, passos: 60, destruirNoMeio: true, reentrante: true });
  });
  it('500 sementes dominadas por digitar/tocar no campo/Enter', () => {
    for (let s = 50000; s < 50500; s++) rodarControle({ semente: s, passos: 60, muitaEdicao: true, destruirNoMeio: true, reentrante: true });
  });
  it('150 sementes × 200 passos', () => {
    for (let s = 30000; s < 30150; s++) rodarControle({ semente: s, passos: 200, repeteMuito: true, reentrante: true });
  });
});

describe('lançamentos em sequência ("Salvar e lançar outro"): nada do anterior contamina o próximo', () => {
  it('300 sementes × 4 lançamentos com edição, erros, repetição do Safari e eventos atrasados', () => {
    for (let s = 70000; s < 70300; s++) {
      RecSim.reset(); vi.clearAllTimers();
      const rnd = sorteio(s); let n = 0;
      const c = criarControleFalar({ obterConstrutor: () => RecSim as unknown as ConstrutorVoz, aoEntender: () => {}, aoMudar: () => {} });
      const antigas = new Set<string>();
      for (let lanc = 0; lanc < 4; lanc++) {
        const minhas: string[] = []; let acc: string[] = []; let vista = RecSim.todas.length;
        c.ouvir();
        for (let p = 0; p < 12; p++) {
          const rec = RecSim.ultima(); const op = Math.floor(rnd() * 8);
          if (RecSim.todas.length !== vista) { vista = RecSim.todas.length; acc = repeticao(acc, rnd, 0.5); }
          if (!rec) break;
          if (op <= 1) rec.abriu();
          else if (op <= 3) { const w = `w${n++}`; minhas.push(w); acc.push(w); rec.resultados([acc.join(' '), rnd() > 0.4]); }
          else if (op === 4) rec.fim();
          else if (op === 5) { c.focar(); }
          else if (op === 6) { const w = `d${n++}`; minhas.push(w); c.digitar(`${c.visao().texto} ${w}`.trim()); }
          else vi.advanceTimersByTime(Math.floor(rnd() * 2500));
          for (const w of soPalavras(c.visao().texto)) expect(antigas.has(w), `semente ${s} lançamento ${lanc}: palavra antiga ${w} em "${c.visao().texto}"`).toBe(false);
        }
        // termina a escuta, usa o texto (se houver) e o formulário começa outro lançamento
        for (let k = 0; k < 3; k++) { RecSim.ultima()?.fim(); vi.advanceTimersByTime(LIMITE_MS * 2); }
        c.preencher();
        for (const w of minhas) antigas.add(w);
        c.novoLancamento();
        expect(c.visao().texto, `semente ${s} lançamento ${lanc}: depois de lançar outro`).toBe('');
        expect(c.visao().erro, `semente ${s}`).toBeNull();
      }
      c.destruir(); expect(vi.getTimerCount(), `semente ${s}`).toBe(0);
    }
  });
});

describe('sessão com tempos extremos (0 ms, 1 ms, enormes)', () => {
  it('400 sementes: termina sempre, um aoFim por início, sem timers', () => {
    const tempos = [0, 1, 50, 2000, 100000];
    for (let s = 80000; s < 80400; s++) {
      RecSim.reset(); vi.clearAllTimers();
      const rnd = sorteio(s); const pick = () => tempos[Math.floor(rnd() * tempos.length)];
      const r = montar({ silencioMs: pick(), semFalaMs: pick(), limiteMs: pick() });
      let iniciadas = 0; let n = 0;
      for (let p = 0; p < 50; p++) {
        const op = Math.floor(rnd() * 9); const rec = RecSim.ultima();
        if (op === 0) { const estava = r.sessao.ativa(); r.sessao.iniciar(); if (!estava) iniciadas++; }
        else if (op === 1) r.sessao.parar();
        else if (!rec) continue;
        else if (op === 2) rec.abriu();
        else if (op === 3) rec.resultados([`w${n++}`, rnd() > 0.5]);
        else if (op === 4) rec.fim();
        else if (op === 5) rec.erro(CODIGOS[Math.floor(rnd() * CODIGOS.length)]);
        else vi.advanceTimersByTime(Math.floor(rnd() * 5000));
      }
      for (let k = 0; k < 3; k++) { RecSim.ultima()?.fim(); vi.advanceTimersByTime(300000); }
      expect(r.sessao.ativa(), `semente ${s}`).toBe(false);
      expect(vi.getTimerCount(), `semente ${s}`).toBe(0);
      expect(r.fins.length, `semente ${s}`).toBe(iniciadas);
    }
  });
});
