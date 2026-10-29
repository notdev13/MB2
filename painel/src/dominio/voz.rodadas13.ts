import type { Caso } from './voz.corpus';

// Rodadas 49 em diante. Mesmo formato: r(frase, valor em reais ou null).
const r = (frase: string, reais: number | null, extra: Caso['esperado'] = {}, tipo = 'rodada'): Caso =>
  ({ frase, tipo, esperado: { valor: reais === null ? null : Math.round(reais * 100), ...extra } });

// Rodada 49: jurídico, cartório, tributos e papelada (percentuais, anos, vias e cópias ao lado do valor).
export const CASOS_ROD49: Caso[] = [
  r('Honorários advocatícios 3.500 reais', 3500), r('Taxa de administração 5 por cento', null), r('ITCMD 4 por cento 8.000', null),
  r('Escritura 2.340 mais registro 1.180', null), r('Total da escritura e registro 3.520', 3520), r('Avaliação do imóvel 600', 600),
  r('Certidão negativa 3 vias 120', 120), r('Reconhecimento de firma 4 assinaturas 32', 32), r('Autenticação 10 cópias 45', 45),
  r('Taxa de lixo 2026 187,50', 187.5), r('IPTU 2026 1.340', 1340), r('IPTU 2026 parcela 3 de 10 134', 134),
  r('Rescisão do João 4.280', 4280), r('Juros de 2 por cento ao mês, 340 reais', null), r('Multa de 10 por cento 150 reais', null),
  r('Correção monetária 1,5 por cento', null), r('Alvará de construção 1.980', 1980), r('Habite-se 640 reais', 640),
  r('Averbação da obra 1.150', 1150), r('Certidão de matrícula 2 vias 98', 98), r('Procuração 280 reais', 280),
  r('Contrato de empreitada 12 meses 48.000', 48000), r('Contrato de 12 meses, 4.000 por mês', null), r('Distrato 750', 750),
  r('Taxa de licença 1º semestre 2026, 860', 860), r('Seguro de obra 2026 1.480 reais', 1480), r('ART de execução 98,50', 98.5),
  r('Laudo técnico 3 páginas 1.200', 1200), r('Perícia 2.600 reais', 2600), r('Notificação extrajudicial 190', 190),
  r('Registro da incorporação 5.400', 5400), r('Taxa de fiscalização 5% 1.200', null), r('INSS da obra CEI 3.480', null),
  r('Matrícula CEI 5512 INSS 3.480', 3480), r('Guia GPS competência 10/2026 1.920', 1920), r('DARF código 2089 valor 1.120', 1120),
];
