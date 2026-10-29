import type { Caso } from './voz.corpus';

// Rodadas 47 em diante. Mesmo formato: r(frase, valor em reais ou null).
const r = (frase: string, reais: number | null, extra: Caso['esperado'] = {}, tipo = 'rodada'): Caso =>
  ({ frase, tipo, esperado: { valor: reais === null ? null : Math.round(reais * 100), ...extra } });

// Rodada 47: energia solar, aço, forma e solda, rural e iluminação, com unidades de medida pouco comuns ao lado do valor.
export const CASOS_ROD47: Caso[] = [
  r('Kit solar 5 kwp 18.500 reais', 18500), r('Inversor 5 kva 4.200', 4200), r('Placa solar 550 watts 8 unidades 6.400', 6400),
  r('Concreto 30 mpa 6 m³ 4.500', 4500), r('Aço CA-50 10 milímetros 600 kgf 4.100', 4100), r('Perfil metálico 6 metros 3 peças 780', 780),
  r('Solda 7018 2 kg 98 reais', 98), r('Eletrodo 2,5 mm 5 kg 140', 140),
  r('Forma de madeira 80 m² 3.200', 3200), r('Escora metálica 40 unidades 1.600', 1600), r('Pregos 18 por 27 2 kg 36', 36),
  r('Lâmpada 800 lumens 6 unidades 90', 90), r('Refletor 150 watts 4 peças 380', 380), r('Fita LED 3000 kelvin 10 metros 210 reais', 210),
  r('Sensor de presença 180 graus 2 unidades 130', 130), r('Bomba de 1 cv 1.150', 1150), r('Motor de 2 hp 1.890 reais', 1890),
  r('Compressor 8 bar 50 litros 2.350', 2350), r('Mangueira 3/8 20 metros 190', 190), r('Terreno de 2 hectares 180 mil', 180000),
  r('Cerca de 400 metros 3 fios 5.600', 5600), r('Mourão 100 unidades 3.500', 3500), r('Arame farpado 500 metros 480 reais', 480),
  r('Poço artesiano 80 metros 16.000', 16000), r('Caixa d\'água 5 mil litros 3.900', 3900), r('Cisterna 10 mil litros 7.800 reais', 7800),
  r('Tubo de 6 polegadas 12 metros 1.140', 1140), r('Cano PVC DN 100 6 metros 210', 210), r('Registro de 2 polegadas 145 reais', 145),
  r('Isolamento acústico 55 decibéis 2.800', 2800), r('Piso vinílico 2 mm 35 m² 3.150 reais', 3150), r('Janela 4 folhas 2,00 por 1,20, 1.980', 1980),
  r('Vidro temperado 8 mm 6 m² 2.700', 2700), r('Película 3 rolos 450', 450), r('Calha 30 metros 5 mm 840', 840),
];
