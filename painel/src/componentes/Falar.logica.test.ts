import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecSim } from './simuladorVoz';
import { SILENCIO_MS, type ConstrutorVoz } from './sessaoVoz';
import { criarControleFalar, textoInicial, transicao, type Acao, type EstadoTexto, type Visao } from './Falar.logica';

beforeEach(() => { vi.useFakeTimers(); RecSim.reset(); });
afterEach(() => { vi.useRealTimers(); });

function passo(e: EstadoTexto, ...acoes: Acao[]) {
  let estado = e; let ultimo = transicao(e, { t: 'preencher' });
  const entendidos: string[] = []; let paradas = 0;
  for (const a of acoes) {
    ultimo = transicao(estado, a); estado = ultimo.estado;
    if (ultimo.entender) entendidos.push(ultimo.entender);
    if (ultimo.parar) paradas++;
  }
  return { estado, entendidos, paradas };
}
const com = (texto: string): EstadoTexto => ({ ...textoInicial(), texto });

describe('Rodada 13: lógica pura do texto (digitado x ao vivo x base)', () => {
  it('L01 ouvir fixa a base com o texto que já existe', () => {
    const { estado } = passo(com('  paguei 10 '), { t: 'ouvir' });
    expect(estado.base).toBe('paguei 10');
  });
  it('L02 ao vivo acrescenta à base', () => {
    const { estado } = passo(com('paguei 10'), { t: 'ouvir' }, { t: 'vivo', falado: 'de cimento' });
    expect(estado.texto).toBe('paguei 10 de cimento');
  });
  it('L03 digitar durante a escuta para a sessão e o ao vivo seguinte não sobrescreve', () => {
    const r = passo(com(''), { t: 'ouvir' }, { t: 'vivo', falado: 'paguei' }, { t: 'digitar', valor: 'paguei 36', ativa: true }, { t: 'vivo', falado: 'paguei 360 de areia' });
    expect(r.paradas).toBe(1); expect(r.estado.texto).toBe('paguei 36');
  });
  it('L04 digitar durante o processando: o final tardio é ignorado, sem entender', () => {
    const r = passo(com(''), { t: 'ouvir' }, { t: 'vivo', falado: 'paguei' }, { t: 'digitar', valor: 'paguei, no pix', ativa: true }, { t: 'fim', falado: 'paguei 360' });
    expect(r.estado.texto).toBe('paguei, no pix'); expect(r.entendidos).toEqual([]);
  });
  it('L05 ouvir de novo acrescenta e não apaga', () => {
    const r = passo(com(''), { t: 'ouvir' }, { t: 'fim', falado: 'paguei 360' }, { t: 'ouvir' }, { t: 'vivo', falado: 'no pix' }, { t: 'fim', falado: 'no pix' });
    expect(r.estado.texto).toBe('paguei 360 no pix'); expect(r.entendidos).toEqual(['paguei 360', 'paguei 360 no pix']);
  });
  it('L06 limpar zera; resultado tardio depois de limpar não ressuscita o texto', () => {
    const r = passo(com('antigo'), { t: 'ouvir' }, { t: 'limpar', ativa: false }, { t: 'fim', falado: 'fantasma' });
    expect(r.estado.texto).toBe(''); expect(r.entendidos).toEqual([]);
  });
  it('L07 Enter durante a escuta: para, entende uma vez, e o fim não entende de novo', () => {
    const r = passo(com(''), { t: 'ouvir' }, { t: 'vivo', falado: 'paguei 360' }, { t: 'enter', ativa: true }, { t: 'fim', falado: 'paguei 360 no pix' });
    expect(r.paradas).toBe(1); expect(r.entendidos).toEqual(['paguei 360']); expect(r.estado.texto).toBe('paguei 360');
  });
  it('L08 tocar no campo durante a escuta: para, não entende, e um final tardio ainda entra no texto', () => {
    const r = passo(com(''), { t: 'ouvir' }, { t: 'vivo', falado: 'paguei' }, { t: 'focar', ativa: true }, { t: 'fim', falado: 'paguei 360' });
    expect(r.paradas).toBe(1); expect(r.entendidos).toEqual([]); expect(r.estado.texto).toBe('paguei 360');
  });
  it('L09 tocar no campo sem escuta não faz nada', () => {
    const r = passo(com('abc'), { t: 'focar', ativa: false });
    expect(r.paradas).toBe(0); expect(r.entendidos).toEqual([]); expect(r.estado.texto).toBe('abc');
  });
  it('L10 fim normal entende uma vez, com o texto completo', () => {
    const r = passo(com('x'), { t: 'ouvir' }, { t: 'vivo', falado: 'y' }, { t: 'fim', falado: 'y' });
    expect(r.entendidos).toEqual(['x y']);
  });
  it('L11 fim sem fala não entende nem apaga', () => {
    const r = passo(com('x'), { t: 'ouvir' }, { t: 'fim', falado: '' });
    expect(r.entendidos).toEqual([]); expect(r.estado.texto).toBe('x');
  });
  it('L12 Enter sem escuta entende o texto digitado; Enter vazio não faz nada', () => {
    expect(passo(com(' abc '), { t: 'enter', ativa: false }).entendidos).toEqual(['abc']);
    expect(passo(com('  '), { t: 'enter', ativa: false }).entendidos).toEqual([]);
  });
  it('L13 digitar sem escuta vira a nova base de uma próxima escuta', () => {
    const r = passo(com(''), { t: 'digitar', valor: 'paguei', ativa: false }, { t: 'ouvir' }, { t: 'vivo', falado: '360' });
    expect(r.estado.texto).toBe('paguei 360');
  });
  it('L14 botão "Preencher" entende o texto atual', () => {
    expect(passo(com('abc'), { t: 'preencher' }).entendidos).toEqual(['abc']);
  });
});

