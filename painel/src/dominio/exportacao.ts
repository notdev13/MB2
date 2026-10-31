import { porCategoria, resumirObra, soma } from './calculos';
import { gerarXlsx, type Aba, type Celula } from './xlsx';
import { FORMAS_PAGAMENTO, STATUS_OBRA, type Custo, type Obra } from './tipos';

// Monta a planilha .xlsx da exportação: aba "Lançamentos" (uma linha por lançamento, valor e data de
// verdade, para filtrar e somar no Excel ou no Google Planilhas) e aba "Resumo por obra".
export function abasDeExportacao(custos: Custo[], obras: Obra[]): Aba[] {
  const nome = new Map(obras.map((o) => [o.id, o.nome]));
  const ordenados = [...custos].sort((a, b) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id));
  const lancamentos: Celula[][] = [
    ['Data', 'Obra', 'Categoria', 'Descrição', 'Fornecedor', 'Valor', 'Pagamento', 'Situação'],
    ...ordenados.map((c): Celula[] => [
      { data: c.data }, nome.get(c.obraId) ?? '', c.categoria, c.descricao, c.fornecedor,
      { dinheiro: c.valor }, FORMAS_PAGAMENTO[c.pagamento], c.pago ? 'Pago' : 'A pagar',
    ]),
  ];
  const usadas = obras.filter((o) => custos.some((c) => c.obraId === o.id));
  const resumo: Celula[][] = [
    ['Obra', 'Situação', 'Orçamento', 'Gasto', 'A pagar', 'Saldo do orçamento', '% do orçamento', 'Lançamentos'],
    ...usadas.map((o): Celula[] => {
      const meus = custos.filter((c) => c.obraId === o.id);
      const r = resumirObra(o, meus);
      return [o.nome, STATUS_OBRA[o.status], o.orcamento ? { dinheiro: o.orcamento } : null, { dinheiro: r.gasto },
        { dinheiro: r.aPagar }, o.orcamento ? { dinheiro: r.saldo } : null,
        o.orcamento ? { percentual: Math.round(r.usoOrcamento * 1000) / 1000 } : null, meus.length];
    }),
    ['Total', '', null, { dinheiro: soma(custos) }, { dinheiro: soma(custos.filter((c) => !c.pago)) }, null, null, custos.length],
  ];
  const cats: Celula[][] = [
    ['Categoria', 'Valor', '% do total'],
    ...porCategoria(custos).map((f): Celula[] => [f.categoria, { dinheiro: f.total }, { percentual: Math.round(f.parte * 1000) / 1000 }]),
  ];
  return [
    { nome: 'Lançamentos', larguras: [12, 26, 24, 44, 26, 16, 16, 12], linhas: lancamentos },
    { nome: 'Resumo por obra', larguras: [28, 16, 16, 16, 16, 20, 16, 14], linhas: resumo },
    { nome: 'Por categoria', larguras: [28, 16, 12], linhas: cats },
  ];
}

export const planilhaXlsx = (custos: Custo[], obras: Obra[]): Uint8Array<ArrayBuffer> => gerarXlsx(abasDeExportacao(custos, obras));
