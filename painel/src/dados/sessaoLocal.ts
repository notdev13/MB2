import type { Nuvem } from './nuvem';
import type { FilaLocal } from './repositorio';
import { gravarConta, limparUltima, type Armazem } from './ultimaSincronizacao';

type Fila = Pick<FilaLocal, 'gravarMarca'>;

// Sair: encerra a sessão na nuvem e esquece a marca de sincronização (na próxima entrada tudo é
// conferido de novo). Os dados do aparelho NÃO são apagados. A conta do aparelho fica gravada de
// propósito: se outra pessoa entrar depois, o painel pergunta antes de enviar os dados daqui.
export async function limparSessaoLocal(a: { nuvem: Nuvem; repo: Fila; armazem?: Armazem | null }): Promise<void> {
  await a.nuvem.sair();
  await a.repo.gravarMarca(null);
  limparUltima(a.armazem);
}

// "Continuar" com outra conta: zera a marca ANTES de montar o painel, para a primeira sincronização
// com a conta nova enviar tudo o que está aqui e buscar tudo o que ela tem. Só então grava a conta nova.
export async function confirmarOutraConta(a: { repo: Fila; email: string; armazem?: Armazem | null }): Promise<void> {
  await a.repo.gravarMarca(null);
  limparUltima(a.armazem);
  gravarConta(a.email, a.armazem);
}
