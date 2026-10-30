import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Conta, Custo, NovaConta, NovaObra, NovoCusto, NovoSaldo, Obra, SaldoConta } from '../dominio/tipos';
import { validarBackup } from './backup';
import { criarRepositorioLocal, type RepositorioLocal } from './indexeddb';
import { ErroNuvem, nuvemDoBuild, type Nuvem } from './nuvem';
import type { Backup, Repositorio } from './repositorio';
import { sincronizar } from './sincronizacao';
import { gravarUltima, lerUltima, limparUltima } from './ultimaSincronizacao';

export interface EstadoNuvem {
  configurada: boolean; // o painel foi publicado com o endereço do banco na nuvem
  email: string | null; // quem entrou neste aparelho
  sincronizando: boolean;
  ultimaVez: string | null; // ISO da última sincronização completa
  pendentes: number; // mudanças daqui que ainda não subiram
  erro: string | null;
  entrar(email: string, senha: string): Promise<void>;
  sair(): Promise<void>;
  sincronizarAgora(): Promise<void>;
}

interface Dados {
  carregando: boolean;
  erro: string | null;
  obras: Obra[];
  custos: Custo[];
  contas: Conta[];
  saldos: SaldoConta[];
  salvarObra(dados: NovaObra, id?: string): Promise<Obra>;
  excluirObra(id: string): Promise<void>;
  salvarCusto(dados: NovoCusto, id?: string): Promise<Custo>;
  excluirCusto(id: string): Promise<void>;
  // Contas e saldos sincronizam com a nuvem como obras e custos (docs/nuvem.md).
  salvarConta(dados: NovaConta, id?: string): Promise<Conta>;
  salvarSaldo(dados: NovoSaldo): Promise<SaldoConta>;
  excluirSaldo(id: string): Promise<void>;
  exportar(): Promise<Backup>;
  restaurar(backup: Backup): Promise<void>;
  copiaAnterior(): Promise<Backup | null>;
  desfazerRestauracao(): Promise<void>;
  nuvem: EstadoNuvem;
}

const Contexto = createContext<Dados | null>(null);

const INTERVALO_MS = 60_000;
const ESPERA_APOS_MUDANCA_MS = 1500;

