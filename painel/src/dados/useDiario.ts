import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { NovoRegistroDiario, RegistroDiario } from '../dominio/diario';
import { criarRepositorioDiario } from './diario';
import type { RepositorioDiario } from './repositorio';

// Estado do diário, compartilhado entre a tela e o formulário (um repositório por aba do navegador).
let repo: RepositorioDiario | null = null;
let registros: RegistroDiario[] = [];
let carregado = false;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

export function usarRepositorioDiario(r: RepositorioDiario) { repo = r; carregado = false; registros = []; }
const obter = () => (repo ??= criarRepositorioDiario());

async function recarregar() {
  registros = await obter().listar();
  carregado = true;
  avisar();
}

export function useDiario() {
  const lista = useSyncExternalStore((f) => { ouvintes.add(f); return () => ouvintes.delete(f); }, () => registros);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    if (!carregado) recarregar().catch((e) => setErro('Não foi possível abrir o diário deste aparelho. ' + String(e)));
  }, []);
  const salvar = useCallback(async (d: NovoRegistroDiario, arquivos: Record<string, Blob>, id?: string) => {
    const r = await obter().salvar(d, arquivos, id);
    await recarregar();
    return r;
  }, []);
  const excluir = useCallback(async (id: string) => { await obter().excluir(id); await recarregar(); }, []);
  const arquivo = useCallback((midiaId: string) => obter().arquivo(midiaId), []);
  return { registros: lista, carregado, erro, salvar, excluir, arquivo };
}

// URL temporária de uma foto ou vídeo guardado; liberada ao sair da tela.
export function useUrlMidia(midiaId: string | null, blobLocal?: Blob) {
  const { arquivo } = useDiario();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    let criada: string | null = null;
    (async () => {
      const b = blobLocal ?? (midiaId ? await arquivo(midiaId) : null);
      if (!vivo || !b) return;
      criada = URL.createObjectURL(b);
      setUrl(criada);
    })();
    return () => { vivo = false; if (criada) URL.revokeObjectURL(criada); setUrl(null); };
  }, [midiaId, blobLocal, arquivo]);
  return url;
}
