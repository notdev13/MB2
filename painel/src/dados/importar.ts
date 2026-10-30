import { avaliarImportacao, avaliarImportacaoPdf, saldoDoExtrato, type Avaliacao } from '../dominio/importacao';
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

export interface ExtratoParaGravar { contaFinal?: string; saldo: number; data: string }

// A regra é conferida de novo AQUI, na hora de gravar, com os saldos que a tela tem naquele
// instante: nenhuma tela consegue gravar um extrato que a regra recusaria.
// origem 'pdf': o dono escolheu valor e data na conferência; o PDF não traz conta confiável,
// então o final da conta NUNCA é gravado a partir dele.
export async function gravarImportacao(
  g: Gravador,
  extrato: ExtratoParaGravar,
  conta: Conta,
  saldos: SaldoConta[],
  hoje: string,
  opcoes: { origem?: 'ofx' | 'pdf' } = {},
): Promise<ResultadoGravacao> {
  const pdf = opcoes.origem === 'pdf';
  const avaliacao = pdf
    ? avaliarImportacaoPdf(extrato, conta, saldos, hoje)
    : avaliarImportacao({ ...extrato, contaFinal: extrato.contaFinal ?? '' }, conta, saldos, hoje);
  if (!avaliacao.ok) return avaliacao;
  const saldo = await g.salvarSaldo(saldoDoExtrato(conta.id, extrato, pdf ? 'pdf' : 'ofx'));
  // Primeira importação OFX desta conta: guarda o final para reconhecê-la (e barrar a conta errada) nas próximas.
  let finalGravado = false;
  if (!pdf && !conta.finalConta && extrato.contaFinal) {
    const { id: _id, criadoEm: _c, atualizadoEm: _a, ...resto } = conta;
    await g.salvarConta({ ...resto, finalConta: extrato.contaFinal }, conta.id);
    finalGravado = true;
  }
  return { ok: true, saldo, finalGravado };
}
