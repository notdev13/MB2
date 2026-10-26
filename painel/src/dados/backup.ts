import { CATEGORIAS, FORMAS_PAGAMENTO, STATUS_OBRA, type Custo } from '../dominio/tipos';
import { dataBR } from '../dominio/formato';
import type { Backup } from './repositorio';

// Confere um arquivo de backup antes de restaurar. Devolve o backup ou a mensagem do problema.
export function validarBackup(bruto: unknown): { ok: true; backup: Backup } | { ok: false; erro: string } {
  const b = bruto as Partial<Backup> | null;
  if (!b || typeof b !== 'object' || b.app !== 'mb2-painel') {
    return { ok: false, erro: 'Este arquivo não é um backup do Painel MB².' };
  }
  if (b.versao !== 1) return { ok: false, erro: 'Versão de backup desconhecida.' };
  if (!Array.isArray(b.obras) || !Array.isArray(b.custos)) {
    return { ok: false, erro: 'Backup incompleto: faltam obras ou custos.' };
  }
  const idsObras = new Set<string>();
  for (const o of b.obras) {
    if (typeof o?.id !== 'string' || typeof o.nome !== 'string' || !Number.isInteger(o.orcamento) ||
        !(o.status in STATUS_OBRA)) {
      return { ok: false, erro: 'Há uma obra com dados inválidos no backup.' };
    }
    idsObras.add(o.id);
  }
  for (const c of b.custos) {
    if (typeof c?.id !== 'string' || !idsObras.has(c.obraId) || !Number.isInteger(c.valor) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(c.data) || !CATEGORIAS.includes(c.categoria) ||
        !(c.pagamento in FORMAS_PAGAMENTO)) {
      return { ok: false, erro: 'Há um lançamento de custo com dados inválidos no backup.' };
    }
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
