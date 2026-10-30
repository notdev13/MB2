import type { RegistroNuvem } from './repositorio';

// Conversa com o banco na nuvem (Supabase) pela API web dele, sem biblioteca extra.
// Endereço e chave pública vêm do build (VITE_SUPABASE_URL e VITE_SUPABASE_CHAVE); sem eles,
// o painel funciona só no aparelho, como antes. Guia: docs/nuvem.md

export interface ConfigNuvem {
  url: string;
  chave: string; // chave pública (anon/publishable): quem protege os dados são as regras do banco
}

export interface Sessao {
  email: string;
  acesso: string;
  renovacao: string;
  expiraEm: number; // ms
}

// Onde a sessão fica guardada (localStorage no app; memória nos testes).
export interface Guarda {
  ler(): Sessao | null;
  gravar(s: Sessao | null): void;
}

export interface Nuvem {
  email(): string | null;
  // Avisa quando a sessão muda (entrou, saiu ou foi encerrada pela nuvem). Devolve como parar de ouvir.
  ouvir(aviso: () => void): () => void;
  entrar(email: string, senha: string): Promise<void>;
  sair(): Promise<void>;
  enviar(registros: RegistroNuvem[]): Promise<void>;
  // Tudo o que chegou à nuvem depois da marca (ou tudo, sem marca), em ordem de chegada.
  buscar(desde: string | null): Promise<RegistroNuvem[]>;
}

// Erros com mensagem pronta para mostrar na tela.
export class ErroNuvem extends Error {
  constructor(mensagem: string, readonly tipo: 'sessao' | 'rede' | 'servidor' | 'acesso') {
    super(mensagem);
  }
}

export function configDoBuild(): ConfigNuvem | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const chave = import.meta.env.VITE_SUPABASE_CHAVE as string | undefined;
  return url && chave ? { url: url.replace(/\/+$/, ''), chave } : null;
}

const CHAVE_SESSAO = 'mb2-nuvem-sessao';
export const guardaLocal: Guarda = {
  ler() {
    try { return JSON.parse(localStorage.getItem(CHAVE_SESSAO) ?? 'null'); } catch { return null; }
  },
  gravar(s) {
    try {
      if (s) localStorage.setItem(CHAVE_SESSAO, JSON.stringify(s));
      else localStorage.removeItem(CHAVE_SESSAO);
    } catch { /* sem armazenamento: a sessão dura só enquanto o app está aberto */ }
  },
};

interface LinhaBanco {
  tipo: RegistroNuvem['tipo'];
  id: string;
  dados: RegistroNuvem['dados'];
  excluido: boolean;
  alterado_em: string;
  servidor_em?: string;
}

const POR_PAGINA = 1000;
const TABELA = 'painel_registros';

