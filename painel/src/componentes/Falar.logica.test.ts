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
    const r = passo(com('antigo'), { t: 'ouvir' }, { t: 'limpar' }, { t: 'fim', falado: 'fantasma' });
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
