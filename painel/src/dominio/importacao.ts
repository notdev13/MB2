import { dataBR, reais } from './formato';
import { mudancaGrande, saldoAtual } from './saldos';
import type { Conta, NovoSaldo, SaldoConta } from './tipos';

// Regras para aceitar (ou recusar) o saldo lido de um extrato. Funções puras.
//
// REGRA DE OURO do dono: nunca aceitar extrato com data mais antiga que o último saldo da conta.
// Não existe "importar assim mesmo": quem chama só tem o resultado ok ou recusado.

export const OBS_IMPORTADO = 'Importado do extrato (OFX)';
export const OBS_IMPORTADO_PDF = 'Importado do extrato (PDF), conferido pelo dono';

export interface ExtratoParaAvaliar {
  contaFinal: string;
  saldo: number; // centavos
  data: string; // AAAA-MM-DD
}

export type Avaliacao =
  | {
    ok: true; aviso?: string; anterior: SaldoConta | null;
    precisaConfirmarMudancaGrande?: boolean;
    precisaConfirmarMesmoDia?: boolean; // mesmo dia do último saldo, valor diferente
  }
  | { ok: false; motivo: 'antigo' | 'repetido' | 'futuro' | 'outra-conta' | 'data-invalida'; mensagem: string };

// Confirmações explícitas que a tela precisa pedir ao dono antes de gravar. Quem grava
// (dados/importar.ts) confere que todas as necessárias foram dadas.
export type Confirmacao = 'mudanca-grande' | 'mesmo-dia' | 'data-anterior-periodo' | 'data-posterior';

export function confirmacoesNecessarias(a: Extract<AvaliacaoPdf, { ok: true }>): Confirmacao[] {
  const lista: Confirmacao[] = [];
  if (a.precisaConfirmarMudancaGrande) lista.push('mudanca-grande');
  if (a.precisaConfirmarMesmoDia) lista.push('mesmo-dia');
  if (a.precisaConfirmarDataAnteriorAoPeriodo) lista.push('data-anterior-periodo');
  if (a.precisaConfirmarDataPosterior) lista.push('data-posterior');
  return lista;
}

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
  // não pode travar a conta para sempre (amanhã ainda vale para o saldo digitado à mão). Já o EXTRATO
  // aceita no máximo hoje: a data do OFX já vem convertida para o dia local do Brasil.
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
  if (extrato.data > hoje) {
    return {
      ok: false, motivo: 'futuro',
      mensagem: `Este extrato tem data de ${dataBR(extrato.data)}, que ainda não chegou. O arquivo ou o relógio do aparelho está estranho.`,
    };
  }

  const avisos: string[] = [];
  // (d) mesmo dia, valor diferente: o dono confirma que este é mesmo o mais novo
  const mesmoDia = !!anterior && extrato.data === anterior.data;
  if (anterior && mesmoDia) {
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
    ...(mesmoDia ? { precisaConfirmarMesmoDia: true } : {}),
    anterior,
  };
}

export type AvaliacaoPdf =
  | (Extract<Avaliacao, { ok: true }> & {
    precisaConfirmarDataAnteriorAoPeriodo?: boolean;
    precisaConfirmarDataPosterior?: boolean; // bem depois do fim do período, ou fora das datas do PDF
  })
  | Extract<Avaliacao, { ok: false }>;

export const TOLERANCIA_DIAS_APOS_PERIODO = 3;

// A data digitada no PDF precisa ser plausível: ano de 1990 até o ano atual + 1.
export function dataPlausivel(iso: string, hoje: string): boolean {
  const ano = Number(iso.slice(0, 4));
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && ano >= 1990 && ano <= Number(hoje.slice(0, 4)) + 1;
}

// PDF: o mesmo avaliarImportacao (data antiga, repetido, futuro, mudança grande). Como o PDF não
// traz número de conta confiável, a checagem de final não se aplica; o dono escolhe a conta.
// Regras extras do PDF, todas com confirmação extra (NUNCA contornam a regra de ouro, aplicada antes):
// - data anterior ao fim do período do documento;
// - data mais de 3 dias depois do fim do período;
// - sem fim de período: data que não é nenhuma das datas encontradas no PDF (datasEncontradas).
export function avaliarImportacaoPdf(
  extrato: Pick<ExtratoParaAvaliar, 'saldo' | 'data'>, conta: Pick<Conta, 'id' | 'finalConta'>, saldos: SaldoConta[], hoje: string,
  periodoFim?: string, datasEncontradas?: string[],
): AvaliacaoPdf {
  if (!dataPlausivel(extrato.data, hoje)) {
    return { ok: false, motivo: 'data-invalida', mensagem: 'Esta data não parece certa. Use uma data entre 1990 e o próximo ano.' };
  }
  const r = avaliarImportacao({ ...extrato, contaFinal: conta.finalConta ?? '' }, conta, saldos, hoje);
  if (!r.ok) return r;
  const avisos: string[] = r.aviso ? [r.aviso] : [];
  const extra: { precisaConfirmarDataAnteriorAoPeriodo?: true; precisaConfirmarDataPosterior?: true } = {};
  if (periodoFim && extrato.data < periodoFim) {
    avisos.push(`Atenção: a data escolhida (${dataBR(extrato.data)}) é anterior ao fim do período do extrato (${dataBR(periodoFim)}). ` +
      'Se o saldo escolhido é o do fim do período, use a data do fim.');
    extra.precisaConfirmarDataAnteriorAoPeriodo = true;
  } else if (periodoFim && extrato.data > somarDias(periodoFim, TOLERANCIA_DIAS_APOS_PERIODO)) {
    avisos.push(`Atenção: a data escolhida (${dataBR(extrato.data)}) é bem depois do fim do período do extrato (${dataBR(periodoFim)}). ` +
      'Confira se é mesmo a data deste saldo.');
    extra.precisaConfirmarDataPosterior = true;
  } else if (!periodoFim && datasEncontradas && !datasEncontradas.includes(extrato.data)) {
    avisos.push(`Atenção: a data escolhida (${dataBR(extrato.data)}) não é nenhuma das datas encontradas no PDF. Confira se é mesmo a data deste saldo.`);
    extra.precisaConfirmarDataPosterior = true;
  }
  if (Object.keys(extra).length === 0) return r;
  return { ...r, aviso: avisos.join(' '), ...extra };
}

// O saldo que será gravado: só valor, data e a origem "extrato". Nada mais do arquivo.
export const saldoDoExtrato = (contaId: string, extrato: Pick<ExtratoParaAvaliar, 'saldo' | 'data'>, origem: 'ofx' | 'pdf' = 'ofx'): NovoSaldo =>
  ({ contaId, data: extrato.data, valor: extrato.saldo, fonte: 'extrato', obs: origem === 'pdf' ? OBS_IMPORTADO_PDF : OBS_IMPORTADO });

// Conta do painel que já tem este final (para pré-selecionar). Só se for única: na dúvida, o dono escolhe.
export function contaPeloFinal(contas: Conta[], contaFinal: string): Conta | null {
  const achadas = contas.filter((c) => c.ativa && c.finalConta === contaFinal);
  return achadas.length === 1 ? achadas[0] : null;
}
