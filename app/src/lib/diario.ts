import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export type Clima = 'sol' | 'nublado' | 'chuva';
export type Efetivo = { funcao: string; quantidade: number };
export type DiarioRascunho = {
  id: string; // id local, só para a fila
  obraId: string;
  data: string; // AAAA-MM-DD
  clima: Clima | null;
  atividades: string;
  efetivo: Efetivo[];
  fotos: string[]; // caminhos locais ainda não enviados
};

const FILA = 'mb2-fila-diarios';

export function hojeISO(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function novoId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Erro sem código do Postgres = a requisição nem chegou ao servidor (sem sinal).
function semConexao(erro: unknown) {
  if (!erro) return false;
  if (erro instanceof TypeError) return true;
  const e = erro as { code?: string; message?: string };
  return !e.code && /fetch|network|timeout|abort/i.test(e.message ?? '');
}

export async function carregarDiarioDoDia(obraId: string, data = hojeISO()) {
  const { data: d, error } = await supabase
    .from('diarios')
    .select('id, clima, atividades, diario_efetivo(funcao, quantidade)')
    .eq('obra_id', obraId)
    .eq('data', data)
    .maybeSingle();
  if (error) throw error;
  return d as { id: string; clima: Clima | null; atividades: string | null; diario_efetivo: Efetivo[] } | null;
}

// Copia a foto para a pasta do app, para ela não sumir antes de subir.
export async function guardarFoto(uri: string) {
  if (Platform.OS === 'web') return uri;
  const pasta = new Directory(Paths.document, 'fotos-pendentes');
  pasta.create({ idempotent: true });
  const destino = new File(pasta, `${novoId()}.jpg`);
  await new File(uri).copy(destino);
  return destino.uri;
}

async function enviarFoto(obraId: string, diarioId: string, uri: string) {
  const caminho = `${obraId}/${diarioId}/${novoId()}.jpg`;
  const bytes = await (Platform.OS === 'web' ? fetch(uri).then((r) => r.arrayBuffer()) : new File(uri).arrayBuffer());
  const up = await supabase.storage.from('fotos-obra').upload(caminho, bytes, { contentType: 'image/jpeg' });
  if (up.error) throw up.error;
  const reg = await supabase.from('fotos').insert({ obra_id: obraId, diario_id: diarioId, caminho });
  if (reg.error) throw reg.error;
  if (Platform.OS !== 'web') {
    try {
      new File(uri).delete();
    } catch {}
  }
}

async function enviar(r: DiarioRascunho) {
  const { data: d, error } = await supabase
    .from('diarios')
    .upsert({ obra_id: r.obraId, data: r.data, clima: r.clima, atividades: r.atividades.trim() || null }, { onConflict: 'obra_id,data' })
    .select('id')
    .single();
  if (error) throw error;

  const del = await supabase.from('diario_efetivo').delete().eq('diario_id', d.id);
  if (del.error) throw del.error;
  const linhas = r.efetivo.filter((e) => e.quantidade > 0).map((e) => ({ diario_id: d.id, funcao: e.funcao, quantidade: e.quantidade }));
  if (linhas.length) {
    const ins = await supabase.from('diario_efetivo').insert(linhas);
    if (ins.error) throw ins.error;
  }

  // Foto enviada sai da lista; se cair o sinal no meio, o resto fica para depois.
  while (r.fotos.length) {
    await enviarFoto(r.obraId, d.id, r.fotos[0]);
    r.fotos.shift();
  }
}

async function lerFila(): Promise<DiarioRascunho[]> {
  const bruto = await AsyncStorage.getItem(FILA);
  return bruto ? JSON.parse(bruto) : [];
}

async function gravarFila(fila: DiarioRascunho[]) {
  await AsyncStorage.setItem(FILA, JSON.stringify(fila));
}

async function guardarNaFila(r: DiarioRascunho) {
  // Um rascunho por obra e dia: o mais novo substitui o anterior, somando as fotos.
  const fila = await lerFila();
  const antigo = fila.find((f) => f.obraId === r.obraId && f.data === r.data);
  const fotos = [...(antigo?.fotos ?? []), ...r.fotos.filter((f) => !antigo?.fotos.includes(f))];
  await gravarFila([...fila.filter((f) => f !== antigo), { ...r, fotos }]);
}

export type ResultadoSalvar = 'enviado' | 'na-fila';

export async function salvarDiario(r: DiarioRascunho): Promise<ResultadoSalvar> {
  const copia = { ...r, fotos: [...r.fotos] };
  try {
    await enviar(copia);
    return 'enviado';
  } catch (erro) {
    if (!semConexao(erro)) throw erro;
    await guardarNaFila(copia);
    return 'na-fila';
  }
}

export async function pendentes() {
  return (await lerFila()).length;
}

let sincronizando = false;

// Tenta enviar o que ficou guardado. Chamado ao abrir a tela Hoje.
export async function sincronizar() {
  if (sincronizando) return;
  sincronizando = true;
  try {
    let fila = await lerFila();
    for (const r of [...fila]) {
      try {
        await enviar(r);
        fila = fila.filter((f) => f.id !== r.id);
      } catch (erro) {
        // Guarda o progresso (fotos já enviadas saem da lista do rascunho).
        await gravarFila(fila);
        if (semConexao(erro)) break;
        // Outro erro (ex.: permissão): o rascunho fica guardado e segue para o próximo.
        continue;
      }
      await gravarFila(fila);
    }
  } finally {
    sincronizando = false;
  }
}
