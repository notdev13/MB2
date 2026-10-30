import { avaliarImportacao, avaliarImportacaoPdf, confirmacoesNecessarias, saldoDoExtrato, type Avaliacao, type Confirmacao } from '../dominio/importacao';
import type { Conta, NovaConta, NovoSaldo, SaldoConta } from '../dominio/tipos';

// Grava o saldo de um extrato já conferido pelo dono. Recebe só as funções de gravar (o contexto
// da tela ou o repositório), nunca acessa o armazenamento por conta própria.
export interface Gravador {
  listarSaldos(): Promise<SaldoConta[]>;
  salvarSaldo(d: NovoSaldo): Promise<SaldoConta>;
  salvarConta(d: NovaConta, id?: string): Promise<Conta>;
}

export type ResultadoGravacao =
  | { ok: true; saldo: SaldoConta; finalGravado: boolean }
  | Extract<Avaliacao, { ok: false }>
  | { ok: false; motivo: 'confirmar'; mensagem: string };

export interface ExtratoParaGravar { contaFinal?: string; saldo: number; data: string }

// A regra é conferida de novo AQUI, na hora de gravar, com os saldos RELIDOS do repositório
// naquele instante (não os da tela, que podem estar velhos): nenhuma tela consegue gravar um
// extrato que a regra recusaria, nem pular uma confirmação que a regra exige.
// `confirmadas` = o que o dono confirmou explicitamente na tela.
// origem 'pdf': o dono escolheu valor e data na conferência; o PDF não traz conta confiável,
// então o final da conta NUNCA é gravado a partir dele.
export async function gravarImportacao(
  g: Gravador,
  extrato: ExtratoParaGravar,
  conta: Conta,
  hoje: string,
  opcoes: { origem?: 'ofx' | 'pdf'; periodoFim?: string; datasEncontradas?: string[]; confirmadas?: Confirmacao[] } = {},
): Promise<ResultadoGravacao> {
  const pdf = opcoes.origem === 'pdf';
  const saldos = await g.listarSaldos();
  const avaliacao = pdf
    ? avaliarImportacaoPdf(extrato, conta, saldos, hoje, opcoes.periodoFim, opcoes.datasEncontradas)
    : avaliarImportacao({ ...extrato, contaFinal: extrato.contaFinal ?? '' }, conta, saldos, hoje);
  if (!avaliacao.ok) return avaliacao;
  const faltam = confirmacoesNecessarias(avaliacao).filter((c) => !opcoes.confirmadas?.includes(c));
  if (faltam.length > 0) {
    return { ok: false, motivo: 'confirmar', mensagem: 'Os saldos da conta mudaram desde a conferência. Abra a importação de novo e confirme.' };
  }
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
