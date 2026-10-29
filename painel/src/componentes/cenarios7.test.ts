import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecSim } from './simuladorVoz';
import { LIMITE_MS, type ConstrutorVoz } from './sessaoVoz';
import { criarControleFalar, type ControleFalar } from './Falar.logica';

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

const CODIGOS = ['no-speech', 'aborted', 'network', 'not-allowed', 'service-not-allowed', 'audio-capture', 'x'];

interface Opcoes { semente: number; passos: number; destruirNoMeio?: boolean; reentrante?: boolean; repeteMuito?: boolean }

/** Roda uma sequência aleatória e confere as invariantes a cada passo. Devolve estatísticas. */
function rodar({ semente, passos, destruirNoMeio = false, reentrante = false, repeteMuito = false }: Opcoes) {
  RecSim.reset(); vi.clearAllTimers();
  const rnd = sorteio(semente);
  const rotulo = (p: number, op: string) => `semente ${semente} passo ${p} (${op})`;
  let destruido = false; let nPalavra = 0;
  let fixo: string | null = null; let prefixo = '';
  const entendidos: { t: string; naTela: string }[] = [];
  let mudancasDepoisDeDestruir = 0; let entenderDepoisDeDestruir = 0;
  let explicitos = 0; let sessoes = 0;
  const c: ControleFalar = criarControleFalar({
    obterConstrutor: () => RecSim as unknown as ConstrutorVoz,
    aoEntender: (t) => {
      if (destruido) entenderDepoisDeDestruir++;
      entendidos.push({ t, naTela: c.visao().texto });
      if (reentrante && rnd() < 0.3) { c.limpar(); fixo = null; prefixo = ''; } // o formulário reagindo ao aoEntender
    },
    aoMudar: () => { if (destruido) mudancasDepoisDeDestruir++; },
  });

  let acc: string[] = []; let ultimaAcc: string[] = []; let instVista = 0;

  for (let p = 0; p < passos; p++) {
    const rec = RecSim.ultima();
    // detecta instância nova: o Safari pode repetir o final do que já falou
    if (RecSim.todas.length !== instVista) {
      instVista = RecSim.todas.length;
      ultimaAcc = acc;
      acc = rnd() < (repeteMuito ? 0.9 : 0.4) ? ultimaAcc.slice(-1 - Math.floor(rnd() * 3)) : [];
    }
    const op = Math.floor(rnd() * 14);
    let nome = String(op);
    const v0 = c.visao();
    const ativa = v0.estado === 'pedindo' || v0.estado === 'ouvindo' || v0.estado === 'processando';
    if (op === 0 || op === 1) { // ouvir
      nome = 'ouvir';
      if (!ativa) { sessoes++; fixo = null; prefixo = c.visao().texto; acc = []; ultimaAcc = []; instVista = RecSim.todas.length + 1; }
      c.ouvir();
    } else if (op === 2) { // digitar (acrescenta uma palavra nova ao que está na tela)
      nome = 'digitar';
      const valor = `${c.visao().texto} d${nPalavra++}`.trim();
      c.digitar(valor); fixo = valor; prefixo = valor;
    } else if (op === 3) { nome = 'focar'; c.focar(); if (ativa) { fixo = null; prefixo = c.visao().texto; } }
    else if (op === 4) { nome = 'enter'; if (c.visao().texto.trim()) explicitos++; const tinha = c.visao().texto.trim() !== ''; c.enter(); if (ativa && tinha) fixo = c.visao().texto; }
    else if (op === 5) { nome = 'limpar'; c.limpar(); fixo = null; prefixo = ''; }
    else if (op === 6) { nome = 'preencher'; if (c.visao().texto.trim()) explicitos++; c.preencher(); }
    else if (!rec) continue;
    else if (op === 7) { nome = 'abriu'; rec.abriu(); }
    else if (op === 8) { // fala nova (palavra única), parcial ou final
      nome = 'falar'; acc.push(`w${nPalavra++}`);
      rec.resultados([acc.join(' '), rnd() > 0.5]);
    } else if (op === 9) { nome = 'fim'; rec.fim(); }
    else if (op === 10) { nome = 'erro'; rec.erro(CODIGOS[Math.floor(rnd() * CODIGOS.length)]); }
    else if (op === 11) { nome = 'tempo'; vi.advanceTimersByTime(Math.floor(rnd() * 2500)); }
    else if (op === 12) { nome = 'tempo-longo'; vi.advanceTimersByTime(LIMITE_MS); }
    else { nome = 'fim-qualquer'; RecSim.todas[Math.floor(rnd() * RecSim.todas.length)]?.fim(); }

    if (destruirNoMeio && !destruido && rnd() < 0.04) { c.destruir(); destruido = true; }
    const v = c.visao();
    const r = rotulo(p, nome);
    // 1. texto digitado nunca é perdido
    if (!destruido) {
      if (fixo !== null) expect(v.texto, `${r} fixo`).toBe(fixo);
      expect(v.texto.startsWith(prefixo), `${r} prefixo "${prefixo}" -> "${v.texto}"`).toBe(true);
    }
    // 2. nenhuma palavra do usuário duplicada (todas as palavras geradas são únicas)
    const palavras = v.texto.split(/\s+/).filter((x) => /^[wd]\d+$/.test(x));
    expect(new Set(palavras).size, `${r} duplicou: ${v.texto}`).toBe(palavras.length);
    // 3. aoEntender nunca com texto vazio, e sempre igual ao que está na tela naquele momento
    for (const e of entendidos) { expect(e.t.trim(), r).not.toBe(''); expect(e.t, r).toBe(e.naTela.trim()); }
  }

  // Assenta: o navegador responde ao stop e o tempo passa.
  if (!destruido) {
    for (let k = 0; k < 3; k++) { RecSim.ultima()?.fim(); vi.advanceTimersByTime(LIMITE_MS * 2); }
    const v = c.visao();
    // 4. nunca fica preso em ouvindo/pedindo/processando
    expect(['pronto', 'erro'], `semente ${semente} estado final`).toContain(v.estado);
    // 5. no máximo um aoEntender por ação explícita ou fim de sessão
    expect(entendidos.length, `semente ${semente} entender demais`).toBeLessThanOrEqual(explicitos + sessoes);
  }
  c.destruir(); destruido = true;
  vi.advanceTimersByTime(LIMITE_MS * 3);
  // 6. depois de destruir: nada de timers, nada de instâncias ligadas, nada de callbacks
  expect(vi.getTimerCount(), `semente ${semente} timers`).toBe(0);
  expect(RecSim.todas.filter((x) => x.onend || x.onresult || x.onerror || x.onaudiostart), `semente ${semente} instâncias`).toEqual([]);
  expect(entenderDepoisDeDestruir, `semente ${semente} entender após destruir`).toBe(0);
  return { entendidos: entendidos.length, sessoes, instancias: RecSim.todas.length, mudancasDepoisDeDestruir };
}