// ---- controle completo (reducer + sessão de voz + simulador) ----
function montarControle(construtor: ConstrutorVoz | null = RecSim as unknown as ConstrutorVoz) {
  const visoes: Visao[] = []; const entendidos: string[] = [];
  const c = criarControleFalar({
    obterConstrutor: () => construtor,
    aoEntender: (t) => entendidos.push(t),
    aoMudar: (v) => visoes.push(v),
  });
  return { c, visoes, entendidos };
}

describe('Rodada 14: controle com reconhecedor simulado', () => {
  it('K01 fluxo normal: fala, silêncio, fim → texto e um aoEntender', () => {
    const { c, visoes, entendidos } = montarControle();
    c.ouvir(); expect(c.visao().estado).toBe('pedindo');
    RecSim.ultima().abriu(); RecSim.ultima().resultados(['paguei 360', true]);
    vi.advanceTimersByTime(SILENCIO_MS); RecSim.ultima().fim();
    expect(c.visao()).toEqual({ texto: 'paguei 360', estado: 'pronto', erro: null });
    expect(entendidos).toEqual(['paguei 360']); expect(visoes.length).toBeGreaterThan(2);
  });
  it('K02 digitar durante a escuta: o digitado fica, a sessão para, nada é entendido', () => {
    const { c, entendidos } = montarControle();
    c.digitar('Obra Lote 39:'); c.ouvir(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['paguei', false]);
    expect(c.visao().texto).toBe('Obra Lote 39: paguei');
    c.digitar('Obra Lote 39: paguei 3');
    expect(RecSim.ultima().parou).toBe(1);
    RecSim.ultima().resultados(['paguei 360', true]); RecSim.ultima().fim();
    expect(c.visao().texto).toBe('Obra Lote 39: paguei 3'); expect(entendidos).toEqual([]);
    expect(c.visao().estado).toBe('pronto');
  });
  it('K03 digitar durante o "processando" e chegar final tardio', () => {
    const { c, entendidos } = montarControle();
    c.ouvir(); RecSim.ultima().abriu(); RecSim.ultima().resultados(['areia', false]);
    c.ouvir(); expect(c.visao().estado).toBe('processando');
    c.digitar('areia fina');
    RecSim.ultima().resultados(['areia lavada', true]); RecSim.ultima().fim();
    expect(c.visao().texto).toBe('areia fina'); expect(entendidos).toEqual([]);
  });
  it('K04 tocar no campo: para, mantém o que foi ouvido, não preenche o formulário', () => {
    const { c, entendidos } = montarControle();
    c.ouvir(); RecSim.ultima().abriu(); RecSim.ultima().resultados(['areia', false]);
    c.focar(); RecSim.ultima().fim();
    expect(c.visao().texto).toBe('areia'); expect(entendidos).toEqual([]); expect(c.visao().estado).toBe('pronto');
  });
  it('K05 Enter durante a escuta: aoEntender uma vez só, com o texto exibido', () => {
    const { c, entendidos } = montarControle();
    c.ouvir(); RecSim.ultima().abriu(); RecSim.ultima().resultados(['paguei 360', false]);
    c.enter(); expect(RecSim.ultima().parou).toBe(1);
    RecSim.ultima().resultados(['paguei 360 no pix', true]); RecSim.ultima().fim();
    expect(entendidos).toEqual(['paguei 360']); expect(c.visao().texto).toBe('paguei 360');
  });
  it('K06 ouvir de novo acrescenta ao texto', () => {
    const { c, entendidos } = montarControle();
    c.ouvir(); RecSim.ultima().abriu(); RecSim.ultima().resultados(['paguei 360', true]);
    c.ouvir(); RecSim.ultima().fim();
    c.ouvir(); RecSim.ultima().abriu(); RecSim.ultima().resultados(['no pix', true]);
    c.ouvir(); RecSim.ultima().fim();
    expect(c.visao().texto).toBe('paguei 360 no pix'); expect(entendidos).toEqual(['paguei 360', 'paguei 360 no pix']);
  });
  it('K07 limpar zera o texto e o erro', () => {
    const { c } = montarControle();
    c.ouvir(); RecSim.ultima().erro('network'); RecSim.ultima().fim();
    expect(c.visao().erro).toMatch(/conexão/);
    c.limpar(); expect(c.visao()).toEqual({ texto: '', estado: 'pronto', erro: null });
  });
  it('K08 toque duplo: uma única instância; o segundo toque cancela sem erro', () => {
    const { c } = montarControle();
    c.ouvir(); c.ouvir(); RecSim.ultima().fim();
    expect(RecSim.todas).toHaveLength(1); expect(c.visao().erro).toBeNull(); expect(c.visao().estado).toBe('pronto');
  });
  it('K09 destruir durante a escuta: nenhuma atualização depois, nenhum timer', () => {
    const { c, visoes, entendidos } = montarControle();
    c.ouvir(); RecSim.ultima().abriu(); RecSim.ultima().resultados(['a', true]);
    const n = visoes.length; c.destruir();
    RecSim.ultima().resultados(['b', true]); RecSim.ultima().fim(); vi.advanceTimersByTime(60000);
    c.digitar('x'); c.ouvir(); c.enter(); c.focar(); c.limpar();
    expect(visoes.length).toBe(n); expect(entendidos).toEqual([]); expect(vi.getTimerCount()).toBe(0);
  });
  it('K10 erro com texto digitado: mostra a mensagem e mantém o texto', () => {
    const { c } = montarControle();
    c.digitar('paguei 360'); c.ouvir(); RecSim.ultima().erro('not-allowed'); RecSim.ultima().fim();
    expect(c.visao().erro).toMatch(/teclado/); expect(c.visao().texto).toBe('paguei 360'); expect(c.visao().estado).toBe('erro');
  });
  it('K11 sem reconhecimento de voz no navegador: ouvir não faz nada', () => {
    const { c, visoes } = montarControle(null);
    c.ouvir(); expect(visoes).toEqual([]); expect(c.visao().estado).toBe('pronto');
  });
  it('K12 após erro, ouvir de novo limpa o aviso e reinicia', () => {
    const { c } = montarControle();
    c.ouvir(); RecSim.ultima().erro('network'); RecSim.ultima().fim();
    c.ouvir(); expect(c.visao().erro).toBeNull(); expect(RecSim.todas).toHaveLength(2);
  });
  it('K13 Enter sem escuta e botão preencher entendem o texto digitado', () => {
    const { c, entendidos } = montarControle();
    c.digitar('abc'); c.enter(); c.preencher();
    expect(entendidos).toEqual(['abc', 'abc']);
  });
  it('K14 Enter durante o "pedindo" (permissão aberta) cancela a escuta e entende só o digitado', () => {
    const { c, entendidos } = montarControle();
    c.digitar('abc'); c.ouvir(); c.enter(); RecSim.ultima().fim();
    expect(entendidos).toEqual(['abc']); expect(c.visao().estado).toBe('pronto'); expect(c.visao().erro).toBeNull();
  });
});

