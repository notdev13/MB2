import type { Custo, NovaObra, NovoCusto, Obra } from '../dominio/tipos';
import type { Backup, Repositorio } from './repositorio';

const NOME_BANCO = 'mb2-painel';
const VERSAO = 1;

function abrir(fabrica: IDBFactory): Promise<IDBDatabase> {
  return new Promise((ok, erro) => {
    const req = fabrica.open(NOME_BANCO, VERSAO);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('obras')) db.createObjectStore('obras', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('custos')) {
        const custos = db.createObjectStore('custos', { keyPath: 'id' });
        custos.createIndex('obraId', 'obraId');
      }
    };
    req.onsuccess = () => ok(req.result);
    req.onerror = () => erro(req.error);
  });
}

const pedido = <T>(req: IDBRequest<T>) =>
  new Promise<T>((ok, erro) => {
    req.onsuccess = () => ok(req.result);
    req.onerror = () => erro(req.error);
  });

const concluir = (tx: IDBTransaction) =>
  new Promise<void>((ok, erro) => {
    tx.oncomplete = () => ok();
    tx.onerror = () => erro(tx.error);
    tx.onabort = () => erro(tx.error ?? new Error('Transação cancelada'));
  });

const novoId = () => crypto.randomUUID();

export function criarRepositorioLocal(fabrica: IDBFactory = indexedDB): Repositorio {
  const db = abrir(fabrica);

  async function listar<T>(loja: 'obras' | 'custos'): Promise<T[]> {
    const tx = (await db).transaction(loja, 'readonly');
    return pedido(tx.objectStore(loja).getAll() as IDBRequest<T[]>);
  }

  async function gravar<T extends { id: string; criadoEm: string }, N>(
    loja: 'obras' | 'custos',
    dados: N,
    id?: string,
  ): Promise<T> {
    const tx = (await db).transaction(loja, 'readwrite');
    const store = tx.objectStore(loja);
    const agora = new Date().toISOString();
    const anterior = id ? ((await pedido(store.get(id))) as T | undefined) : undefined;
    const registro = {
      ...dados,
      id: id ?? novoId(),
      criadoEm: anterior?.criadoEm ?? agora,
      atualizadoEm: agora,
    } as unknown as T;
    store.put(registro);
    await concluir(tx);
    return registro;
  }

  return {
    listarObras: () => listar<Obra>('obras'),
    salvarObra: (dados: NovaObra, id?: string) => gravar<Obra, NovaObra>('obras', dados, id),
    async excluirObra(id) {
      const tx = (await db).transaction(['obras', 'custos'], 'readwrite');
      tx.objectStore('obras').delete(id);
      const custos = tx.objectStore('custos');
      const chaves = await pedido(custos.index('obraId').getAllKeys(id));
      for (const k of chaves) custos.delete(k);
      await concluir(tx);
    },

    listarCustos: () => listar<Custo>('custos'),
    salvarCusto: (dados: NovoCusto, id?: string) => gravar<Custo, NovoCusto>('custos', dados, id),
    async excluirCusto(id) {
      const tx = (await db).transaction('custos', 'readwrite');
      tx.objectStore('custos').delete(id);
      await concluir(tx);
    },

    async exportar(): Promise<Backup> {
      const [obras, custos] = await Promise.all([listar<Obra>('obras'), listar<Custo>('custos')]);
      return { app: 'mb2-painel', versao: 1, geradoEm: new Date().toISOString(), obras, custos };
    },
    async substituirTudo(backup) {
      const tx = (await db).transaction(['obras', 'custos'], 'readwrite');
      const obras = tx.objectStore('obras');
      const custos = tx.objectStore('custos');
      obras.clear();
      custos.clear();
      for (const o of backup.obras) obras.put(o);
      for (const c of backup.custos) custos.put(c);
      await concluir(tx);
    },
  };
}