describe('Rodada 15: sequências aleatórias no controle (7 invariantes)', () => {
  it('C88 600 sementes × 50 passos', () => {
    let entendidos = 0; let instancias = 0;
    for (let s = 1; s <= 600; s++) { const r = rodar({ semente: s, passos: 50 }); entendidos += r.entendidos; instancias += r.instancias; }
    expect(entendidos).toBeGreaterThan(100); expect(instancias).toBeGreaterThan(1000);
  });
});

describe('Rodada 16: Safari repetindo resultados a cada reinício', () => {
  it('C89 400 sementes, repetição em 90% dos reinícios', () => {
    for (let s = 10000; s < 10400; s++) rodar({ semente: s, passos: 60, repeteMuito: true });
  });
});

describe('Rodada 17: desmontar no meio e formulário reagindo ao aoEntender', () => {
  it('C90 400 sementes com destruir aleatório e limpar dentro do aoEntender', () => {
    for (let s = 20000; s < 20400; s++) rodar({ semente: s, passos: 60, destruirNoMeio: true, reentrante: true });
  });
});

describe('Rodada 18: sequências longas', () => {
  it('C91 150 sementes × 200 passos', () => {
    for (let s = 30000; s < 30150; s++) rodar({ semente: s, passos: 200, repeteMuito: true, reentrante: true });
  });
});
