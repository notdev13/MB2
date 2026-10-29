import type { Caso } from './voz.corpus';

// Rodadas 42 em diante. Mesmo formato: r(frase, valor em reais ou null).
const r = (frase: string, reais: number | null, extra: Caso['esperado'] = {}, tipo = 'rodada'): Caso =>
  ({ frase, tipo, esperado: { valor: reais === null ? null : Math.round(reais * 100), ...extra } });

// Rodada 42: pago / a pagar, forma de pagamento e datas em volta de um valor simples (data, pagamento e pago sem regressão).
export const CASOS_ROD42: Caso[] = [
  r('já está pago, 300 de areia', 300, { pago: true }), r('tá pago 300 de areia', 300, { pago: true }),
  r('pago à vista 300 de areia', 300, { pago: true }), r('paguei à vista 300 de areia', 300, { pago: true }),
  r('300 de areia, quitado', 300, { pago: true }), r('300 de areia, em aberto', 300, { pago: false }),
  r('300 de areia, ainda não foi pago', 300, { pago: false }), r('300 de areia, não paguei ainda', 300, { pago: false }),
  r('300 de areia, vou pagar na sexta', 300, { pago: false, data: null }), r('300 de areia, vence na sexta', 300, { pago: false, data: null }),
  r('300 de areia vai vencer dia 30', 300, { pago: false, data: null }), r('300 de areia, boleto vencido', 300, { pago: false, pagamento: 'boleto' }),
  r('300 de areia, devo pro Seu Jorge', 300, { pago: false }), r('300 de areia, fiado no Seu Jorge', 300, { pago: false }),
  r('300 de areia pago no pix hoje', 300, { pago: true, pagamento: 'pix', data: '2026-10-28' }), r('300 de areia pelo pix', 300, { pagamento: 'pix' }),
  r('300 de areia via pix', 300, { pagamento: 'pix' }), r('300 de areia no cartão de débito', 300, { pagamento: 'cartao' }),
  r('300 de areia no cartão de crédito em 3x', null, { pagamento: 'cartao', pago: false }), r('300 de areia com o cartão', 300, { pagamento: 'cartao' }),
  r('300 de areia em espécie', 300, { pagamento: 'dinheiro' }), r('300 de areia por TED', 300, { pagamento: 'transferencia' }),
  r('300 de areia por DOC', 300, { pagamento: 'transferencia' }), r('300 de areia depósito', 300, { pagamento: null }),
  r('300 de areia cheque', 300, { pagamento: 'outro' }), r('300 de areia no boleto bancário', 300, { pagamento: 'boleto' }),
  r('300 de areia no boleto vence 10/11', 300, { pagamento: 'boleto', pago: false, data: null }), r('300 de areia 10/11', 300, { data: null }),
  r('300 de areia 10/10', 300, { data: '2026-10-10' }), r('300 de areia dia 10 de setembro', 300, { data: '2026-09-10' }),
  r('300 de areia ontem à tarde', 300, { data: '2026-10-27' }), r('300 de areia hoje cedo', 300, { data: '2026-10-28' }),
  r('300 de areia sábado passado', 300, { data: '2026-10-24' }), r('300 de areia segunda-feira', 300, { data: '2026-10-26' }),
  r('300 de areia semana passada', 300, { data: null }), r('300 de areia dia 1º', 300, { data: '2026-10-01' }),
  r('300 de areia primeiro de setembro', 300, { data: '2026-09-01' }), r('300 de areia no dia vinte e dois de agosto', 300, { data: '2026-08-22' }),
  r('300 de areia em 3 de março de 2025', 300, { data: '2025-03-03' }), r('300 de areia 3/3/25', 300, { data: '2025-03-03' }),
  r('300 de areia 03-03-2025', 300), r('300 de areia há uma semana', 300, { data: '2026-10-21' }), r('300 de areia quinta passada', 300, { data: '2026-10-22' }),
];
