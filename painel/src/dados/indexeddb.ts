import type { Conta, Custo, NovaConta, NovaObra, NovoCusto, NovoSaldo, Obra, SaldoConta } from '../dominio/tipos';
import { custoValido, obraValida } from './backup';
import type { Backup, FilaLocal, Pendente, RegistroNuvem, Repositorio, TipoRegistro } from './repositorio';

const NOME_BANCO = 'mb2-painel';
const VERSAO = 3;

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
      // Versão 2: fila de mudanças a enviar para a nuvem e marcas da sincronização.
      if (!db.objectStoreNames.contains('pendentes')) db.createObjectStore('pendentes');
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
      // Versão 3: dinheiro em conta (só no aparelho por enquanto, fora da fila da nuvem).
      if (!db.objectStoreNames.contains('contas')) db.createObjectStore('contas', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('saldos')) {
        const saldos = db.createObjectStore('saldos', { keyPath: 'id' });
        saldos.createIndex('contaId', 'contaId');
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

const CHAVE_COPIA = 'antes-da-restauracao';
const CHAVE_MARCA = 'nuvem-buscado-ate';
type Loja = 'obras' | 'custos' | 'copias' | 'pendentes' | 'meta' | 'contas' | 'saldos';
type LojaDados = 'obras' | 'custos';

const LOJA: Record<TipoRegistro, LojaDados> = { obra: 'obras', custo: 'custos' };
const chavePendente = (tipo: TipoRegistro, id: string) => `${tipo}:${id}`;
const depois = (a: string, b: string) => Date.parse(a) > Date.parse(b);

function enfileirar(tx: IDBTransaction, tipo: TipoRegistro, id: string, excluido: boolean, alteradoEm: string) {
  const p: Pendente = { tipo, id, excluido, alteradoEm };
  tx.objectStore('pendentes').put(p, chavePendente(tipo, id));
}

export type RepositorioLocal = Repositorio & FilaLocal;

export function criarRepositorioLocal(fabrica: IDBFactory = indexedDB): RepositorioLocal {
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

  async function listar<T>(loja: LojaDados): Promise<T[]> {
    const tx = await transacao(loja, 'readonly');
    return pedido(tx.objectStore(loja).getAll() as IDBRequest<T[]>);
  }

  async function listarLoja<T>(loja: 'contas' | 'saldos'): Promise<T[]> {
    const tx = await transacao(loja, 'readonly');
    return pedido(tx.objectStore(loja).getAll() as IDBRequest<T[]>);
  }

  async function gravar<T extends { id: string; criadoEm: string }, N>(
    loja: LojaDados,
    dados: N,
    id?: string,
  ): Promise<T> {
    const tx = await transacao([loja, 'pendentes'], 'readwrite');
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
    enfileirar(tx, loja === 'obras' ? 'obra' : 'custo', registro.id, false, agora);
    await concluir(tx);
    return registro;
  }

  return {
    listarObras: () => listar<Obra>('obras'),
    salvarObra: (dados: NovaObra, id?: string) => gravar<Obra, NovaObra>('obras', dados, id),
    async excluirObra(id) {
      const tx = await transacao(['obras', 'custos', 'pendentes'], 'readwrite');
      const agora = new Date().toISOString();
      tx.objectStore('obras').delete(id);
      enfileirar(tx, 'obra', id, true, agora);
      const custos = tx.objectStore('custos');
      const chaves = await pedido(custos.index('obraId').getAllKeys(id));
      for (const k of chaves) {
        custos.delete(k);
        enfileirar(tx, 'custo', String(k), true, agora);
      }
      await concluir(tx);
    },

    listarContas: () => listarLoja<Conta>('contas'),
    async salvarConta(dados: NovaConta, id?: string) {
      const tx = await transacao('contas', 'readwrite');
      const store = tx.objectStore('contas');
      const agora = new Date().toISOString();
      const anterior = id ? ((await pedido(store.get(id))) as Conta | undefined) : undefined;
      const conta: Conta = { ...dados, id: id ?? novoId(), criadoEm: anterior?.criadoEm ?? agora, atualizadoEm: agora };
      store.put(conta);
      await concluir(tx);
      return conta;
    },
    async excluirConta(id) {
      const tx = await transacao(['contas', 'saldos'], 'readwrite');
      tx.objectStore('contas').delete(id);
      const saldos = tx.objectStore('saldos');
      for (const k of await pedido(saldos.index('contaId').getAllKeys(id))) saldos.delete(k);
      await concluir(tx);
    },
    listarSaldos: () => listarLoja<SaldoConta>('saldos'),
    async salvarSaldo(dados: NovoSaldo) {
      const tx = await transacao('saldos', 'readwrite');
      const saldo: SaldoConta = { ...dados, id: novoId(), criadoEm: new Date().toISOString() };
      tx.objectStore('saldos').add(saldo); // add: nunca sobrescreve uma linha existente
      await concluir(tx);
      return saldo;
    },
    async excluirSaldo(id) {
      const tx = await transacao('saldos', 'readwrite');
      tx.objectStore('saldos').delete(id);
      await concluir(tx);
    },

    listarCustos: () => listar<Custo>('custos'),
    salvarCusto: (dados: NovoCusto, id?: string) => gravar<Custo, NovoCusto>('custos', dados, id),
    async excluirCusto(id) {
      const tx = await transacao(['custos', 'pendentes'], 'readwrite');
      tx.objectStore('custos').delete(id);
      enfileirar(tx, 'custo', id, true, new Date().toISOString());
      await concluir(tx);
    },

    async exportar(): Promise<Backup> {
      const [obras, custos, contas, saldos] = await Promise.all([
        listar<Obra>('obras'), listar<Custo>('custos'), listarLoja<Conta>('contas'), listarLoja<SaldoConta>('saldos'),
      ]);
      return { app: 'mb2-painel', versao: 2, geradoEm: new Date().toISOString(), obras, custos, contas, saldos };
    },
    async substituirTudo(backup, opcoes) {
      // Guarda o que está no aparelho antes de apagar, na mesma transação.
      const atual = opcoes?.semCopia ? null : await this.exportar();
      const tx = await transacao(['obras', 'custos', 'copias', 'pendentes', 'contas', 'saldos'], 'readwrite');
      if (atual) tx.objectStore('copias').put(atual, CHAVE_COPIA);
      await gravarTudo(tx, backup);
      await concluir(tx);
    },
    async copiaAnterior() {
      const tx = await transacao('copias', 'readonly');
      return ((await pedido(tx.objectStore('copias').get(CHAVE_COPIA))) as Backup | undefined) ?? null;
    },
    async desfazerRestauracao() {
      const copia = await this.copiaAnterior();
      if (!copia) return;
      const tx = await transacao(['obras', 'custos', 'copias', 'pendentes', 'contas', 'saldos'], 'readwrite');
      await gravarTudo(tx, copia);
      tx.objectStore('copias').delete(CHAVE_COPIA);
      await concluir(tx);
    },

    async pendentes() {
      const tx = await transacao('pendentes', 'readonly');
      return pedido(tx.objectStore('pendentes').getAll() as IDBRequest<Pendente[]>);
    },
    async paraEnviar(pendentes) {
      const tx = await transacao(['obras', 'custos'], 'readonly');
      return Promise.all(pendentes.map(async (p): Promise<RegistroNuvem> => {
        const dados = p.excluido
          ? undefined
          : ((await pedido(tx.objectStore(LOJA[p.tipo]).get(p.id))) as Obra | Custo | undefined);
        return { tipo: p.tipo, id: p.id, dados: dados ?? null, excluido: !dados, alteradoEm: p.alteradoEm };
      }));
    },
    async confirmarEnvio(enviados) {
      const tx = await transacao('pendentes', 'readwrite');
      const fila = tx.objectStore('pendentes');
      for (const e of enviados) {
        const chave = chavePendente(e.tipo, e.id);
        const atual = (await pedido(fila.get(chave))) as Pendente | undefined;
        if (atual && atual.alteradoEm === e.alteradoEm) fila.delete(chave);
      }
      await concluir(tx);
    },
    async aplicarDaNuvem(registros) {
      const tx = await transacao(['obras', 'custos', 'pendentes'], 'readwrite');
      const fila = tx.objectStore('pendentes');
      let mudou = 0;
      for (const r of registros) {
        const chave = chavePendente(r.tipo, r.id);
        const local = (await pedido(fila.get(chave))) as Pendente | undefined;
        if (local && depois(local.alteradoEm, r.alteradoEm)) continue; // a mudança daqui é mais nova
        if (local) fila.delete(chave);
        const loja = tx.objectStore(LOJA[r.tipo]);
        const atual = await pedido(loja.get(r.id));
        if (r.excluido || !r.dados) {
          if (atual) { loja.delete(r.id); mudou++; }
          continue;
        }
        const valido = r.tipo === 'obra' ? obraValida(r.dados as never) : custoValido(r.dados as never);
        if (!valido || r.dados.id !== r.id) continue; // registro estranho: ignora
        if (JSON.stringify(atual) !== JSON.stringify(r.dados)) { loja.put(r.dados); mudou++; }
      }
      await concluir(tx);
      return mudou;
    },
    async enfileirarTudo() {
      const tx = await transacao(['obras', 'custos', 'pendentes'], 'readwrite');
      const fila = tx.objectStore('pendentes');
      const [obras, custos] = await Promise.all([
        pedido(tx.objectStore('obras').getAll() as IDBRequest<Obra[]>),
        pedido(tx.objectStore('custos').getAll() as IDBRequest<Custo[]>),
      ]);
      const ja = new Set((await pedido(fila.getAllKeys())).map(String));
      // Usa a data da última edição: se a nuvem tiver algo mais novo, ela vence.
      for (const o of obras) if (!ja.has(chavePendente('obra', o.id))) enfileirar(tx, 'obra', o.id, false, o.atualizadoEm);
      for (const c of custos) if (!ja.has(chavePendente('custo', c.id))) enfileirar(tx, 'custo', c.id, false, c.atualizadoEm);
      await concluir(tx);
    },
    async lerMarca() {
      const tx = await transacao('meta', 'readonly');
      return ((await pedido(tx.objectStore('meta').get(CHAVE_MARCA))) as string | undefined) ?? null;
    },
    async gravarMarca(marca) {
      const tx = await transacao('meta', 'readwrite');
      if (marca === null) tx.objectStore('meta').delete(CHAVE_MARCA);
      else tx.objectStore('meta').put(marca, CHAVE_MARCA);
      await concluir(tx);
    },
  };
}

// Troca tudo pelo backup e põe a troca na fila da nuvem: o que entrou e o que saiu.
async function gravarTudo(tx: IDBTransaction, backup: Backup) {
  const obras = tx.objectStore('obras');
  const custos = tx.objectStore('custos');
  const agora = new Date().toISOString();
  const [idsObras, idsCustos] = await Promise.all([pedido(obras.getAllKeys()), pedido(custos.getAllKeys())]);
  const novasObras = new Set(backup.obras.map((o) => o.id));
  const novosCustos = new Set(backup.custos.map((c) => c.id));
  for (const k of idsObras) if (!novasObras.has(String(k))) enfileirar(tx, 'obra', String(k), true, agora);
  for (const k of idsCustos) if (!novosCustos.has(String(k))) enfileirar(tx, 'custo', String(k), true, agora);
  obras.clear();
  custos.clear();
  for (const o of backup.obras) { obras.put(o); enfileirar(tx, 'obra', o.id, false, agora); }
  for (const c of backup.custos) { custos.put(c); enfileirar(tx, 'custo', c.id, false, agora); }
  // Backup versão 1 não conhece contas e saldos: os do aparelho ficam como estão.
  if (backup.versao === 2) {
    const contas = tx.objectStore('contas');
    const saldos = tx.objectStore('saldos');
    contas.clear();
    saldos.clear();
    for (const c of backup.contas ?? []) contas.put(c);
    for (const s of backup.saldos ?? []) saldos.put(s);
  }
}
