import type { Caso } from './voz.corpus';

// Rodadas 43 em diante. Mesmo formato: r(frase, valor em reais ou null).
const r = (frase: string, reais: number | null, extra: Caso['esperado'] = {}, tipo = 'rodada'): Caso =>
  ({ frase, tipo, esperado: { valor: reais === null ? null : Math.round(reais * 100), ...extra } });

// Rodada 43: despesas administrativas da construtora (contador, folha, veículos, escritório, deslocamento).
export const CASOS_ROD43: Caso[] = [
  r('Honorário do contador 650 reais', 650), r('Taxa do cartório de 2.340', 2340), r('Imposto de renda da empresa 5.800', 5800),
  r('Folha de pagamento de outubro 18.400', 18400), r('FGTS 1.470', 1470), r('INSS 3.200 reais', 3200), r('DARF 1.120', 1120),
  r('Simples nacional 2.640', 2640), r('IPTU do terreno 1.340 em 10 vezes', null), r('Multa de trânsito 195,23', 195.23),
  r('Combustível 230 reais da hilux', 230), r('Pedágio 18,60', 18.6), r('Estacionamento 12', 12), r('Seguro do carro 480', 480),
  r('Manutenção da betoneira 380 reais', 380), r('Conserto da serra 150', 150), r('Peças da betoneira 4 correias 120 reais', 120),
  r('Locação de container 600 por mês', 600), r('Banheiro químico 2 unidades 480', 480), r('Cursos de segurança 2 pessoas 360', 360),
  r('Exame admissional 3 funcionários 270', 270), r('Uniforme 8 camisas 392', 392), r('Material de escritório 86,50', 86.5),
  r('Papel A4 3 resmas 54', 54), r('Impressão de projeto 14 folhas 98', 98), r('Plotagem A1 6 folhas 180', 180),
  r('Cópia heliográfica 45', 45), r('Taxa do CREA 98,50', 98.5), r('Anuidade do CREA 650', 650), r('Mensalidade do software 189,90', 189.9),
  r('Celular da obra 59,90', 59.9), r('Água mineral 10 galões 120', 120), r('Café e açúcar 64', 64), r('Lanche 25 pessoas 275', 275),
  r('Marmita 40 unidades 480 reais', 480), r('Hospedagem do engenheiro 2 diárias 560', 560), r('Passagem 340', 340),
  r('Frete do material de Joinville 880', 880), r('Diesel da retroescavadeira 12 horas 1.150', 1150), r('Operador da retroescavadeira 8 horas 640', 640),
  r('Plantão do vigia 15 dias 2.250', 2250), r('Limpeza final da obra, 4 diaristas, 800 reais', 800), r('Remoção de entulho, 6 caçambas, 2.100', 2100),
];
