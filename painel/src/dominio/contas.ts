import type { Conta, NovaConta } from './tipos';

// Registra um saldo novo na conta: o anterior vai para o histórico (um registro por data; se
// o saldo é informado de novo no mesmo dia, o do dia é substituído em vez de duplicado).
export function comSaldoAtualizado(conta: Conta, saldo: number, data: string): NovaConta {
  const { id: _id, criadoEm: _c, atualizadoEm: _a, ...resto } = conta;
  const anteriores = conta.historico.filter((h) => h.data !== conta.saldoEm);
  const historico = [...anteriores, { data: conta.saldoEm, saldo: conta.saldo }]
    .filter((h) => h.data !== data)
    .sort((a, b) => a.data.localeCompare(b.data));
  return { ...resto, saldo, saldoEm: data, historico };
}

export function novaConta(dados: { nome: string; obraId: string | null; saldo: number; data: string }): NovaConta {
  return {
    nome: dados.nome, tipo: dados.obraId ? 'obra' : 'principal', obraId: dados.obraId,
    saldo: dados.saldo, saldoEm: dados.data, historico: [],
  };
}
