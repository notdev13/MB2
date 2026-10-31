import type { Conta, Custo, NovaConta, NovaObra, NovoCusto, NovoSaldo, Obra, SaldoConta } from '../dominio/tipos';

// Contrato do armazenamento. Os dados ficam no próprio aparelho (IndexedDB) e, se a nuvem
// estiver ligada, a sincronização troca com ela só o que mudou (ver sincronizacao.ts).
export interface Repositorio {
  listarObras(): Promise<Obra[]>;
  salvarObra(dados: NovaObra, id?: string): Promise<Obra>;
  excluirObra(id: string): Promise<void>; // apaga também os custos da obra

  listarCustos(): Promise<Custo[]>;
  salvarCusto(dados: NovoCusto, id?: string): Promise<Custo>;
  excluirCusto(id: string): Promise<void>;

  // Dinheiro em conta. Sincroniza com a nuvem como obras e custos (docs/nuvem.md).
  listarContas(): Promise<Conta[]>;
  salvarConta(dados: NovaConta, id?: string): Promise<Conta>;
  excluirConta(id: string): Promise<void>; // apaga também os saldos da conta
  listarSaldos(): Promise<SaldoConta[]>;
  salvarSaldo(dados: NovoSaldo): Promise<SaldoConta>; // sempre uma linha nova, nunca sobrescreve
  excluirSaldo(id: string): Promise<void>; // só para linha lançada por engano

  exportar(): Promise<Backup>;
  // Guarda uma cópia do que havia antes (para desfazer), salvo com semCopia.
  substituirTudo(backup: Backup, opcoes?: { semCopia?: boolean }): Promise<void>;
  copiaAnterior(): Promise<Backup | null>;
  desfazerRestauracao(): Promise<void>;
}

export interface Backup {
  app: 'mb2-painel';
  versao: 1 | 2;
  geradoEm: string;
  obras: Obra[];
  custos: Custo[];
  // Da versão 2 em diante. Backup versão 1 não traz: restaurá-lo não mexe nas contas e saldos do aparelho.
  contas?: Conta[];
  saldos?: SaldoConta[];
}

// ---- Sincronização com a nuvem ----

export type TipoRegistro = 'obra' | 'custo' | 'conta' | 'saldo';

// Uma mudança feita neste aparelho que ainda não chegou à nuvem.
export interface Pendente {
  tipo: TipoRegistro;
  id: string;
  excluido: boolean;
  alteradoEm: string; // ISO, quando a mudança foi feita
}

// Uma obra, custo, conta ou saldo como fica guardado na nuvem.
export interface RegistroNuvem {
  tipo: TipoRegistro;
  id: string;
  dados: Obra | Custo | Conta | SaldoConta | null; // null quando excluído
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
  // Proteção contra "apagar tudo": quantos registros há aqui e quantos destes a nuvem apagaria.
  contarExclusoes(registros: RegistroNuvem[]): Promise<{ total: number; apagariam: number }>;
  lerMarca(): Promise<string | null>;
  gravarMarca(marca: string | null): Promise<void>;
}

// ---- Diário da obra ----
// Fica num banco próprio do aparelho (mb2-diario), separado de obras e custos: fotos e vídeos são
// grandes e não entram no backup em arquivo nem na sincronização (ver docs/diario.md).
export interface RepositorioDiario {
  listar(): Promise<import('../dominio/diario').RegistroDiario[]>;
  // Grava o registro e os arquivos novos juntos. Mídias tiradas do registro têm o arquivo apagado.
  salvar(
    dados: import('../dominio/diario').NovoRegistroDiario,
    arquivosNovos: Record<string, Blob>,
    id?: string,
  ): Promise<import('../dominio/diario').RegistroDiario>;
  excluir(id: string): Promise<void>; // apaga também as fotos e vídeos
  arquivo(midiaId: string): Promise<Blob | null>;
  excluirDaObra(obraId: string): Promise<void>;
}
