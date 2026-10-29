import type { Caso } from './voz.corpus';

// Rodada 57 em diante. Mesmo formato: r(frase, valor em reais ou null).
const r = (frase: string, reais: number | null, extra: Caso['esperado'] = {}, tipo = 'rodada'): Caso =>
  ({ frase, tipo, esperado: { valor: reais === null ? null : Math.round(reais * 100), ...extra } });

// Rodada 57: valores pequenos ao lado de rótulos (mão de obra, andar, CREA, medidas) e frases em estilo corrido.
export const CASOS_ROD57: Caso[] = [
  r('mão de obra 95', 95), r('mão de obra do eletricista 130 hoje', 130, { data: '2026-10-28' }), r('areia pro 2º andar 18', 18),
  r('laje do segundo andar 47', 47), r('Anuidade do CREA 1150', 1150), r('brita 1 por 95', 95), r('pedreiro 480 andar 2', 480),
  r('Calça 44 89 reais', 89), r('Bota 42 120 reais', 120), r('cozinha 18', null), r('banheiro 95 reais', 95),
  r('Mourão 100 unidades 18', null), r('última parcela 95', null), r('deu 95 redondos', null),
  r('Foi 52 reais de gasolina', 52), r('gasolina da roçadeira 47', 47), r('lixa 5 folhas 18', 18), r('fita crepe 3 rolos 27', 27),
  r('Pagamos 7.400 pro pessoal da fundação', 7400), r('Almoço da equipe 52', 52), r('Água mineral 2 garrafões 18', 18),
  r('luvas 6 pares 54', 54), r('tinta suvinil 18 litros 640', 640), r('o pedreiro levou 275 hoje', 275, { data: '2026-10-28' }),
  r('anota aí um pix de 130 pro seu João', 130, { pagamento: 'pix' }), r('dobradiça 4 peças 28', 28),
  r('Tomada 10 A 12', null), r('fiz um pix de duas mil e oitocentas pro marceneiro', 2800, { pagamento: 'pix' }),
];
