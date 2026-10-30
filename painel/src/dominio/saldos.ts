import type { Conta, Obra, Custo, SaldoConta } from './tipos';
import { resumirObra } from './calculos';
import { lerReais } from './formato';

// Saldo atual de uma conta: o de data mais recente; em empate de data, o criado por último.
export function saldoAtual(contaId: string, saldos: SaldoConta[]): SaldoConta | null {
  let melhor: SaldoConta | null = null;
  for (const s of saldos) {
    if (s.contaId !== contaId) continue;
    if (!melhor || s.data > melhor.data || (s.data === melhor.data && s.criadoEm >= melhor.criadoEm)) melhor = s;
  }
  return melhor;
}

// Dias inteiros entre duas datas AAAA-MM-DD (0 se a data for de hoje ou do futuro).
export function diasDesde(data: string, ref: string): number {
  const dia = (iso: string) => {
    const [a, m, d] = iso.split('-').map(Number);
    return Date.UTC(a, m - 1, d);
  };
  return Math.max(0, Math.round((dia(ref) - dia(data)) / 86_400_000));
}

export interface ContaComSaldo {
  conta: Conta;
  saldo: SaldoConta | null; // null = nunca digitaram o saldo
  dias: number | null; // há quantos dias foi conferido
}

export function contasComSaldo(contas: Conta[], saldos: SaldoConta[], ref: string): ContaComSaldo[] {
  return contas.filter((c) => c.ativa).map((conta) => {
    const saldo = saldoAtual(conta.id, saldos);
    return { conta, saldo, dias: saldo ? diasDesde(saldo.data, ref) : null };
  });
}

const somar = (itens: ContaComSaldo[]) => itens.reduce((t, i) => t + (i.saldo?.valor ?? 0), 0);

// Total das contas da MB2 (empresa). Conta sem saldo digitado não entra na soma.
export const totalMB2 = (itens: ContaComSaldo[]) => somar(itens.filter((i) => i.conta.obraId === null));

// Total de todas as contas (MB2 e obras).
export const totalConsolidado = (itens: ContaComSaldo[]) => somar(itens);

export interface SobraObra {
  saldo: number; // dinheiro nas contas da obra
  aPagar: number; // custos da obra ainda não pagos
  sobra: number; // saldo - aPagar (negativo = falta dinheiro)
}

// "Sobra se pagar tudo" da obra. null quando a obra não tem conta com saldo digitado.
export function sobraSePagarTudo(obra: Obra, itens: ContaComSaldo[], custos: Custo[]): SobraObra | null {
  const dela = itens.filter((i) => i.conta.obraId === obra.id && i.saldo);
  if (dela.length === 0) return null;
  const saldo = somar(dela);
  const { aPagar } = resumirObra(obra, custos);
  return { saldo, aPagar, sobra: saldo - aPagar };
}

// Lê o valor digitado do saldo, que pode ser negativo ("-1.234,56" ou "R$ -50"). Centavos ou null.
// R$ 999.999.999,99: acima disso o número deixa de caber com segurança em centavos.
export const MAX_SALDO = 99_999_999_999;

export function lerSaldo(texto: string): number | null {
  const t = texto.replace(/R\$|\s/g, '');
  const negativo = /^[-−]/.test(t);
  const c = lerReais(negativo ? t.slice(1) : t);
  if (c === null || !Number.isSafeInteger(c) || c > MAX_SALDO) return null; // valor absurdo = erro de digitação
  return negativo && c !== 0 ? -c : c;
}

// Diferença maior que 30% do saldo anterior: vale perguntar antes de gravar (provável erro de digitação).
export const mudancaGrande = (anterior: number, novo: number) => Math.abs(novo - anterior) > Math.abs(anterior) * 0.3;
