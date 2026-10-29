import type { Caso } from './voz.corpus';

// Rodadas 29 em diante (continuação de voz.rodadas.ts). Mesmo formato: r(frase, valor em reais ou null).
const r = (frase: string, reais: number | null, extra: Caso['esperado'] = {}, tipo = 'rodada'): Caso =>
  ({ frase, tipo, esperado: { valor: reais === null ? null : Math.round(reais * 100), ...extra } });

// Rodada 29: frases longas com vários números que não são dinheiro (hora, pedido, andar, cartão, medidas, quantidades).
export const CASOS_ROD29: Caso[] = [
  r('Comprei 15 sacos de cimento na Cassol hoje às 10h por 640 reais pro lote 39', 640, { obraId: 'l39' }),
  r('Hoje às 8h30 paguei 1.200 reais pro Ulisses, são 3 dias de serviço', 1200), r('Dia 12 às 14h chegou a carga de 6 metros de areia, paguei 900', 900),
  r('Pedido 5521 entregue dia 20 com 40 sacos, total 1.600 reais', 1600), r('No 2º andar do lote 39 foram 12 diárias, 3.000 reais', 3000),
  r('Paguei 3 parcelas atrasadas de 400, total 1.200', 1200), r('Cartão final 4455 compra de 780 reais', 780),
  r('Agência 0123 conta 45678-9 transferência de 2.500', 2500), r('Ligação 3232-4455: frete de 150 reais', 150),
  r('CEP 88063-000 frete 150', 150), r('Cliente do apto 302 pediu troca de piso, 1.400 reais', 1400),
  r('No dia 10, 11 e 12 trabalharam 3 pedreiros, 2.700 reais', 2700), r('Medição 3 da obra: 12.400 reais', 12400),
  r('Etapa 2 da laje, 8.000 de mão de obra', 8000), r('Fase 3, reboco, 5.500', 5500), r('Parte 2 do terreno 30 mil', 30000),
  r('Torre 2 bloco 3 apto 41 pintura 7.800', 7800), r('Pagamento 1 de 3: 1.000', 1000),
  r('Sessenta e cinco por cento do contrato, 12 mil', null), r('Saldo devedor 8.000, paguei 2.000', null),
  r('Foram 5 homens por 2 dias, 1.500 reais', 1500), r('Mais 2 ajudantes por 3 dias, 600', 600),
  r('6 sacos de cimento 38 cada, 228', 228), r('3 sacos de cimento a 38 cada: 114', 114), r('3 sacos de cimento 114', 114),
  r('2 sacos de cimento 76', 76), r('Cimento: 38 (unidade), 10 sacos', null), r('Fretei 12 viagens a 80, total 960', 960),
  r('Quinzena do pessoal: 4 pedreiros e 2 serventes, 7.200', 7200), r('Ferro 3/8 12 barras 540', 540, { data: null }),
  r('Tubo 3/4 x 6m 90 reais', 90, { data: null }), r('Compensado 15 mm 2,20 x 1,10 280 reais', 280),
  r('Vidro 1,20 por 2,00 R$ 650', 650), r('Porta 0,80 x 2,10 m R$ 1.200', 1200), r('Janela 1,5 m² 480', 480),
  r('Telha 40x40 caixa com 25 por 1.150', 1150), r('Locação de andaime 30 dias R$ 900', 900), r('Locação de andaime por 30 dias 900', 900),
  r('Diária do operador 8h, 220 reais', 220), r('Hora extra 2h pedreiro 60', 60), r('Almoço 12 pessoas 288', 288), r('Almoço 3 pessoas 54', 54),
];