describe('Rodada 25: limpar para a escuta; novo lançamento começa do zero', () => {
  it('L15 limpar durante a escuta pede para parar', () => {
    expect(passo(com('x'), { t: 'ouvir' }, { t: 'limpar', ativa: true }).paradas).toBe(1);
    expect(passo(com('x'), { t: 'limpar', ativa: false }).paradas).toBe(0);
  });
  it('L16 novo lançamento limpa só o que já foi passado ao formulário', () => {
    const entendido = passo(com(''), { t: 'ouvir' }, { t: 'vivo', falado: 'paguei 360' }, { t: 'fim', falado: 'paguei 360' });
    expect(passo(entendido.estado, { t: 'novo', ativa: false }).estado.texto).toBe('');
    // digitado e ainda não usado: um novo lançamento vindo de fora não apaga
    expect(passo(com('rascunho'), { t: 'novo', ativa: false }).estado.texto).toBe('rascunho');
    const preenchido = passo(com('abc'), { t: 'preencher' });
    expect(passo(preenchido.estado, { t: 'novo', ativa: false }).estado.texto).toBe('');
  });
  it('L17 depois de um novo lançamento, ouvir de novo NÃO acrescenta ao texto antigo', () => {
    const r = passo(com(''), { t: 'ouvir' }, { t: 'fim', falado: 'paguei 360 de cimento' }, { t: 'novo', ativa: false },
      { t: 'ouvir' }, { t: 'vivo', falado: 'paguei 50 de areia' }, { t: 'fim', falado: 'paguei 50 de areia' });
    expect(r.estado.texto).toBe('paguei 50 de areia'); expect(r.entendidos).toEqual(['paguei 360 de cimento', 'paguei 50 de areia']);
  });
  it('L18 texto já usado continua "usado" depois de uma escuta em que a pessoa tocou no campo', () => {
    const r = passo(com('paguei 360'), { t: 'preencher' }, { t: 'ouvir' }, { t: 'focar', ativa: true }, { t: 'fim', falado: 'no pix' },
      { t: 'novo', ativa: false });
    expect(r.estado.texto).toBe('');
  });
  it('K25 o aviso de erro do lançamento anterior não passa para o próximo, mesmo sem texto usado', () => {
    const { c } = montarControle();
    c.ouvir(); RecSim.ultima().abriu(); vi.advanceTimersByTime(7000); RecSim.ultima().fim();
    expect(c.visao().estado).toBe('erro');
    c.novoLancamento();
    expect(c.visao()).toEqual({ texto: '', estado: 'pronto', erro: null });
  });
  it('K26 três lançamentos seguidos pela voz: cada um começa limpo e entende só a própria fala', () => {
    const { c, entendidos } = montarControle();
    for (const fala of ['paguei 360 de cimento', 'paguei 360 de areia', 'paguei 50 de brita']) {
      c.ouvir(); RecSim.ultima().abriu(); RecSim.ultima().resultados([fala, true]); c.ouvir(); RecSim.ultima().fim();
      expect(c.visao().texto).toBe(fala); c.novoLancamento(); expect(c.visao().texto).toBe('');
    }
    expect(entendidos).toEqual(['paguei 360 de cimento', 'paguei 360 de areia', 'paguei 50 de brita']);
  });
  it('K27 lançar outro com a escuta aberta sobre texto não usado: a escuta continua e o rascunho fica', () => {
    const { c } = montarControle();
    c.digitar('rascunho'); c.ouvir(); RecSim.ultima().abriu(); RecSim.ultima().resultados(['mais um', false]);
    c.novoLancamento();
    expect(RecSim.ultima().parou).toBe(0); expect(c.visao().texto).toBe('rascunho mais um');
  });
  it('K15 controle: limpar durante a escuta para a sessão e o final tardio não volta', () => {
    const { c } = montarControle();
    c.ouvir(); RecSim.ultima().abriu(); RecSim.ultima().resultados(['areia', false]);
    c.limpar(); expect(RecSim.ultima().parou).toBe(1);
    RecSim.ultima().resultados(['areia fina', true]); RecSim.ultima().fim();
    expect(c.visao()).toEqual({ texto: '', estado: 'pronto', erro: null });
  });
  it('K16 "Salvar e lançar outro": o texto já usado some, o próximo lançamento começa limpo', () => {
    const { c, entendidos } = montarControle();
    c.ouvir(); RecSim.ultima().abriu(); RecSim.ultima().resultados(['paguei 360 de cimento', true]);
    c.ouvir(); RecSim.ultima().fim();
    c.novoLancamento();
    expect(c.visao().texto).toBe('');
    c.ouvir(); RecSim.ultima().abriu(); RecSim.ultima().resultados(['paguei 50 de areia', true]);
    c.ouvir(); RecSim.ultima().fim();
    expect(c.visao().texto).toBe('paguei 50 de areia'); expect(entendidos.at(-1)).toBe('paguei 50 de areia');
  });
  it('K17 novo lançamento durante a escuta interrompe e limpa; rascunho não usado é mantido', () => {
    const a = montarControle();
    a.c.digitar('paguei 360'); a.c.preencher(); a.c.ouvir(); RecSim.ultima().abriu(); RecSim.ultima().resultados(['no pix', false]);
    a.c.novoLancamento(); expect(RecSim.ultima().parou).toBe(1); expect(a.c.visao().texto).toBe('');
    RecSim.reset();
    const b = montarControle(); b.c.digitar('rascunho'); b.c.novoLancamento();
    expect(b.c.visao().texto).toBe('rascunho');
  });
});

