import type { Caso } from './voz.corpus';

// Rodadas 41 em diante. Mesmo formato: r(frase, valor em reais ou null).
const r = (frase: string, reais: number | null, extra: Caso['esperado'] = {}, tipo = 'rodada'): Caso =>
  ({ frase, tipo, esperado: { valor: reais === null ? null : Math.round(reais * 100), ...extra } });

// Rodada 41: variações da falha B1 do revisor (valor verdadeiro ao lado de andar, piso, cômodo, bloco e unidade).
export const CASOS_ROD41: Caso[] = [
  r('laje do segundo andar 480', 480), r('laje do terceiro andar 480 reais', 480), r('areia pro segundo piso 480', 480),
  r('pedreiro no bloco B apartamento 12 480', 480), r('quarto dois 480', 480), r('sala 3 e 4 piso 480', 480),
  r('cômodo 2 480', 480), r('480 reais cômodo 2', 480), r('R$ 480 andar 2', 480), r('R$ 480, 2º andar', 480),
  r('2º andar, 480 reais, pedreiro', 480), r('pedreiro 2º andar R$ 480', 480), r('térreo 480 reais', 480),
  r('apto 302 pintura 800', 800), r('bloco 3 apto 41 R$ 1.200', 1200), r('torre 2 R$ 3.400', 3400),
  r('480 sacos 2', null), r('480 caixas 12', null), r('480 dias 2', null), r('480 pessoas 5', null),
  r('R$ 480 sacos 2', 480), r('R$ 480 caixas 12', 480), r('480 reais sacos 2', 480), r('480 reais 2 sacos', 480),
  r('pedreiro 480 reais 2 dias', null), r('pedreiro 2 dias 480 reais', 480), r('pedreiro 2 dias 480', 480),
  r('pedreiro 480 2 dias', null), r('480 serviço do andar 2', 480), r('laje 2º pavimento R$ 12.000', 12000),
  r('banheiro 2 R$ 480', 480), r('banheiro 2, 480 reais', 480), r('2 banheiros, 1.480 reais', 1480),
  r('2 banheiros 1.480', 1480), r('3 quartos R$ 3.200', 3200), r('3 quartos 3.200', 3200), r('três quartos, 3 mil e duzentos', 3200),
  r('lote 7 quadra 3 R$ 90', 90), r('quadra 3 lote 7 areia 90', 90), r('quadra 3 lote 7 areia 190', 190),
];
