import { describe, expect, it } from 'vitest';
import { criarNuvem, ErroNuvem, type Guarda, type Sessao } from './nuvem';

const config = { url: 'https://abc.supabase.co', chave: 'chave-publica' };

function guardaMemoria(inicial: Sessao | null = null): Guarda & { valor: Sessao | null } {
  return { valor: inicial, ler() { return this.valor; }, gravar(s) { this.valor = s; } };
}

type Resposta = { status: number; corpo?: unknown };
function webFalsa(respostas: Resposta[]) {
  const pedidos: { url: string; init: RequestInit }[] = [];
  const buscar = (async (url: string, init: RequestInit) => {
    pedidos.push({ url, init });
    const r = respostas.shift() ?? { status: 500 };
    return new Response(r.corpo === undefined ? null : JSON.stringify(r.corpo), { status: r.status });
  }) as unknown as typeof fetch;
  return { buscar, pedidos };
}

const token = { access_token: 'a1', refresh_token: 'r1', expires_in: 3600 };
const valida = (): Sessao => ({ email: 'dono@mb2', acesso: 'a0', renovacao: 'r0', expiraEm: Date.now() + 3_600_000 });

describe('nuvem (Supabase)', () => {
  it('entra com e-mail e senha e guarda a sessão', async () => {
    const guarda = guardaMemoria();
    const web = webFalsa([{ status: 200, corpo: token }]);
    const nuvem = criarNuvem(config, guarda, web.buscar);
    await nuvem.entrar(' Dono@MB2 ', 'segredo');
    expect(web.pedidos[0].url).toBe('https://abc.supabase.co/auth/v1/token?grant_type=password');
    expect(nuvem.email()).toBe('dono@mb2');
    expect(guarda.valor?.acesso).toBe('a1');
  });

  it('senha errada vira mensagem simples', async () => {
    const nuvem = criarNuvem(config, guardaMemoria(), webFalsa([{ status: 400 }]).buscar);
    await expect(nuvem.entrar('a@b', 'x')).rejects.toThrow('E-mail ou senha incorretos.');
  });

  it('renova o acesso vencido antes de buscar', async () => {
    const guarda = guardaMemoria({ ...valida(), expiraEm: Date.now() - 1 });
    const web = webFalsa([{ status: 200, corpo: token }, { status: 200, corpo: [] }]);
    await criarNuvem(config, guarda, web.buscar).buscar(null);
    expect(web.pedidos[0].url).toContain('grant_type=refresh_token');
    expect((web.pedidos[1].init.headers as Record<string, string>).Authorization).toBe('Bearer a1');
  });

  it('sessão recusada pela nuvem pede para entrar de novo', async () => {
    const guarda = guardaMemoria(valida());
    const nuvem = criarNuvem(config, guarda, webFalsa([{ status: 401 }]).buscar);
    const erro = await nuvem.buscar(null).catch((e) => e);
    expect(erro).toBeInstanceOf(ErroNuvem);
    expect((erro as ErroNuvem).tipo).toBe('sessao');
    expect(nuvem.email()).toBeNull();
  });

  it('e-mail não autorizado recebe aviso claro', async () => {
    const nuvem = criarNuvem(config, guardaMemoria(valida()), webFalsa([{ status: 403 }]).buscar);
    await expect(nuvem.enviar([{ tipo: 'obra', id: 'x', dados: null, excluido: true, alteradoEm: 'x' }]))
      .rejects.toThrow('não foi autorizado');
  });

  it('busca em páginas a partir da marca', async () => {
    const linha = (i: number) => ({ tipo: 'custo', id: String(i), dados: null, excluido: true, alterado_em: 't', servidor_em: `s${i}` });
    const web = webFalsa([
      { status: 200, corpo: Array.from({ length: 1000 }, (_, i) => linha(i)) },
      { status: 200, corpo: [linha(1000)] },
    ]);
    const r = await criarNuvem(config, guardaMemoria(valida()), web.buscar).buscar('2026-10-01T00:00:00.000Z');
    expect(r).toHaveLength(1001);
    expect(r[0]).toEqual({ tipo: 'custo', id: '0', dados: null, excluido: true, alteradoEm: 't', servidorEm: 's0' });
    expect(web.pedidos[0].url).toContain('servidor_em=gt.2026-10-01T00%3A00%3A00.000Z');
    expect(web.pedidos[1].url).toContain('servidor_em=gt.s999');
  });

  it('sem internet avisa sem travar', async () => {
    const buscar = (async () => { throw new TypeError('Load failed'); }) as unknown as typeof fetch;
    await expect(criarNuvem(config, guardaMemoria(valida()), buscar).buscar(null)).rejects.toThrow('Sem conexão');
  });

  describe('renovação do acesso', () => {
    const vencida = (): Sessao => ({ ...valida(), expiraEm: Date.now() - 1 });

    it.each([400, 401])('refresh recusado com %i encerra a sessão', async (status) => {
      const guarda = guardaMemoria(vencida());
      const nuvem = criarNuvem(config, guarda, webFalsa([{ status }]).buscar);
      const erro = await nuvem.buscar(null).catch((e) => e);
      expect((erro as ErroNuvem).tipo).toBe('sessao');
      expect(nuvem.email()).toBeNull();
      expect(guarda.valor).toBeNull();
    });

    it.each([403, 404, 408, 429, 500, 502, 503])('refresh com %i mantém a sessão', async (status) => {
      const guarda = guardaMemoria(vencida());
      const nuvem = criarNuvem(config, guarda, webFalsa([{ status }]).buscar);
      const erro = await nuvem.buscar(null).catch((e) => e);
      expect((erro as ErroNuvem).tipo).toBe('servidor');
      expect(nuvem.email()).toBe('dono@mb2');
      expect(guarda.valor).not.toBeNull();
    });

    it('refresh sem internet mantém a sessão', async () => {
      const guarda = guardaMemoria(vencida());
      const buscar = (async () => { throw new TypeError('Load failed'); }) as unknown as typeof fetch;
      const nuvem = criarNuvem(config, guarda, buscar);
      const erro = await nuvem.buscar(null).catch((e) => e);
      expect((erro as ErroNuvem).tipo).toBe('rede');
      expect(nuvem.email()).toBe('dono@mb2');
      expect(guarda.valor).not.toBeNull();
    });
  });

  it('429 no login pede para aguardar', async () => {
    const nuvem = criarNuvem(config, guardaMemoria(), webFalsa([{ status: 429 }]).buscar);
    const erro = await nuvem.entrar('a@b', 'x').catch((e) => e);
    expect(erro.message).toBe('Muitas tentativas. Aguarde um minuto e tente de novo.');
    expect((erro as ErroNuvem).tipo).toBe('limite');
  });

  describe('duas abas', () => {
    const vencida = (): Sessao => ({ ...valida(), expiraEm: Date.now() - 1, renovacao: 'r0' });
    const novaDeOutraAba = (): Sessao => ({ email: 'dono@mb2', acesso: 'a9', renovacao: 'r9', expiraEm: Date.now() + 3_600_000 });

    it('usa a sessão que outra aba já renovou, sem renovar de novo', async () => {
      const guarda = guardaMemoria(vencida());
      const web = webFalsa([{ status: 200, corpo: [] }]);
      const nuvem = criarNuvem(config, guarda, web.buscar); // lê a sessão vencida
      guarda.valor = novaDeOutraAba(); // outra aba renova e guarda
      await nuvem.buscar(null);
      expect(web.pedidos).toHaveLength(1);
      expect(web.pedidos[0].url).toContain('/rest/v1/');
      expect((web.pedidos[0].init.headers as Record<string, string>).Authorization).toBe('Bearer a9');
    });

    it('400 no refresh, mas outra aba já guardou token novo: adota e não apaga', async () => {
      const guarda = guardaMemoria(vencida());
      const nuvem = criarNuvem(config, guarda, (async () => {
        guarda.valor = novaDeOutraAba(); // a outra aba gastou o token antes da resposta chegar
        return new Response(null, { status: 400 });
      }) as unknown as typeof fetch);
      await nuvem.buscar(null).catch(() => {});
      expect(guarda.valor?.renovacao).toBe('r9');
      expect(nuvem.email()).toBe('dono@mb2');
    });

    it('400 no refresh com a guarda igual: apaga mesmo (sessão revogada)', async () => {
      const guarda = guardaMemoria(vencida());
      const nuvem = criarNuvem(config, guarda, webFalsa([{ status: 400 }]).buscar);
      await nuvem.buscar(null).catch(() => {});
      expect(guarda.valor).toBeNull();
      expect(nuvem.email()).toBeNull();
    });
  });

  it('avisa quem ouve quando a sessão muda (entrar e sair)', async () => {
    const nuvem = criarNuvem(config, guardaMemoria(), webFalsa([{ status: 200, corpo: token }, { status: 204 }]).buscar);
    let avisos = 0;
    const parar = nuvem.ouvir(() => { avisos++; });
    await nuvem.entrar('a@b', 'x');
    expect(avisos).toBe(1);
    await nuvem.sair();
    expect(avisos).toBe(2);
    parar();
  });
});
