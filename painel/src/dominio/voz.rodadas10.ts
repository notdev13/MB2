import type { Caso } from './voz.corpus';

// Rodadas 46 em diante. Mesmo formato: r(frase, valor em reais ou null).
const r = (frase: string, reais: number | null, extra: Caso['esperado'] = {}, tipo = 'rodada'): Caso =>
  ({ frase, tipo, esperado: { valor: reais === null ? null : Math.round(reais * 100), ...extra } });

// Rodada 46: reforma de apartamento, piscina, paisagismo e elétrica residencial (vocabulário que nenhum conjunto anterior tinha).
export const CASOS_ROD46: Caso[] = [
  r('Demolição da parede da sala, 1.800 reais', 1800), r('Quebra do piso da cozinha 950', 950), r('Impermeabilização da laje 3.400 reais', 3400),
  r('Contrapiso 40 m² 2.200', 2200), r('Porcelanato 60 por 60 retificado, 45 m², 5.850', 5850), r('Rejunte e argamassa colante 312 reais', 312),
  r('Rodapé de 7 cm, 30 metros, 480', 480), r('Forro de gesso 28 m² 2.520', 2520), r('Pintura do apartamento 62, 4.900 reais', 4900),
  r('Bancada de granito 2,40 por 0,60, 1.350 reais', 1350), r('Cuba de inox e torneira 590', 590), r('Box do banheiro 1.120', 1120),
  r('Escavação da piscina 8 por 4, 6.500 reais', 6500), r('Piscina de fibra 7 metros 18.900', 18900), r('Casa de máquinas da piscina 2.350', 2350),
  r('Filtro e motobomba 1.480 reais', 1480), r('Cloro e algicida 3 galões 260', 260), r('Grama esmeralda 50 m² 600 reais', 600),
  r('Mudas 12 palmeiras 1.440', 1440), r('Irrigação automática 2 setores 1.900', 1900), r('Poda das árvores 350 reais', 350),
  r('Quadro de distribuição 24 disjuntores 1.260', 1260), r('Cabo de 6 mm 100 metros 780', 780), r('Eletroduto 3/4 20 barras 190', 190),
  r('Luminárias 14 unidades 1.050 reais', 1050), r('Interfone 2 pontos 480', 480), r('Câmeras 4 unidades com gravador 1.690', 1690),
  r('Instalação do ar-condicionado 9.000 btus 650 reais', 650), r('Ar-condicionado 12 mil btus 2.790', 2790), r('Chuveiro 5.500 watts 129 reais', 129),
  r('Aquecedor a gás 15 litros 2.400', 2400), r('Gás 13 kg 135', 135), r('Fogão 5 bocas 1.350', 1350),
  r('Lustre 3 lâmpadas 240', 240), r('Cortina 2 metros 380', 380), r('Persiana 1,60 por 1,40, 520', 520),
  r('Corrimão de inox 3 metros 960 reais', 960), r('Guarda-corpo 4,5 metros 2.700', 2700), r('Rampa de acesso 1.150', 1150),
  r('Terraplenagem 120 m³ 3.600', 3600), r('Muro de arrimo 18 metros 14.400 reais', 14400), r('Drenagem 25 metros de manilha 1.375', 1375),
];
