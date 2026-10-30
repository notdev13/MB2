import type { Conta, Custo, NovaConta, NovaObra, NovoCusto, Obra } from '../dominio/tipos';

// Contrato do armazenamento. Os dados ficam no próprio aparelho (IndexedDB) e, se a nuvem
// estiver ligada, a sincronização troca com ela só o que mudou (ver sincronizacao.ts).
export interface Repositorio {
  listarObras(): Promise<Obra[]>;
  salvarObra(dados: NovaObra, id?: string): Promise<Obra>;
  excluirObra(id: string): Promise<void>; // apaga também os custos da obra

  listarCustos(): Promise<Custo[]>;
  salvarCusto(dados: NovoCusto, id?: string): Promise<Custo>;
  excluirCusto(id: string): Promise<void>;

  listarContas(): Promise<Conta[]>;
  salvarConta(dados: NovaConta, id?: string): Promise<Conta>;
  excluirConta(id: string): Promise<void>;

  exportar(): Promise<Backup>;
  // Guarda uma cópia do que havia antes (para desfazer), salvo com semCopia.
  substituirTudo(backup: Backup, opcoes?: { semCopia?: boolean }): Promise<void>;
  copiaAnterior(): Promise<Backup | null>;
  desfazerRestauracao(): Promise<void>;
}

export interface Backup {
  app: 'mb2-painel';
  versao: 1;
  geradoEm: string;
  obras: Obra[];
  custos: Custo[];
  contas?: Conta[]; // opcional: backups antigos não têm
}

// ---- Sincronização com a nuvem ----

export type TipoRegistro = 'obra' | 'custo' | 'conta';

// Uma mudança feita neste aparelho que ainda não chegou à nuvem.
export interface Pendente {
  tipo: TipoRegistro;
  id: string;
  excluido: boolean;
  alteradoEm: string; // ISO, quando a mudança foi feita
}

// Uma obra, um custo ou uma conta como fica guardado na nuvem.
export interface RegistroNuvem {
  tipo: TipoRegistro;
  id: string;
  dados: Obra | Custo | Conta | null; // null quando excluído
  excluido: boolean;
  alteradoEm: string;
  servidorEm?: string; // quando chegou à nuvem (marca até onde já foi buscado)
}

// O que a sincronização precisa do armazenamento local, além do Repositorio.
export interface FilaLocal {
  pendentes(): Promise<Pendente[]>;
  // Monta o que vai para a nuvem a partir das pendências (lê o registro atual de cada uma).
  paraEnviar(pendentes: Pendente[]): Promise<RegistroNuvem[]>;
  // Tira da fila o que foi enviado, se não mudou de novo enquanto enviava.
  confirmarEnvio(enviados: Pendente[]): Promise<void>;
  // Aplica o que veio da nuvem; uma mudança local mais nova vence. Devolve quantos mudaram aqui.
  aplicarDaNuvem(registros: RegistroNuvem[]): Promise<number>;
  // Primeira sincronização: põe tudo o que já existe no aparelho na fila de envio.
  enfileirarTudo(): Promise<void>;
  lerMarca(): Promise<string | null>;
  gravarMarca(marca: string | null): Promise<void>;
}
