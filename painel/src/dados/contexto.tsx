import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Custo, NovaObra, NovoCusto, Obra } from '../dominio/tipos';
import { criarRepositorioLocal } from './indexeddb';
import type { Backup, Repositorio } from './repositorio';

interface Dados {
  carregando: boolean;
  erro: string | null;
  obras: Obra[];
  custos: Custo[];
  salvarObra(dados: NovaObra, id?: string): Promise<Obra>;
  excluirObra(id: string): Promise<void>;
  salvarCusto(dados: NovoCusto, id?: string): Promise<Custo>;
  excluirCusto(id: string): Promise<void>;
  exportar(): Promise<Backup>;
  restaurar(backup: Backup): Promise<void>;
}

const Contexto = createContext<Dados | null>(null);

export function DadosProvider({ children, repo }: { children: ReactNode; repo?: Repositorio }) {
  const repositorio = useMemo(() => repo ?? criarRepositorioLocal(), [repo]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [custos, setCustos] = useState<Custo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    try {
      const [o, c] = await Promise.all([repositorio.listarObras(), repositorio.listarCustos()]);
      setObras(o.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
      setCustos(c.sort((a, b) => b.data.localeCompare(a.data) || b.criadoEm.localeCompare(a.criadoEm)));
      setErro(null);
    } catch (e) {
      setErro('Não foi possível abrir os dados deste aparelho. ' + String(e));
    } finally {
      setCarregando(false);
    }
  }, [repositorio]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  const valor: Dados = {
    carregando,
    erro,
    obras,
    custos,
    async salvarObra(d, id) {
      const r = await repositorio.salvarObra(d, id);
      await recarregar();
      return r;
    },
    async excluirObra(id) {
      await repositorio.excluirObra(id);
      await recarregar();
    },
    async salvarCusto(d, id) {
      const r = await repositorio.salvarCusto(d, id);
      await recarregar();
      return r;
    },
    async excluirCusto(id) {
      await repositorio.excluirCusto(id);
      await recarregar();
    },
    exportar: () => repositorio.exportar(),
    async restaurar(b) {
      await repositorio.substituirTudo(b);
      await recarregar();
    },
  };

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useDados(): Dados {
  const c = useContext(Contexto);
  if (!c) throw new Error('useDados fora do DadosProvider');
  return c;
}
