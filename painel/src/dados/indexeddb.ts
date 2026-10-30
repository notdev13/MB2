import type { Conta, Custo, NovaConta, NovaObra, NovoCusto, NovoSaldo, Obra, SaldoConta } from '../dominio/tipos';
import { contaValida, custoValido, obraValida, saldoValido } from './backup';
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
      // Versão 3: dinheiro em conta (contas e saldos; sincronizam pela mesma fila).
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
// Registros da nuvem que chegaram antes do que dependem (saldo antes da conta, conta antes da obra).
// Cada um com o instante em que foi adiado. Limites: 30 dias e 200 itens (os mais antigos saem).
// PENDENTE (depende do PR #39, login): limpar os adiados também em Sair / "Outra conta".
const CHAVE_ADIADOS = 'nuvem-adiados';
const VALIDADE_ADIADO_MS = 30 * 86_400_000;
const TETO_ADIADOS = 200;
// Ids de obras e contas que ESTE aparelho já viu excluídas: o que chegar dependendo delas não é adiado.
const CHAVE_EXCLUIDOS = 'nuvem-donos-excluidos';
const TETO_EXCLUIDOS = 500;
interface Adiado { r: RegistroNuvem; em: number }

// Guarda (e poda por idade e tamanho) os ids de obra/conta excluídos que este aparelho já viu.
async function lembrarExcluidos(tx: IDBTransaction, ids: string[], agoraMs: number) {
  if (!ids.length) return;
  const meta = tx.objectStore('meta');
  const mapa = ((await pedido(meta.get(CHAVE_EXCLUIDOS))) as Record<string, number> | undefined) ?? {};
  for (const id of ids) mapa[id] = agoraMs;
  const mantidos = Object.entries(mapa)
    .filter(([, em]) => agoraMs - em <= VALIDADE_ADIADO_MS)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TETO_EXCLUIDOS);
  meta.put(Object.fromEntries(mantidos), CHAVE_EXCLUIDOS);
}
type Loja = 'obras' | 'custos' | 'copias' | 'pendentes' | 'meta' | 'contas' | 'saldos';
type LojaDados = 'obras' | 'custos' | 'contas' | 'saldos';

const LOJA: Record<TipoRegistro, LojaDados> = { obra: 'obras', custo: 'custos', conta: 'contas', saldo: 'saldos' };
// Ordem de aplicação do que vem da nuvem: quem depende de outro vem depois dele.
const ORDEM: Record<TipoRegistro, number> = { obra: 0, custo: 1, conta: 2, saldo: 3 };
const chavePendente = (tipo: TipoRegistro, id: string) => `${tipo}:${id}`;
const depois = (a: string, b: string) => Date.parse(a) > Date.parse(b);

function enfileirar(tx: IDBTransaction, tipo: TipoRegistro, id: string, excluido: boolean, alteradoEm: string) {
  const p: Pendente = { tipo, id, excluido, alteradoEm };
  tx.objectStore('pendentes').put(p, chavePendente(tipo, id));
}

export type RepositorioLocal = Repositorio & FilaLocal;

