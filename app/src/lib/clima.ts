import AsyncStorage from '@react-native-async-storage/async-storage';
import { montarPrevisao, Previsao, RespostaOpenMeteo } from './previsao';

export type { Condicao, Previsao } from './previsao';
export { condicaoWMO, horaDeChuva, montarPrevisao } from './previsao';

// Previsão do tempo pela Open-Meteo (gratuita, sem chave). A licença pede atribuição.
export type PrevisaoObra = Previsao & {
  atualizadaEm: number; // quando a previsão foi baixada (ms)
  antiga: boolean; // true quando veio do aparelho porque a rede falhou
};

const PADRAO = 'Florianópolis';
const TEMPO_LIMITE = 8000;
const VALIDADE = 30 * 60_000; // reaproveita a última previsão por 30 min
const chaveCoords = (cidade: string) => `mb2-clima-coords:${cidade.toLowerCase()}`;
const chavePrevisao = (cidade: string) => `mb2-clima-previsao:${cidade.toLowerCase()}`;

type Coords = { latitude: number; longitude: number };
type Salva = { em: number; resposta: RespostaOpenMeteo };

async function buscarJSON<T>(url: string): Promise<T> {
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), TEMPO_LIMITE);
  try {
    const r = await fetch(url, { signal: controle.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function ler<T>(chave: string): Promise<T | null> {
  try {
    const bruto = await AsyncStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as T) : null;
  } catch {
    return null;
  }
}

async function coordenadas(cidade: string): Promise<Coords> {
  const salvas = await ler<Coords>(chaveCoords(cidade));
  if (salvas) return salvas;
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cidade)}&count=1&language=pt&countryCode=BR`;
  const r = await buscarJSON<{ results?: { latitude: number; longitude: number }[] }>(url);
  const achada = r.results?.[0];
  if (!achada) throw new Error(`Cidade não encontrada: ${cidade}`);
  const coords = { latitude: achada.latitude, longitude: achada.longitude };
  AsyncStorage.setItem(chaveCoords(cidade), JSON.stringify(coords)).catch(() => {});
  return coords;
}

// Devolve null quando não há previsão nem guardada no aparelho; nunca lança.
export async function carregarPrevisao(cidade?: string | null, agora = new Date()): Promise<PrevisaoObra | null> {
  const nome = cidade?.trim() || PADRAO;
  const salva = await ler<Salva>(chavePrevisao(nome));
  const usar = (s: Salva, antiga: boolean) => {
    const p = montarPrevisao(s.resposta, agora);
    return p ? { ...p, atualizadaEm: s.em, antiga } : null;
  };
  if (salva && agora.getTime() - salva.em < VALIDADE) {
    const p = usar(salva, false);
    if (p) return p;
  }
  try {
    const { latitude, longitude } = await coordenadas(nome);
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      '&timezone=America%2FSao_Paulo&forecast_days=3' +
      '&hourly=precipitation_probability,precipitation,temperature_2m,weather_code' +
      '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code';
    const resposta = await buscarJSON<RespostaOpenMeteo>(url);
    const nova = { em: Date.now(), resposta };
    AsyncStorage.setItem(chavePrevisao(nome), JSON.stringify(nova)).catch(() => {});
    return usar(nova, false);
  } catch {
    return salva ? usar(salva, true) : null;
  }
}
