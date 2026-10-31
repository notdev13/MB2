import type { NovoRegistroDiario, RegistroDiario } from '../dominio/diario';
import type { RepositorioDiario } from './repositorio';

// Diário guardado no aparelho (IndexedDB). Duas lojas: 'registros' (texto e a lista de mídias)
// e 'arquivos' (o Blob de cada foto ou vídeo, pela id da mídia).
const NOME = 'mb2-diario';
const VERSAO = 1;

function abrir(fabrica: IDBFactory): Promise<IDBDatabase> {
  return new Promise((ok, erro) => {
    const req = fabrica.open(NOME, VERSAO);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('registros')) {
        db.createObjectStore('registros', { keyPath: 'id' }).createIndex('obraId', 'obraId');
      }
      if (!db.objectStoreNames.contains('arquivos')) db.createObjectStore('arquivos');
    };
    req.onsuccess = () => ok(req.result);
    req.onerror = () => erro(req.error);
  });
}

const pedido = <T>(req: IDBRequest<T>) =>
  new Promise<T>((ok, erro) => { req.onsuccess = () => ok(req.result); req.onerror = () => erro(req.error); });
const concluir = (tx: IDBTransaction) =>
  new Promise<void>((ok, erro) => {
    tx.oncomplete = () => ok();
    tx.onerror = () => erro(tx.error);
    tx.onabort = () => erro(tx.error ?? new Error('Transação cancelada (o aparelho pode estar sem espaço)'));
  });

export function criarRepositorioDiario(fabrica: IDBFactory = indexedDB): RepositorioDiario {
  let conexao: Promise<IDBDatabase> | null = null;
  const banco = () => {
    if (!conexao) {
      conexao = abrir(fabrica).then((db) => {
        db.onclose = () => { conexao = null; };
        db.onversionchange = () => { db.close(); conexao = null; };
        return db;
      });
      conexao.catch(() => { conexao = null; });
    }
    return conexao;
  };
  async function tx(lojas: string[], modo: IDBTransactionMode) {
    try { return (await banco()).transaction(lojas, modo); } catch (e) {
      if ((e as DOMException).name !== 'InvalidStateError') throw e;
      conexao = null;
      return (await banco()).transaction(lojas, modo);
    }
  }

  return {
    async listar() {
      const t = await tx(['registros'], 'readonly');
      return pedido(t.objectStore('registros').getAll() as IDBRequest<RegistroDiario[]>);
    },
    async salvar(dados: NovoRegistroDiario, arquivosNovos, id) {
      const t = await tx(['registros', 'arquivos'], 'readwrite');
      const regs = t.objectStore('registros');
      const arqs = t.objectStore('arquivos');
      const agora = new Date().toISOString();
      const anterior = id ? ((await pedido(regs.get(id))) as RegistroDiario | undefined) : undefined;
      const manter = new Set(dados.midias.map((m) => m.id));
      for (const m of anterior?.midias ?? []) if (!manter.has(m.id)) arqs.delete(m.id);
      for (const [mid, blob] of Object.entries(arquivosNovos)) if (manter.has(mid)) arqs.put(blob, mid);
      const r: RegistroDiario = { ...dados, id: id ?? crypto.randomUUID(), criadoEm: anterior?.criadoEm ?? agora, atualizadoEm: agora };
      regs.put(r);
      await concluir(t);
      return r;
    },
    async excluir(id) {
      const t = await tx(['registros', 'arquivos'], 'readwrite');
      const r = (await pedido(t.objectStore('registros').get(id))) as RegistroDiario | undefined;
      for (const m of r?.midias ?? []) t.objectStore('arquivos').delete(m.id);
      t.objectStore('registros').delete(id);
      await concluir(t);
    },
    async arquivo(midiaId) {
      const t = await tx(['arquivos'], 'readonly');
      return ((await pedido(t.objectStore('arquivos').get(midiaId))) as Blob | undefined) ?? null;
    },
    async excluirDaObra(obraId) {
      const t = await tx(['registros', 'arquivos'], 'readwrite');
      const regs = t.objectStore('registros');
      for (const r of (await pedido(regs.index('obraId').getAll(obraId))) as RegistroDiario[]) {
        for (const m of r.midias) t.objectStore('arquivos').delete(m.id);
        regs.delete(r.id);
      }
      await concluir(t);
    },
  };
}

// Pede ao navegador para não apagar estes dados quando faltar espaço (no iPhone, vale mais com o
// painel instalado na Tela de Início). Devolve uso e cota estimados, quando o navegador informa.
export async function protegerArmazenamento(): Promise<{ persistente: boolean; usado: number | null; cota: number | null }> {
  const s = typeof navigator !== 'undefined' ? navigator.storage : undefined;
  let persistente = false;
  try { persistente = (await s?.persisted?.()) || (await s?.persist?.()) || false; } catch { /* sem suporte */ }
  try {
    const e = await s?.estimate?.();
    return { persistente, usado: e?.usage ?? null, cota: e?.quota ?? null };
  } catch { return { persistente, usado: null, cota: null }; }
}
