import { CATEGORIAS, FORMAS_PAGAMENTO, STATUS_OBRA, type Custo } from '../dominio/tipos';
import { dataBR } from '../dominio/formato';
import type { Backup } from './repositorio';

const texto = (v: unknown) => typeof v === 'string';
const data = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const dataOuNada = (v: unknown) => v === null || data(v);
const centavos = (v: unknown) => Number.isSafeInteger(v) && (v as number) >= 0;

export function obraValida(o: Record<string, unknown>): boolean {
  return texto(o.id) && texto(o.nome) && texto(o.endereco) && texto(o.cliente) && texto(o.observacoes) &&
    centavos(o.orcamento) && (o.areaM2 === null || (typeof o.areaM2 === 'number' && o.areaM2 > 0)) &&
    dataOuNada(o.inicio) && dataOuNada(o.previsaoFim) && texto(o.status) && Object.hasOwn(STATUS_OBRA, o.status as string) &&
    texto(o.criadoEm) && texto(o.atualizadoEm);
}

export function contaValida(c: Record<string, unknown>, obras?: Set<string>): boolean {
  return texto(c.id) && texto(c.nome) && texto(c.banco) && typeof c.ativa === 'boolean' &&
    (c.obraId === null || (texto(c.obraId) && (!obras || obras.has(c.obraId as string)))) &&
    (c.finalConta === undefined || (typeof c.finalConta === 'string' && /^\d{4}$/.test(c.finalConta))) &&
    texto(c.criadoEm) && texto(c.atualizadoEm);
}

// Saldo da conta pode ser negativo (conta no vermelho); o custo continua só >= 0.
export function saldoValido(s: Record<string, unknown>, contas?: Set<string>): boolean {
  return texto(s.id) && texto(s.contaId) && (!contas || contas.has(s.contaId as string)) && data(s.data) &&
    Number.isSafeInteger(s.valor) && (s.fonte === 'manual' || s.fonte === 'extrato') && texto(s.obs) && texto(s.criadoEm);
}

// Sem a lista de obras, não confere se a obra do custo existe (ela pode chegar da nuvem depois).
export function custoValido(c: Record<string, unknown>, obras?: Set<string>): boolean {
  return texto(c.id) && texto(c.obraId) && (!obras || obras.has(c.obraId as string)) && data(c.data) &&
    CATEGORIAS.includes(c.categoria as never) && texto(c.descricao) && texto(c.fornecedor) && centavos(c.valor) &&
    texto(c.pagamento) && Object.hasOwn(FORMAS_PAGAMENTO, c.pagamento as string) && typeof c.pago === 'boolean' &&
    texto(c.criadoEm) && texto(c.atualizadoEm);
}

// Confere um arquivo de backup antes de restaurar. Devolve o backup ou a mensagem do problema.
export function validarBackup(bruto: unknown): { ok: true; backup: Backup } | { ok: false; erro: string } {
  const b = bruto as Partial<Backup> | null;
  if (!b || typeof b !== 'object' || b.app !== 'mb2-painel') {
    return { ok: false, erro: 'Este arquivo não é um backup do Painel MB².' };
  }
  if ((b.versao !== 1 && b.versao !== 2) || !texto(b.geradoEm)) return { ok: false, erro: 'Versão de backup desconhecida.' };
  if (!Array.isArray(b.obras) || !Array.isArray(b.custos)) {
    return { ok: false, erro: 'Backup incompleto: faltam obras ou custos.' };
  }
  const idsObras = new Set<string>();
  for (const o of b.obras) {
    if (!o || typeof o !== 'object' || !obraValida(o as never) || idsObras.has(o.id)) {
      return { ok: false, erro: 'Há uma obra com dados inválidos no backup.' };
    }
    idsObras.add(o.id);
  }
  const idsCustos = new Set<string>();
  for (const c of b.custos) {
    if (!c || typeof c !== 'object' || !custoValido(c as never, idsObras) || idsCustos.has(c.id)) {
      return { ok: false, erro: 'Há um lançamento de custo com dados inválidos no backup.' };
    }
    idsCustos.add(c.id);
  }
  // Versão 1 não tem contas nem saldos: entram vazios (e a restauração não mexe nos do aparelho).
  if (b.versao === 1) return { ok: true, backup: { ...(b as Backup), contas: [], saldos: [] } };
  if (!Array.isArray(b.contas) || !Array.isArray(b.saldos)) {
    return { ok: false, erro: 'Backup incompleto: faltam contas ou saldos.' };
  }
  const idsContas = new Set<string>();
  for (const c of b.contas) {
    if (!c || typeof c !== 'object' || !contaValida(c as never, idsObras) || idsContas.has(c.id)) {
      return { ok: false, erro: 'Há uma conta com dados inválidos no backup.' };
    }
    idsContas.add(c.id);
  }
  const idsSaldos = new Set<string>();
  for (const s of b.saldos) {
    if (!s || typeof s !== 'object' || !saldoValido(s as never, idsContas) || idsSaldos.has(s.id)) {
      return { ok: false, erro: 'Há um saldo de conta com dados inválidos no backup.' };
    }
    idsSaldos.add(s.id);
  }
  return { ok: true, backup: b as Backup };
}

// Planilha (abre no Excel/Numbers) com todos os lançamentos. Separador ';' e vírgula decimal,
// que é o que o Excel em português espera.
export function custosEmCsv(custos: Custo[], nomeObra: (id: string) => string): string {
  const campo = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const linhas = [
    ['Data', 'Obra', 'Categoria', 'Descrição', 'Fornecedor', 'Valor (R$)', 'Pagamento', 'Pago'].join(';'),
  ];
  for (const c of [...custos].sort((a, b) => a.data.localeCompare(b.data))) {
    linhas.push(
      [
        dataBR(c.data),
        campo(nomeObra(c.obraId)),
        campo(c.categoria),
        campo(c.descricao),
        campo(c.fornecedor),
        (c.valor / 100).toFixed(2).replace('.', ','),
        FORMAS_PAGAMENTO[c.pagamento],
        c.pago ? 'Sim' : 'Não',
      ].join(';'),
    );
  }
  return '﻿' + linhas.join('\r\n');
}
