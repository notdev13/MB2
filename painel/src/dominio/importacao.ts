import { dataBR, reais } from './formato';
import { mudancaGrande, saldoAtual } from './saldos';
import type { Conta, NovoSaldo, SaldoConta } from './tipos';

// Regras para aceitar (ou recusar) o saldo lido de um extrato. Funções puras.
//
// REGRA DE OURO do dono: nunca aceitar extrato com data mais antiga que o último saldo da conta.
// Não existe "importar assim mesmo": quem chama só tem o resultado ok ou recusado.

export const OBS_IMPORTADO = 'Importado do extrato (OFX)';

export interface ExtratoParaAvaliar {
  contaFinal: string;
  saldo: number; // centavos
  data: string; // AAAA-MM-DD
}

export type Avaliacao =
  | { ok: true; aviso?: string; precisaConfirmarMudancaGrande?: boolean; anterior: SaldoConta | null }
  | { ok: false; motivo: 'antigo' | 'repetido' | 'futuro' | 'outra-conta'; mensagem: string };

// AAAA-MM-DD + n dias (calendário, sem fuso).
export function somarDias(iso: string, n: number): string {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
}

// O "último saldo" da regra: o mais recente da conta, ignorando saldos com data depois de amanhã.
export function ultimoSaldoValido(contaId: string, saldos: SaldoConta[], hoje: string): SaldoConta | null {
  const limite = somarDias(hoje, 1);
  return saldoAtual(contaId, saldos.filter((s) => s.contaId === contaId && s.data <= limite));
}

export function avaliarImportacao(
  extrato: ExtratoParaAvaliar,
  conta: Pick<Conta, 'id' | 'finalConta'>,
  saldos: SaldoConta[],
  hoje: string,
): Avaliacao {
  // (a) o extrato é de outra conta
  if (conta.finalConta && conta.finalConta !== extrato.contaFinal) {
    return {
      ok: false, motivo: 'outra-conta',
      mensagem: `Este extrato é da conta final ${extrato.contaFinal}, mas esta conta do painel é a final ${conta.finalConta}. Escolha a conta certa.`,
    };
  }

  // O "último saldo" ignora saldo com data depois de amanhã: um saldo digitado no futuro por engano
  // não pode travar a conta para sempre. Amanhã ainda vale (diferença de fuso e de relógio).
  const limite = somarDias(hoje, 1);
  const anterior = ultimoSaldoValido(conta.id, saldos, hoje);
  const temFuturo = saldos.some((s) => s.contaId === conta.id && s.data > limite);

  // (b) REGRA DE OURO
  if (anterior && extrato.data < anterior.data) {
    return {
      ok: false, motivo: 'antigo',
      mensagem: `Este extrato é de ${dataBR(extrato.data)}, mas o último saldo desta conta é de ${dataBR(anterior.data)}. ` +
        'Não vou importar para não trocar um saldo novo por um antigo.',
    };
  }
  // (c) mesma data e mesmo valor
  if (anterior && extrato.data === anterior.data && extrato.saldo === anterior.valor) {
    return {
      ok: false, motivo: 'repetido',
      mensagem: `Este saldo (${reais(extrato.saldo)} em ${dataBR(extrato.data)}) já registrado nesta conta. Nada a importar.`,
    };
  }
  // (e) data no futuro: arquivo ou relógio estranho
  if (extrato.data > limite) {
    return {
      ok: false, motivo: 'futuro',
      mensagem: `Este extrato tem data de ${dataBR(extrato.data)}, que ainda não chegou. O arquivo ou o relógio do aparelho está estranho.`,
    };
  }

  const avisos: string[] = [];
  // (d) mesmo dia, valor diferente
  if (anterior && extrato.data === anterior.data) {
    avisos.push(`Atenção: mesmo dia do último saldo, valor diferente (antes ${reais(anterior.valor)}).`);
  }
  if (temFuturo) {
    avisos.push('Esta conta tem um saldo com data no futuro, provavelmente digitado por engano. Ele foi ignorado nesta conferência; vale excluí-lo.');
  }
  // (f) mudança grande
  const grande = !!anterior && mudancaGrande(anterior.valor, extrato.saldo);
  return {
    ok: true,
    ...(avisos.length ? { aviso: avisos.join(' ') } : {}),
    ...(grande ? { precisaConfirmarMudancaGrande: true } : {}),
    anterior,
  };
}

// O saldo que será gravado: só valor, data e a origem "extrato". Nada mais do arquivo.
export const saldoDoExtrato = (contaId: string, extrato: Pick<ExtratoParaAvaliar, 'saldo' | 'data'>): NovoSaldo =>
  ({ contaId, data: extrato.data, valor: extrato.saldo, fonte: 'extrato', obs: OBS_IMPORTADO });

// Conta do painel que já tem este final (para pré-selecionar). Só se for única: na dúvida, o dono escolhe.
export function contaPeloFinal(contas: Conta[], contaFinal: string): Conta | null {
  const achadas = contas.filter((c) => c.ativa && c.finalConta === contaFinal);
  return achadas.length === 1 ? achadas[0] : null;
}