describe('Rodada 26: controle em ordens estranhas', () => {
  it('K18 digitar enquanto a permissão está aberta e o áudio abre depois: sessão já parou, texto intacto', () => {
    const { c, entendidos } = montarControle();
    c.ouvir(); c.digitar('paguei 360'); RecSim.ultima().soStart(); RecSim.ultima().soAudio();
    RecSim.ultima().resultados(['fantasma', true]); RecSim.ultima().fim();
    expect(c.visao().texto).toBe('paguei 360'); expect(entendidos).toEqual([]); expect(c.visao().estado).toBe('pronto');
  });
  it('K19 destruir de dentro do aoEntender (formulário reage e fecha): nada mais acontece', () => {
    const visoes: Visao[] = []; const ref: { c?: ReturnType<typeof criarControleFalar> } = {};
    const c = criarControleFalar({
      obterConstrutor: () => RecSim as unknown as ConstrutorVoz,
      aoEntender: () => ref.c?.destruir(), aoMudar: (v) => visoes.push(v),
    });
    ref.c = c;
    c.ouvir(); RecSim.ultima().abriu(); RecSim.ultima().resultados(['paguei', true]); c.ouvir(); RecSim.ultima().fim();
    const n = visoes.length; vi.advanceTimersByTime(60000); c.ouvir(); c.digitar('x');
    expect(visoes.length).toBe(n); expect(vi.getTimerCount()).toBe(0);
  });
  it('K20 tocar no campo e depois no microfone: nova sessão acrescenta e entende o total', () => {
    const { c, entendidos } = montarControle();
    c.ouvir(); RecSim.ultima().abriu(); RecSim.ultima().resultados(['paguei 360', false]);
    c.focar(); RecSim.ultima().fim(); expect(entendidos).toEqual([]);
    c.ouvir(); RecSim.ultima().abriu(); RecSim.ultima().resultados(['no pix', true]); c.ouvir(); RecSim.ultima().fim();
    expect(c.visao().texto).toBe('paguei 360 no pix'); expect(entendidos).toEqual(['paguei 360 no pix']);
  });
  it('K21 Enter duas vezes durante a escuta entende duas vezes (ação explícita) e nada a mais no fim', () => {
    const { c, entendidos } = montarControle();
    c.ouvir(); RecSim.ultima().abriu(); RecSim.ultima().resultados(['a', false]); c.enter(); c.enter(); RecSim.ultima().fim();
    expect(entendidos).toEqual(['a', 'a']);
  });
  it('K22 erro de rede com texto ao vivo: texto fica, aviso aparece, o texto é entendido uma vez', () => {
    const { c, entendidos } = montarControle();
    c.ouvir(); RecSim.ultima().abriu(); RecSim.ultima().resultados(['paguei 360', true]); RecSim.ultima().erro('network'); RecSim.ultima().fim();
    expect(c.visao().texto).toBe('paguei 360'); expect(c.visao().erro).toMatch(/conexão/); expect(entendidos).toEqual(['paguei 360']);
  });
  it('K23 repetição longa do Safari + o usuário digitando no meio: nada duplica e o digitado fica', () => {
    const { c } = montarControle();
    c.ouvir(); RecSim.ultima().abriu(); RecSim.ultima().resultados(['paguei 360 de cimento', true]); RecSim.ultima().fim();
    RecSim.ultima().abriu(); RecSim.ultima().resultados(['paguei 360 de cimento', true]);
    expect(c.visao().texto).toBe('paguei 360 de cimento');
    c.digitar('paguei 360 de cimento (pix)'); RecSim.ultima().resultados(['paguei 360 de cimento no lote 39', true]); RecSim.ultima().fim();
    expect(c.visao().texto).toBe('paguei 360 de cimento (pix)');
  });
  it('K24 dois valores iguais legítimos falados com um reinício entre eles continuam os dois', () => {
    const { c, entendidos } = montarControle();
    c.ouvir(); RecSim.ultima().abriu(); RecSim.ultima().resultados(['paguei 360 de cimento', true]); RecSim.ultima().fim();
    RecSim.ultima().abriu(); RecSim.ultima().resultados(['360 de areia', true]); c.ouvir(); RecSim.ultima().fim();
    expect(c.visao().texto).toBe('paguei 360 de cimento 360 de areia'); expect(entendidos).toEqual(['paguei 360 de cimento 360 de areia']);
  });
});

