import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecSim, montar } from './simuladorVoz';
import { PEDINDO_MS, SEM_FALA_MS, SILENCIO_MS } from './sessaoVoz';

beforeEach(() => { vi.useFakeTimers(); RecSim.reset(); });
afterEach(() => { vi.useRealTimers(); });

const ultimoTexto = (r: ReturnType<typeof montar>) => r.textos[r.textos.length - 1];
const ultimoEstado = (r: ReturnType<typeof montar>) => r.estados[r.estados.length - 1];

// Regra documentada (B2): ao juntar instâncias que o Safari reiniciou, o começo do trecho novo que
// repete o final do que já foi entendido é descartado (ignorando maiúsculas, acentos e pontuação).
// Isso vale também para números: "360" no fim de uma instância e "360" no começo da seguinte contam
// como a mesma fala repetida pelo Safari. Dentro de uma mesma instância nada é descartado.
describe('Rodada 10: Safari repete o resultado anterior ao reiniciar (B2)', () => {
  function duasInstancias(primeira: string, segunda: string) {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados([primeira, true]); RecSim.ultima().fim();
    RecSim.ultima().abriu(); RecSim.ultima().resultados([segunda, true]);
    return r;
  }
  it('C69 repetição completa não duplica', () => {
    expect(ultimoTexto(duasInstancias('paguei 360', 'paguei 360'))).toBe('paguei 360');
  });
  it('C70 repetição completa e continuação', () => {
    expect(ultimoTexto(duasInstancias('paguei 360', 'paguei 360 de cimento'))).toBe('paguei 360 de cimento');
  });
  it('C71 repetição parcial (só o final)', () => {
    expect(ultimoTexto(duasInstancias('paguei 360 de', '360 de cimento'))).toBe('paguei 360 de cimento');
  });
  it('C72 ignora maiúsculas, acentos e pontuação, mantém o texto original', () => {
    expect(ultimoTexto(duasInstancias('Pagão 360,', 'pagao 360 no pix'))).toBe('Pagão 360, no pix');
  });
  it('C73 número repetido na divisa vira um só (na dúvida, não duplica)', () => {
    expect(ultimoTexto(duasInstancias('cimento 360', '360'))).toBe('cimento 360');
  });
  it('C74 dentro de uma única instância a repetição é preservada', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['360 360', true]);
    expect(ultimoTexto(r)).toBe('360 360');
  });
  it('C75 sem sobreposição, junta normalmente', () => {
    expect(ultimoTexto(duasInstancias('paguei', 'cimento'))).toBe('paguei cimento');
  });
  it('C76 resultado final do fim da sessão também sai sem duplicar', () => {
    const r = duasInstancias('paguei 360', 'paguei 360'); r.sessao.parar(); RecSim.ultima().fim();
    expect(r.fins[0].texto).toBe('paguei 360');
  });
  it('C77 três instâncias repetindo em cadeia', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['a b', true]); RecSim.ultima().fim(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['a b c', true]); RecSim.ultima().fim(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['b c d', true]);
    expect(ultimoTexto(r)).toBe('a b c d');
  });
  it('C78 parcial que muda na nova instância não duplica a cada atualização', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['paguei 360', true]); RecSim.ultima().fim(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['paguei 360', false]);
    RecSim.ultima().resultados(['paguei 360 de', false]);
    RecSim.ultima().resultados(['paguei 360 de cimento', true]);
    expect(ultimoTexto(r)).toBe('paguei 360 de cimento');
  });
});

describe('Rodada 11: start() logo após onend falha no iOS (I3)', () => {
  it('C79 falha uma vez, tenta de novo em ~100ms e segue', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['areia', true]);
    RecSim.falhasRestantes = 1; RecSim.ultima().fim();
    expect(r.fins).toEqual([]);
    vi.advanceTimersByTime(100);
    expect(RecSim.ultima().iniciou).toBe(1); expect(r.fins).toEqual([]);
    RecSim.ultima().abriu(); RecSim.ultima().resultados(['no pix', true]);
    expect(ultimoTexto(r)).toBe('areia no pix');
  });
  it('C80 falha sempre, mas já há texto: guarda o texto e NÃO mostra erro', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['areia', true]);
    RecSim.falhaNoStart = 'x'; RecSim.ultima().fim();
    vi.advanceTimersByTime(1000);
    expect(r.fins).toEqual([{ texto: 'areia', erro: null }]);
    expect(ultimoEstado(r)).toBe('pronto'); expect(vi.getTimerCount()).toBe(0);
  });
  it('C81 falha sempre e nunca houve fala: erro de início', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.falhaNoStart = 'x'; RecSim.ultima().fim();
    vi.advanceTimersByTime(1000);
    expect(r.fins).toEqual([{ texto: '', erro: 'start' }]); expect(ultimoEstado(r)).toBe('erro');
  });
  it('C82 desmontar durante a nova tentativa não deixa timer', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['areia', true]);
    RecSim.falhaNoStart = 'x'; RecSim.ultima().fim(); r.sessao.destruir();
    vi.advanceTimersByTime(1000);
    expect(r.fins).toEqual([]); expect(vi.getTimerCount()).toBe(0);
  });
  it('C83 parar durante a nova tentativa fecha com o texto, sem erro', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['areia', true]);
    RecSim.falhaNoStart = 'x'; RecSim.ultima().fim(); r.sessao.parar();
    vi.advanceTimersByTime(3000);
    expect(r.fins).toEqual([{ texto: 'areia', erro: null }]); expect(vi.getTimerCount()).toBe(0);
  });
});

describe('Rodada 12: relógio de silêncio só depois do áudio (I4)', () => {
  it('C84 só onstart (permissão ainda aberta): não arma silêncio e continua "pedindo"', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().soStart();
    vi.advanceTimersByTime(SEM_FALA_MS + 1000);
    expect(RecSim.ultima().parou).toBe(0); expect(ultimoEstado(r)).toBe('pedindo');
  });
  it('C85 só onstart: continua valendo o limite de 20s da permissão', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().soStart();
    vi.advanceTimersByTime(PEDINDO_MS);
    expect(r.fins).toEqual([{ texto: '', erro: 'start' }]);
  });
  it('C86 onaudiostart arma o silêncio e mostra "ouvindo"', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().soStart(); RecSim.ultima().soAudio();
    expect(ultimoEstado(r)).toBe('ouvindo');
    vi.advanceTimersByTime(SEM_FALA_MS);
    expect(RecSim.ultima().parou).toBe(1);
  });
  it('C87 primeiro resultado sem nenhum evento de áudio também arma', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().resultados(['areia', false]);
    vi.advanceTimersByTime(SILENCIO_MS);
    expect(RecSim.ultima().parou).toBe(1);
  });
});