export function criarNuvem(config: ConfigNuvem, guarda: Guarda = guardaLocal, buscarWeb: typeof fetch = fetch): Nuvem {
  let sessao = guarda.ler();
  const ouvintes = new Set<() => void>();
  const definir = (s: Sessao | null) => {
    const mudou = (sessao?.email ?? null) !== (s?.email ?? null);
    sessao = s;
    guarda.gravar(s);
    if (mudou) ouvintes.forEach((f) => f());
  };

  async function chamar(caminho: string, init: RequestInit = {}, token?: string): Promise<Response> {
    let r: Response;
    try {
      r = await buscarWeb(config.url + caminho, {
        ...init,
        headers: {
          apikey: config.chave,
          // Só com o acesso de quem entrou; nas chamadas de login basta a chave pública.
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'application/json',
          ...init.headers,
        },
      });
    } catch {
      throw new ErroNuvem('Sem conexão com a internet.', 'rede');
    }
    return r;
  }

  function guardarToken(email: string, corpo: { access_token: string; refresh_token: string; expires_in: number }) {
    definir({ email, acesso: corpo.access_token, renovacao: corpo.refresh_token, expiraEm: Date.now() + corpo.expires_in * 1000 });
  }

  async function token(): Promise<string> {
    if (!sessao) throw new ErroNuvem('Entre com seu e-mail para sincronizar.', 'sessao');
    if (sessao.expiraEm - Date.now() > 60_000) return sessao.acesso;
    const r = await chamar('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: sessao.renovacao }),
    });
    // Só 400/401 significam sessão revogada ou vencida de verdade. Falha de rede, 429, 5xx
    // e qualquer outro erro nunca derrubam a sessão: o dono continua dentro, mesmo sem internet.
    if (r.status === 400 || r.status === 401) {
      definir(null);
      throw new ErroNuvem('A sessão expirou. Entre de novo com seu e-mail.', 'sessao');
    }
    if (!r.ok) throw new ErroNuvem('A nuvem não respondeu. Tente de novo daqui a pouco.', 'servidor');
    guardarToken(sessao.email, await r.json());
    return sessao!.acesso;
  }

  async function conferir(r: Response) {
    if (r.ok) return;
    if (r.status === 401) {
      definir(null);
      throw new ErroNuvem('A sessão expirou. Entre de novo com seu e-mail.', 'sessao');
    }
    if (r.status === 403) throw new ErroNuvem('Este e-mail ainda não foi autorizado a ver os dados da MB2.', 'acesso');
    throw new ErroNuvem('A nuvem não respondeu. Tente de novo daqui a pouco.', 'servidor');
  }

  return {
    email: () => sessao?.email ?? null,
    ouvir(aviso) {
      ouvintes.add(aviso);
      return () => { ouvintes.delete(aviso); };
    },

    async entrar(email, senha) {
      const r = await chamar('/auth/v1/token?grant_type=password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password: senha }),
      });
      if (r.status === 400 || r.status === 401) throw new ErroNuvem('E-mail ou senha incorretos.', 'sessao');
      if (!r.ok) throw new ErroNuvem('A nuvem não respondeu. Tente de novo daqui a pouco.', 'servidor');
      guardarToken(email.trim().toLowerCase(), await r.json());
    },

    async sair() {
      const s = sessao;
      definir(null);
      if (s) await chamar('/auth/v1/logout', { method: 'POST' }, s.acesso).catch(() => {});
    },

    async enviar(registros) {
      for (let i = 0; i < registros.length; i += 500) {
        const linhas: LinhaBanco[] = registros.slice(i, i + 500).map((r) => ({
          tipo: r.tipo, id: r.id, dados: r.dados, excluido: r.excluido, alterado_em: r.alteradoEm,
        }));
        const r = await chamar(`/rest/v1/${TABELA}?on_conflict=tipo,id`, {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(linhas),
        }, await token());
        await conferir(r);
      }
    },

    async buscar(desde) {
      const todos: RegistroNuvem[] = [];
      let marca = desde;
      for (;;) {
        const filtro = marca ? `&servidor_em=gt.${encodeURIComponent(marca)}` : '';
        const r = await chamar(
          `/rest/v1/${TABELA}?select=tipo,id,dados,excluido,alterado_em,servidor_em&order=servidor_em.asc&limit=${POR_PAGINA}${filtro}`,
          {}, await token(),
        );
        await conferir(r);
        const linhas = (await r.json()) as LinhaBanco[];
        for (const l of linhas) {
          todos.push({ tipo: l.tipo, id: l.id, dados: l.dados, excluido: l.excluido, alteradoEm: l.alterado_em, servidorEm: l.servidor_em });
        }
        if (linhas.length < POR_PAGINA) return todos;
        marca = linhas[linhas.length - 1].servidor_em ?? null;
      }
    },
  };
}

// Uma só nuvem para o app inteiro (porteiro e sincronização enxergam a mesma sessão).
let doBuild: Nuvem | null | undefined;
export function nuvemDoBuild(): Nuvem | null {
  if (doBuild === undefined) {
    const config = configDoBuild();
    doBuild = config ? criarNuvem(config) : null;
  }
  return doBuild;
}
