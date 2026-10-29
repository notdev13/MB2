import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecSim, montar } from './simuladorVoz';
import { LIMITE_MS, NOVA_TENTATIVA_MS, SILENCIO_MS, unirSemRepetir, type ConstrutorVoz } from './sessaoVoz';
import { criarControleFalar, type Visao } from './Falar.logica';

beforeEach(() => { vi.useFakeTimers(); RecSim.reset(); });
afterEach(() => { vi.useRealTimers(); });

const ultimoTexto = (r: ReturnType<typeof montar>) => r.textos[r.textos.length - 1];

describe('Rodada 19: nova tentativa de start() em condições de borda', () => {
  function ate(falhas: number) {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['areia', true]);
    RecSim.falhasRestantes = falhas; RecSim.ultima().fim();
    return r;
  }
  it('C92 falha duas vezes e a terceira tentativa funciona', () => {
    const r = ate(2); vi.advanceTimersByTime(NOVA_TENTATIVA_MS * 2);
    expect(RecSim.ultima().iniciou).toBe(1); expect(r.fins).toEqual([]);
  });
  it('C93 falha três vezes: desiste, guarda o texto, sem erro', () => {
    const r = ate(3); vi.advanceTimersByTime(NOVA_TENTATIVA_MS * 3);
    expect(r.fins).toEqual([{ texto: 'areia', erro: null }]); expect(vi.getTimerCount()).toBe(0);
  });
  it('C94 silêncio vence durante a nova tentativa: fecha com o texto', () => {
    const r = ate(1); vi.advanceTimersByTime(NOVA_TENTATIVA_MS - 1); vi.advanceTimersByTime(SILENCIO_MS + 2000);
    expect(r.fins).toHaveLength(1); expect(r.fins[0].texto).toBe('areia'); expect(vi.getTimerCount()).toBe(0);
  });
  it('C95 limite total durante a nova tentativa', () => {
    const r = ate(2); vi.advanceTimersByTime(LIMITE_MS + 5000);
    expect(r.fins).toHaveLength(1); expect(vi.getTimerCount()).toBe(0);
  });
  it('C96 resultado repetido logo depois da nova tentativa não duplica', () => {
    const r = ate(1); vi.advanceTimersByTime(NOVA_TENTATIVA_MS);
    RecSim.ultima().abriu(); RecSim.ultima().resultados(['areia', true]);
    expect(ultimoTexto(r)).toBe('areia');
  });
});

describe('Rodada 20: casos estranhos de texto na junção', () => {
  it('C97 números com vírgula/ponto/R$ contam como o mesmo número', () => {
    expect(unirSemRepetir('paguei R$ 1,50', '1.50 de cimento')).toBe('paguei R$ 1,50 de cimento');
  });
  it('C98 acentos e cedilha', () => {
    expect(unirSemRepetir('Fundação', 'fundacao concluída')).toBe('Fundação concluída');
  });
  it('C99 só pontuação não casa (não come nada por engano)', () => {
    expect(unirSemRepetir('a -', '- b')).toBe('a - - b');
  });
  it('C100 vazio de um dos lados', () => {
    expect(unirSemRepetir('', 'a b')).toBe('a b');
    expect(unirSemRepetir('a b', '')).toBe('a b');
    expect(unirSemRepetir('', '')).toBe('');
  });
  it('C101 texto longo (500 palavras) é rápido e correto', () => {
    const a = Array.from({ length: 500 }, (_, i) => `p${i}`).join(' ');
    const t0 = Date.now();
    const r = unirSemRepetir(a, 'p498 p499 novo');
    expect(r.endsWith('p497 p498 p499 novo')).toBe(true); expect(r.split(' ').length).toBe(501);
    expect(Date.now() - t0).toBeLessThan(200);
  });
  it('C102 espaços, quebras de linha e tabs entre palavras', () => {
    expect(unirSemRepetir(' paguei\n360 ', '\t360   de cimento')).toBe('paguei 360 de cimento');
  });
  it('C103 sobreposição maior que o texto anterior inteiro', () => {
    expect(unirSemRepetir('360', 'paguei 360 de cimento')).toBe('360 de cimento'.length ? 'paguei 360 de cimento' : '');
  });
});