function sorteio(semente: number) {
  let a = semente;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('redutor do texto: ações aleatórias (2000 sementes)', () => {
  it('digitado nunca muda sozinho, entender nunca vazio, parar só quando há escuta', () => {
    for (let s = 1; s <= 2000; s++) {
      const rnd = sorteio(s); let e = textoInicial(); let ativa = false; let digitado: string | null = null; let n = 0;
      for (let p = 0; p < 40; p++) {
        const op = Math.floor(rnd() * 9);
        const a: Acao = op === 0 ? { t: 'ouvir' }
          : op === 1 ? { t: 'vivo', falado: `w${n++}` } : op === 2 ? { t: 'fim', falado: rnd() < 0.2 ? '' : `w${n++}` }
          : op === 3 ? { t: 'digitar', valor: `${e.texto} d${n++}`.trim(), ativa }
          : op === 4 ? { t: 'focar', ativa } : op === 5 ? { t: 'enter', ativa } : op === 6 ? { t: 'preencher' }
          : op === 7 ? { t: 'limpar', ativa } : { t: 'novo', ativa };
        const antes = e;
        const r = transicao(e, a); e = r.estado;
        if (a.t === 'ouvir') ativa = true;
        if (a.t === 'fim') ativa = false;
        const rotulo = `semente ${s} passo ${p} ${a.t}`;
        if (a.t === 'digitar') digitado = a.valor;
        if (a.t === 'limpar' || a.t === 'novo' || a.t === 'ouvir') digitado = a.t === 'ouvir' ? null : (a.t === 'novo' && !antes.entendido ? digitado : null);
        // 1. o digitado só muda por ação da pessoa (digitar/limpar/lançar outro) ou ao acrescentar fala depois de "ouvir"
        if (digitado !== null && ['vivo', 'fim', 'focar', 'enter', 'preencher'].includes(a.t) && e.ultimo === null) expect(e.texto, rotulo).toBe(digitado);
        // 2. o texto digitado e o ao vivo nunca se misturam por engano: ao vivo só vale com `ultimo` igual ao texto
        if ((a.t === 'vivo' || a.t === 'fim') && (antes.ultimo === null || antes.texto !== antes.ultimo)) expect(e.texto, rotulo).toBe(antes.texto);
        // 3. entender nunca vazio; parar só quando a ação veio com escuta ativa
        if (r.entender !== null) expect(r.entender.trim(), rotulo).not.toBe('');
        if (r.parar) expect(['digitar', 'focar', 'enter', 'limpar', 'novo'], rotulo).toContain(a.t);
        if (r.parar && a.t !== 'novo') expect((a as { ativa: boolean }).ativa, rotulo).toBe(true);
        if (a.t === 'vivo' || a.t === 'preencher' || a.t === 'ouvir') expect(r.parar, rotulo).toBe(false);
      }
    }
  });
});
