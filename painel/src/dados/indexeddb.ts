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
      // Cópia do que havia antes da última restauração de backup (para desfazer).
      if (!db.objectStoreNames.contains('copias')) db.createObjectStore('copias');
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

const CHAVE_COPIA = 'antes-da-restauracao';
type Loja = 'obras' | 'custos' | 'copias';

export function criarRepositorioLocal(fabrica: IDBFactory = indexedDB): Repositorio {
  // O iOS às vezes derruba a conexão com o banco quando o app fica em segundo plano.
  // Nesse caso a conexão é reaberta e a operação tentada mais uma vez.
  let conexao: Promise<IDBDatabase> | null = null;
  function banco(): Promise<IDBDatabase> {
    if (!conexao) {
      conexao = abrir(fabrica).then((db) => {
        db.onclose = () => { conexao = null; };
        db.onversionchange = () => { db.close(); conexao = null; };
        return db;
      });
      conexao.catch(() => { conexao = null; });
    }
    return conexao;
  }
  async function transacao(lojas: Loja | Loja[], modo: IDBTransactionMode): Promise<IDBTransaction> {
    try {
      return (await banco()).transaction(lojas, modo);
    } catch (e) {
      if ((e as DOMException).name !== 'InvalidStateError') throw e;
      conexao = null;
      return (await banco()).transaction(lojas, modo);
    }
  }

  async function listar<T>(loja: 'obras' | 'custos'): Promise<T[]> {
    const tx = await transacao(loja, 'readonly');
    return pedido(tx.objectStore(loja).getAll() as IDBRequest<T[]>);
  }

  async function gravar<T extends { id: string; criadoEm: string }, N>(
    loja: 'obras' | 'custos',
    dados: N,
    id?: string,
  ): Promise<T> {
    const tx = await transacao(loja, 'readwrite');
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
      const tx = await transacao(['obras', 'custos'], 'readwrite');
      tx.objectStore('obras').delete(id);
      const custos = tx.objectStore('custos');
      const chaves = await pedido(custos.index('obraId').getAllKeys(id));
      for (const k of chaves) custos.delete(k);
      await concluir(tx);
    },

    listarCustos: () => listar<Custo>('custos'),
    salvarCusto: (dados: NovoCusto, id?: string) => gravar<Custo, NovoCusto>('custos', dados, id),
    async excluirCusto(id) {
      const tx = await transacao('custos', 'readwrite');
      tx.objectStore('custos').delete(id);
      await concluir(tx);
    },

    async exportar(): Promise<Backup> {
      const [obras, custos] = await Promise.all([listar<Obra>('obras'), listar<Custo>('custos')]);
      return { app: 'mb2-painel', versao: 1, geradoEm: new Date().toISOString(), obras, custos };
    },
    async substituirTudo(backup) {
      // Guarda o que está no aparelho antes de apagar, na mesma transação.
      const atual = await this.exportar();
      const tx = await transacao(['obras', 'custos', 'copias'], 'readwrite');
      tx.objectStore('copias').put(atual, CHAVE_COPIA);
      gravarTudo(tx, backup);
      await concluir(tx);
    },
    async copiaAnterior() {
      const tx = await transacao('copias', 'readonly');
      return ((await pedido(tx.objectStore('copias').get(CHAVE_COPIA))) as Backup | undefined) ?? null;
    },
    async desfazerRestauracao() {
      const copia = await this.copiaAnterior();
      if (!copia) return;
      const tx = await transacao(['obras', 'custos', 'copias'], 'readwrite');
      gravarTudo(tx, copia);
      tx.objectStore('copias').delete(CHAVE_COPIA);
      await concluir(tx);
    },
  };
}

function gravarTudo(tx: IDBTransaction, backup: Backup) {
  const obras = tx.objectStore('obras');
  const custos = tx.objectStore('custos');
  obras.clear();
  custos.clear();
  for (const o of backup.obras) obras.put(o);
  for (const c of backup.custos) custos.put(c);
}