export function criarRepositorioLocal(fabrica: IDBFactory = indexedDB, relogio: () => number = Date.now): RepositorioLocal {
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
      const tx = await transacao(['obras', 'custos', 'pendentes', 'contas', 'saldos', 'meta'], 'readwrite');
      const agora = new Date(relogio()).toISOString();
      tx.objectStore('obras').delete(id);
      // a conta da SPE vai junto com a obra
      const contasSaidas = await removerContasSemObra(tx, (obraId) => obraId !== id, agora);
      await lembrarExcluidos(tx, [id, ...contasSaidas], relogio());
      enfileirar(tx, 'obra', id, true, agora);
      const custos = tx.objectStore('custos');
      const chaves = await pedido(custos.index('obraId').getAllKeys(id));
      for (const k of chaves) {
        custos.delete(k);
        enfileirar(tx, 'custo', String(k), true, agora);
      }
      await concluir(tx);
    },

    listarContas: () => listar<Conta>('contas'),
    async salvarConta(dados: NovaConta, id?: string) {
      const tx = await transacao(['contas', 'pendentes'], 'readwrite');
      const store = tx.objectStore('contas');
      const agora = new Date().toISOString();
      const anterior = id ? ((await pedido(store.get(id))) as Conta | undefined) : undefined;
      const conta: Conta = { ...dados, id: id ?? novoId(), criadoEm: anterior?.criadoEm ?? agora, atualizadoEm: agora };
      store.put(conta);
      enfileirar(tx, 'conta', conta.id, false, agora);
      await concluir(tx);
      return conta;
    },
    async excluirConta(id) {
      const tx = await transacao(['contas', 'saldos', 'pendentes', 'meta'], 'readwrite');
      tx.objectStore('contas').delete(id);
      await lembrarExcluidos(tx, [id], relogio());
      const agora = new Date(relogio()).toISOString();
      enfileirar(tx, 'conta', id, true, agora);
      const saldos = tx.objectStore('saldos');
      for (const k of await pedido(saldos.index('contaId').getAllKeys(id))) {
        saldos.delete(k);
        enfileirar(tx, 'saldo', String(k), true, agora);
      }
      await concluir(tx);
    },
    listarSaldos: () => listar<SaldoConta>('saldos'),
    async salvarSaldo(dados: NovoSaldo) {
      const tx = await transacao(['saldos', 'pendentes'], 'readwrite');
      const saldo: SaldoConta = { ...dados, id: novoId(), criadoEm: new Date().toISOString() };
      tx.objectStore('saldos').add(saldo); // add: nunca sobrescreve uma linha existente
      enfileirar(tx, 'saldo', saldo.id, false, saldo.criadoEm); // saldo não é editado: a data de criação é a da mudança
      await concluir(tx);
      return saldo;
    },
    async excluirSaldo(id) {
      const tx = await transacao(['saldos', 'pendentes'], 'readwrite');
      tx.objectStore('saldos').delete(id);
      enfileirar(tx, 'saldo', id, true, new Date().toISOString());
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
        listar<Obra>('obras'), listar<Custo>('custos'), listar<Conta>('contas'), listar<SaldoConta>('saldos'),
      ]);
      return { app: 'mb2-painel', versao: 2, geradoEm: new Date().toISOString(), obras, custos, contas, saldos };
    },
    async substituirTudo(backup, opcoes) {
      // Guarda o que está no aparelho antes de apagar, na mesma transação.
      const atual = opcoes?.semCopia ? null : await this.exportar();
      const tx = await transacao(['obras', 'custos', 'copias', 'pendentes', 'contas', 'saldos', 'meta'], 'readwrite');
      if (atual) tx.objectStore('copias').put(atual, CHAVE_COPIA);
      await gravarTudo(tx, backup, relogio());
      await concluir(tx);
    },
    async copiaAnterior() {
      const tx = await transacao('copias', 'readonly');
      return ((await pedido(tx.objectStore('copias').get(CHAVE_COPIA))) as Backup | undefined) ?? null;
    },
    async desfazerRestauracao() {
      const copia = await this.copiaAnterior();
      if (!copia) return;
      const tx = await transacao(['obras', 'custos', 'copias', 'pendentes', 'contas', 'saldos', 'meta'], 'readwrite');
      await gravarTudo(tx, copia, relogio());
      tx.objectStore('copias').delete(CHAVE_COPIA);
      await concluir(tx);
    },

    async pendentes() {
      const tx = await transacao('pendentes', 'readonly');
      return pedido(tx.objectStore('pendentes').getAll() as IDBRequest<Pendente[]>);
    },
    async paraEnviar(pendentes) {
      const tx = await transacao(['obras', 'custos', 'contas', 'saldos'], 'readonly');
      return Promise.all(pendentes.map(async (p): Promise<RegistroNuvem> => {
        const dados = p.excluido
          ? undefined
          : ((await pedido(tx.objectStore(LOJA[p.tipo]).get(p.id))) as Obra | Custo | Conta | SaldoConta | undefined);
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
      const tx = await transacao(['obras', 'custos', 'contas', 'saldos', 'pendentes', 'meta'], 'readwrite');
      const fila = tx.objectStore('pendentes');
      const meta = tx.objectStore('meta');
      const agoraMs = relogio();
      // Junta o que ficou esperando de rodadas anteriores (se ainda valem) com o que chegou agora.
      const adiados = (((await pedido(meta.get(CHAVE_ADIADOS))) as Adiado[] | undefined) ?? [])
        .filter((a) => agoraMs - a.em <= VALIDADE_ADIADO_MS);
      const porChave = new Map<string, Adiado>();
      for (const a of adiados) porChave.set(chavePendente(a.r.tipo, a.r.id), a);
      for (const r of registros) {
        if (!r || !Object.hasOwn(ORDEM, r.tipo) || typeof r.id !== 'string') continue; // tipo desconhecido: ignora
        const k = chavePendente(r.tipo, r.id);
        const velho = porChave.get(k);
        if (!velho || !depois(velho.r.alteradoEm, r.alteradoEm)) porChave.set(k, { r, em: agoraMs });
      }
      // Obras e custos, depois contas, depois saldos: nada fica sem o dono por ordem de chegada.
      const lista = [...porChave.values()].sort((x, y) => ORDEM[x.r.tipo] - ORDEM[y.r.tipo]);
      // Donos (obra ou conta) já excluídos: os que este aparelho já viu e os que chegam neste lote.
      const excluidosAntes = (await pedido(meta.get(CHAVE_EXCLUIDOS))) as Record<string, number> | undefined;
      const donosExcluidos = new Set(Object.keys(excluidosAntes ?? {}));
      const excluidosAgora: string[] = [];
      const esperando: Adiado[] = [];
      let obraSaiu = false;
      let mudou = 0;
      for (const { r, em } of lista) {
        const chave = chavePendente(r.tipo, r.id);
        const local = (await pedido(fila.get(chave))) as Pendente | undefined;
        if (local && depois(local.alteradoEm, r.alteradoEm)) continue; // a mudança daqui é mais nova
        const loja = tx.objectStore(LOJA[r.tipo]);
        const atual = await pedido(loja.get(r.id));
        if (r.excluido || !r.dados) {
          if (local) fila.delete(chave);
          if (atual) { loja.delete(r.id); mudou++; }
          if (r.tipo === 'obra') obraSaiu = true;
          if (r.tipo === 'obra' || r.tipo === 'conta') { donosExcluidos.add(r.id); excluidosAgora.push(r.id); }
          if (r.tipo === 'conta') {
            const saldos = tx.objectStore('saldos');
            for (const k of await pedido(saldos.index('contaId').getAllKeys(r.id))) {
              saldos.delete(k); // saldo não existe sem a conta
              fila.delete(chavePendente('saldo', String(k)));
              mudou++;
            }
          }
          continue;
        }
        // Registro estranho (não passa na validação do backup): ignora, sem tocar no que existe aqui.
        const d = r.dados as unknown as Record<string, unknown>;
        const valido =
          r.tipo === 'obra' ? obraValida(d)
          : r.tipo === 'custo' ? custoValido(d)
          : r.tipo === 'conta' ? contaValida(d)
          : saldoValido(d);
        if (!valido || d.id !== r.id) continue;
        // Falta o dono (obra da conta, conta do saldo)? Espera por ele, a não ser que ele já tenha sido excluído.
        const dono =
          r.tipo === 'conta' && d.obraId !== null ? { loja: 'obras', id: d.obraId as string }
          : r.tipo === 'saldo' ? { loja: 'contas', id: d.contaId as string }
          : null;
        if (dono && !(await pedido(tx.objectStore(dono.loja).getKey(dono.id)))) {
          if (!donosExcluidos.has(dono.id)) esperando.push({ r, em });
          continue;
        }
        if (local) fila.delete(chave);
        if (JSON.stringify(atual) !== JSON.stringify(r.dados)) { loja.put(r.dados); mudou++; }
      }
      // Obra excluída em outro aparelho: a conta dela (e os saldos) não ficam soltas aqui.
      if (obraSaiu) {
        const existentes = new Set((await pedido(tx.objectStore('obras').getAllKeys())).map(String));
        const saidas = await removerContasSemObra(tx, (id) => existentes.has(id), new Date(agoraMs).toISOString());
        excluidosAgora.push(...saidas);
      }
      await lembrarExcluidos(tx, excluidosAgora, agoraMs);
      const mantidos = esperando.sort((x, y) => x.em - y.em).slice(-TETO_ADIADOS); // os mais antigos saem
      if (mantidos.length) meta.put(mantidos, CHAVE_ADIADOS);
      else meta.delete(CHAVE_ADIADOS);
      await concluir(tx);
      return mudou;
    },
    async enfileirarTudo() {
      const tx = await transacao(['obras', 'custos', 'contas', 'saldos', 'pendentes'], 'readwrite');
      const fila = tx.objectStore('pendentes');
      const [obras, custos, contas, saldos] = await Promise.all([
        pedido(tx.objectStore('obras').getAll() as IDBRequest<Obra[]>),
        pedido(tx.objectStore('custos').getAll() as IDBRequest<Custo[]>),
        pedido(tx.objectStore('contas').getAll() as IDBRequest<Conta[]>),
        pedido(tx.objectStore('saldos').getAll() as IDBRequest<SaldoConta[]>),
      ]);
      const ja = new Set((await pedido(fila.getAllKeys())).map(String));
      // Usa a data da última edição: se a nuvem tiver algo mais novo, ela vence.
      for (const o of obras) if (!ja.has(chavePendente('obra', o.id))) enfileirar(tx, 'obra', o.id, false, o.atualizadoEm);
      for (const c of custos) if (!ja.has(chavePendente('custo', c.id))) enfileirar(tx, 'custo', c.id, false, c.atualizadoEm);
      for (const c of contas) if (!ja.has(chavePendente('conta', c.id))) enfileirar(tx, 'conta', c.id, false, c.atualizadoEm);
      for (const s of saldos) if (!ja.has(chavePendente('saldo', s.id))) enfileirar(tx, 'saldo', s.id, false, s.criadoEm);
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

// Apaga (e põe a exclusão na fila) as contas e os saldos delas de obras que não existem mais: conta sem obra não passaria na
// validação do backup e entraria nos totais sem dono.
async function removerContasSemObra(tx: IDBTransaction, obraExiste: (obraId: string) => boolean, agora: string): Promise<string[]> {
  const removidas: string[] = [];
  const contas = tx.objectStore('contas');
  const saldos = tx.objectStore('saldos');
  for (const c of (await pedido(contas.getAll())) as Conta[]) {
    if (c.obraId === null || obraExiste(c.obraId)) continue;
    contas.delete(c.id);
    removidas.push(c.id);
    enfileirar(tx, 'conta', c.id, true, agora);
    for (const k of await pedido(saldos.index('contaId').getAllKeys(c.id))) {
      saldos.delete(k);
      enfileirar(tx, 'saldo', String(k), true, agora);
    }
  }
  return removidas;
}

// Troca tudo pelo backup e põe a troca na fila da nuvem: o que entrou e o que saiu.
async function gravarTudo(tx: IDBTransaction, backup: Backup, agoraMs: number) {
  const obras = tx.objectStore('obras');
  const custos = tx.objectStore('custos');
  const agora = new Date(agoraMs).toISOString();
  tx.objectStore('meta').delete(CHAVE_ADIADOS); // o que esperava por um dono não vale mais depois da troca
  const [idsObras, idsCustos] = await Promise.all([pedido(obras.getAllKeys()), pedido(custos.getAllKeys())]);
  const novasObras = new Set(backup.obras.map((o) => o.id));
  const novosCustos = new Set(backup.custos.map((c) => c.id));
  for (const k of idsObras) if (!novasObras.has(String(k))) enfileirar(tx, 'obra', String(k), true, agora);
  for (const k of idsCustos) if (!novosCustos.has(String(k))) enfileirar(tx, 'custo', String(k), true, agora);
  obras.clear();
  custos.clear();
  for (const o of backup.obras) { obras.put(o); enfileirar(tx, 'obra', o.id, false, agora); }
  for (const c of backup.custos) { custos.put(c); enfileirar(tx, 'custo', c.id, false, agora); }
  // Backup versão 1 não conhece contas e saldos: os do aparelho ficam, menos os de obra que sumiu.
  await lembrarExcluidos(tx, idsObras.map(String).filter((k) => !novasObras.has(k)), agoraMs);
  if (backup.versao === 1) await lembrarExcluidos(tx, await removerContasSemObra(tx, (obraId) => novasObras.has(obraId), agora), agoraMs);
  if (backup.versao === 2) {
    const contas = tx.objectStore('contas');
    const saldos = tx.objectStore('saldos');
    const [idsContas, idsSaldos] = await Promise.all([pedido(contas.getAllKeys()), pedido(saldos.getAllKeys())]);
    const novasContas = new Set((backup.contas ?? []).map((c) => c.id));
    const novosSaldos = new Set((backup.saldos ?? []).map((s) => s.id));
    for (const k of idsContas) if (!novasContas.has(String(k))) enfileirar(tx, 'conta', String(k), true, agora);
    await lembrarExcluidos(tx, idsContas.map(String).filter((k) => !novasContas.has(k)), agoraMs);
    for (const k of idsSaldos) if (!novosSaldos.has(String(k))) enfileirar(tx, 'saldo', String(k), true, agora);
    contas.clear();
    saldos.clear();
    for (const c of backup.contas ?? []) { contas.put(c); enfileirar(tx, 'conta', c.id, false, agora); }
    for (const s of backup.saldos ?? []) { saldos.put(s); enfileirar(tx, 'saldo', s.id, false, agora); }
  }
}