describe('Rodada 21: controle em ordens estranhas', () => {
  function criar(extra: { aoEntender?: (t: string) => void } = {}) {
    const visoes: Visao[] = []; const entendidos: string[] = [];
    const c = criarControleFalar({
      obterConstrutor: () => RecSim as unknown as ConstrutorVoz,
      aoEntender: (t) => { entendidos.push(t); extra.aoEntender?.(t); },
      aoMudar: (v) => visoes.push(v),
    });
    return { c, visoes, entendidos };
  }
  it('C104 digitar enquanto a permissão está aberta e o áudio abre depois: sessão já parou, texto intacto', () => {
    const { c, entendidos } = criar();
    c.ouvir(); c.digitar('paguei 360'); RecSim.ultima().soStart(); RecSim.ultima().soAudio();
    RecSim.ultima().resultados(['fantasma', true]); RecSim.ultima().fim();
    expect(c.visao().texto).toBe('paguei 360'); expect(entendidos).toEqual([]); expect(c.visao().estado).toBe('pronto');
  });
  it('C105 destruir de dentro do aoEntender (formulário fecha ao entender)', () => {
    const ref: { c?: ReturnType<typeof criar>['c'] } = {};
    const { c, visoes } = criar({ aoEntender: () => ref.c?.destruir() });
    ref.c = c;
    c.ouvir(); RecSim.ultima().abriu(); RecSim.ultima().resultados(['paguei', true]);
    c.ouvir(); RecSim.ultima().fim();
    const n = visoes.length; vi.advanceTimersByTime(LIMITE_MS * 2);
    c.ouvir(); c.digitar('x');
    expect(visoes.length).toBe(n); expect(vi.getTimerCount()).toBe(0);
  });
  it('C106 tocar no campo, depois de novo no microfone: nova sessão acrescenta e entende o total', () => {
    const { c, entendidos } = criar();
    c.ouvir(); RecSim.ultima().abriu(); RecSim.ultima().resultados(['paguei 360', false]);
    c.focar(); RecSim.ultima().fim();
    expect(entendidos).toEqual([]);
    c.ouvir(); RecSim.ultima().abriu(); RecSim.ultima().resultados(['no pix', true]);
    c.ouvir(); RecSim.ultima().fim();
    expect(c.visao().texto).toBe('paguei 360 no pix'); expect(entendidos).toEqual(['paguei 360 no pix']);
  });
  it('C107 Enter duas vezes durante a escuta entende duas vezes (ação explícita), sem entender extra no fim', () => {
    const { c, entendidos } = criar();
    c.ouvir(); RecSim.ultima().abriu(); RecSim.ultima().resultados(['a', false]);
    c.enter(); c.enter(); RecSim.ultima().fim();
    expect(entendidos).toEqual(['a', 'a']);
  });
  it('C108 limpar durante o processando: o final tardio não traz o texto de volta', () => {
    const { c } = criar();
    c.ouvir(); RecSim.ultima().abriu(); RecSim.ultima().resultados(['areia', false]);
    c.ouvir(); c.limpar();
    RecSim.ultima().resultados(['areia fina', true]); RecSim.ultima().fim();
    expect(c.visao().texto).toBe('');
  });
  it('C109 erro de rede no meio, com texto ao vivo: texto fica, aviso aparece, nada é entendido sozinho além do texto', () => {
    const { c, entendidos } = criar();
    c.ouvir(); RecSim.ultima().abriu(); RecSim.ultima().resultados(['paguei 360', true]);
    RecSim.ultima().erro('network'); RecSim.ultima().fim();
    expect(c.visao().texto).toBe('paguei 360'); expect(c.visao().erro).toMatch(/conexão/); expect(entendidos).toEqual(['paguei 360']);
  });
  it('C110 voz repetida pelo Safari + usuário digitando no meio: nada duplica nem se perde', () => {
    const { c } = criar();
    c.ouvir(); RecSim.ultima().abriu(); RecSim.ultima().resultados(['paguei 360', true]); RecSim.ultima().fim();
    RecSim.ultima().abriu(); RecSim.ultima().resultados(['paguei 360', true]);
    expect(c.visao().texto).toBe('paguei 360');
    c.digitar('paguei 360 (pix)'); RecSim.ultima().resultados(['paguei 360 de cimento', true]); RecSim.ultima().fim();
    expect(c.visao().texto).toBe('paguei 360 (pix)');
  });
});