export function DadosProvider({ children, repo, nuvem: nuvemDada }: {
  children: ReactNode;
  repo?: RepositorioLocal;
  nuvem?: Nuvem | null;
}) {
  const repositorio = useMemo(() => repo ?? criarRepositorioLocal(), [repo]);
  const nuvem = useMemo(() => {
    if (nuvemDada !== undefined) return nuvemDada;
    return nuvemDoBuild();
  }, [nuvemDada]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [custos, setCustos] = useState<Custo[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [saldos, setSaldos] = useState<SaldoConta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    try {
      const [o, c, ct, sd] = await Promise.all([
        repositorio.listarObras(), repositorio.listarCustos(), repositorio.listarContas(), repositorio.listarSaldos(),
      ]);
      setContas(ct);
      setSaldos(sd);
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
    semear(repositorio).finally(recarregar);
  }, [repositorio, recarregar]);

  // ---- Nuvem ----
  const [email, setEmail] = useState(() => nuvem?.email() ?? null);
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimaVez, setUltimaVez] = useState(() => lerUltima());
  const [pendentes, setPendentes] = useState(0);
  const [erroNuvem, setErroNuvem] = useState<string | null>(null);
  const rodando = useRef<Promise<void> | null>(null);
  const deNovo = useRef(false);
  const agendado = useRef<ReturnType<typeof setTimeout> | null>(null);

  const contarPendentes = useCallback(
    () => repositorio.pendentes().then((p) => setPendentes(p.length), () => {}),
    [repositorio],
  );

  const rodar = useCallback(async (): Promise<void> => {
    if (!nuvem || !nuvem.email()) return contarPendentes();
    if (rodando.current) { deNovo.current = true; return rodando.current; }
    const vez = (async () => {
      setSincronizando(true);
      try {
        do {
          deNovo.current = false;
          const r = await sincronizar(repositorio, nuvem);
          if (r.recebidos) await recarregar();
        } while (deNovo.current);
        const agora = new Date().toISOString();
        gravarUltima(agora);
        setUltimaVez(agora);
        setErroNuvem(null);
      } catch (e) {
        setErroNuvem(e instanceof ErroNuvem ? e.message : 'Não foi possível sincronizar: ' + String(e));
      } finally {
        setEmail(nuvem.email());
        setSincronizando(false);
        rodando.current = null;
        await contarPendentes();
      }
    })();
    rodando.current = vez;
    return vez;
  }, [nuvem, repositorio, recarregar, contarPendentes]);

  // Depois de cada mudança, espera um instante (várias mudanças seguidas sobem juntas).
  const agendar = useCallback(() => {
    contarPendentes();
    if (agendado.current) clearTimeout(agendado.current);
    agendado.current = setTimeout(() => { agendado.current = null; rodar(); }, ESPERA_APOS_MUDANCA_MS);
  }, [rodar, contarPendentes]);

  // Sincroniza ao abrir, ao voltar para o app, ao voltar a internet e a cada minuto com o app aberto.
  useEffect(() => {
    rodar();
    const aoVoltar = () => { if (document.visibilityState === 'visible') rodar(); };
    const relogio = setInterval(aoVoltar, INTERVALO_MS);
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('online', aoVoltar);
    return () => {
      clearInterval(relogio);
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('online', aoVoltar);
      if (agendado.current) clearTimeout(agendado.current);
    };
  }, [rodar]);

  const estadoNuvem: EstadoNuvem = {
    configurada: !!nuvem,
    email,
    sincronizando,
    ultimaVez,
    pendentes,
    erro: erroNuvem,
    async entrar(e, senha) {
      if (!nuvem) return;
      await nuvem.entrar(e, senha);
      setEmail(nuvem.email());
      await rodar();
    },
    async sair() {
      if (!nuvem) return;
      await nuvem.sair();
      // Na próxima entrada, tudo o que estiver aqui é conferido com a nuvem de novo.
      await repositorio.gravarMarca(null);
      limparUltima();
      setEmail(null);
      setUltimaVez(null);
      setErroNuvem(null);
    },
    sincronizarAgora: rodar,
  };

  const valor: Dados = {
    carregando,
    erro,
    obras,
    custos,
    contas,
    saldos,
    async salvarObra(d, id) {
      const r = await repositorio.salvarObra(d, id);
      await recarregar();
      agendar();
      return r;
    },
    async excluirObra(id) {
      await repositorio.excluirObra(id);
      await recarregar();
      agendar();
    },
    async salvarCusto(d, id) {
      const r = await repositorio.salvarCusto(d, id);
      await recarregar();
      agendar();
      return r;
    },
    async excluirCusto(id) {
      await repositorio.excluirCusto(id);
      await recarregar();
      agendar();
    },
    async salvarConta(d, id) {
      const r = await repositorio.salvarConta(d, id);
      await recarregar();
      agendar();
      return r;
    },
    async salvarSaldo(d) {
      const r = await repositorio.salvarSaldo(d);
      await recarregar();
      agendar();
      return r;
    },
    async excluirSaldo(id) {
      await repositorio.excluirSaldo(id);
      await recarregar();
      agendar();
    },
    exportar: () => repositorio.exportar(),
    async restaurar(b) {
      await repositorio.substituirTudo(b);
      await recarregar();
      agendar();
    },
    copiaAnterior: () => repositorio.copiaAnterior(),
    async desfazerRestauracao() {
      await repositorio.desfazerRestauracao();
      await recarregar();
      agendar();
    },
    nuvem: estadoNuvem,
  };

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

// Versão de demonstração: a página pode trazer dados iniciais em window.__MB2_SEMENTE__ (um backup).
// Eles só entram se o aparelho ainda não tiver nenhuma obra.
async function semear(repo: Repositorio) {
  const semente = (window as Window & { __MB2_SEMENTE__?: unknown }).__MB2_SEMENTE__;
  if (!semente) return;
  try {
    const v = validarBackup(semente);
    if (v.ok && (await repo.listarObras()).length === 0) await repo.substituirTudo(v.backup, { semCopia: true });
  } catch { /* sem banco disponível: o erro aparece no carregamento normal */ }
}

export function useDados(): Dados {
  const c = useContext(Contexto);
  if (!c) throw new Error('useDados fora do DadosProvider');
  return c;
}
