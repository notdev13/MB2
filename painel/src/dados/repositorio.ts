import type { Custo, NovaObra, NovoCusto, Obra } from '../dominio/tipos';

// Contrato do armazenamento. Hoje a implementação é local (IndexedDB, no próprio aparelho).
// Para sincronizar com a nuvem depois, basta outra implementação deste contrato.
export interface Repositorio {
  listarObras(): Promise<Obra[]>;
  salvarObra(dados: NovaObra, id?: string): Promise<Obra>;
  excluirObra(id: string): Promise<void>; // apaga também os custos da obra

  listarCustos(): Promise<Custo[]>;
  salvarCusto(dados: NovoCusto, id?: string): Promise<Custo>;
  excluirCusto(id: string): Promise<void>;

  exportar(): Promise<Backup>;
  substituirTudo(backup: Backup): Promise<void>; // guarda uma cópia do que havia antes
  copiaAnterior(): Promise<Backup | null>;
  desfazerRestauracao(): Promise<void>;
}

export interface Backup {
  app: 'mb2-painel';
  versao: 1;
  geradoEm: string;
  obras: Obra[];
  custos: Custo[];
}
