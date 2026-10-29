import type { Caso } from './voz.corpus';

// Rodadas 48 em diante. Mesmo formato: r(frase, valor em reais ou null).
const r = (frase: string, reais: number | null, extra: Caso['esperado'] = {}, tipo = 'rodada'): Caso =>
  ({ frase, tipo, esperado: { valor: reais === null ? null : Math.round(reais * 100), ...extra } });

// Rodada 48: ferramentas, EPI e miudezas, com tamanho, número do calçado e medidas ao lado do valor.
export const CASOS_ROD48: Caso[] = [
  r('Bota 42 120 reais', 120), r('Botina tamanho 41 99,90', 99.9), r('Luva tamanho 9 8 pares 64', 64), r('Capacete 3 unidades 75', 75),
  r('Camiseta G 10 unidades 280', 280), r('Calça 44 89 reais', 89), r('Disco de corte 4 1/2 5 unidades 45', 45),
  r('Broca 8 mm 3 peças 36', 36), r('Parafuso 6 x 80 caixa com 100 38 reais', 38), r('Bucha 8 pacote 22 reais', 22),
  r('Fita isolante 20 metros 7,50', 7.5), r('Trena 5 metros 29 reais', 29), r('Nível a laser 480 reais', 480), r('Furadeira 650 watts 389', 389),
  r('Serra circular 7 1/4 540 reais', 540), r('Martelo 25 mm 49 reais', 49), r('Alicate 8 polegadas 52 reais', 52),
  r('Chave de fenda 3/16 18 reais', 18), r('Escada 7 degraus 310 reais', 310), r('Carrinho de mão 65 litros 215 reais', 215),
  r('Pá 2 unidades 70 reais', 70), r('Enxada 38 reais', 38), r('Rastelo 41 reais', 41), r('Peneira 3 unidades 60 reais', 60),
  r('Balde 12 litros 14,90', 14.9), r('Mangueira 25 metros 98 reais', 98), r('Extensão elétrica 20 metros 79 reais', 79),
  r('Lanterna 3 pilhas 35 reais', 35), r('Cadeado 40 mm 28 reais', 28), r('Corrente 6 mm 3 metros 54 reais', 54),
  r('Óculos de proteção 6 unidades 72', 72), r('Protetor auricular 20 pares 58', 58), r('Máscara PFF2 10 unidades 45', 45),
  r('Cinto de segurança 2 unidades 330 reais', 330), r('Talabarte tipo Y 185 reais', 185), r('Colete refletivo 6 unidades 108', 108),
];
