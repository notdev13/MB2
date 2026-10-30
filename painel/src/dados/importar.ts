import { avaliarImportacao, saldoDoExtrato, type Avaliacao, type ExtratoParaAvaliar } from '../dominio/importacao';
import type { Conta, NovaConta, NovoSaldo, SaldoConta } from '../dominio/tipos';

// Grava o saldo de um extrato já conferido pelo dono. Recebe só as funções de gravar (o contexto
// da tela ou o repositório), nunca acessa o armazenamento por conta própria.
export interface Gravador {
  salvarSaldo(d: NovoSaldo): Promise<SaldoConta>;
  salvarConta(d: NovaConta, id?: string): Promise<Conta>;
}

export type ResultadoGravacao =
  | { ok: true; saldo: SaldoConta; finalGravado: boolean }
  | Extract<Avaliacao, { ok: false }>;

// A regra é conferida de novo AQUI, na hora de gravar, com os saldos que a tela tem naquele
// instante: nenhuma tela consegue gravar um extrato que a regra recusaria.
export async function gravarImportacao(
  g: Gravador,
  extrato: ExtratoParaAvaliar,
  conta: Conta,
  saldos: SaldoConta[],
  hoje: string,
): Promise<ResultadoGravacao> {
  const avaliacao = avaliarImportacao(extrato, conta, saldos, hoje);
  if (!avaliacao.ok) return avaliacao;
  const saldo = await g.salvarSaldo(saldoDoExtrato(conta.id, extrato));
  // Primeira importação desta conta: guarda o final para reconhecê-la (e barrar a conta errada) nas próximas.
  let finalGravado = false;
  if (!conta.finalConta) {
    const { id: _id, criadoEm: _c, atualizadoEm: _a, ...resto } = conta;
    await g.salvarConta({ ...resto, finalConta: extrato.contaFinal }, conta.id);
    finalGravado = true;
  }
  return { ok: true, saldo, finalGravado };
}
