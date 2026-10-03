// Regras puras da previsão do tempo (sem rede nem armazenamento), para dar
// para testar com node direto sobre uma resposta salva da Open-Meteo.

export type Condicao = 'Sol' | 'Parcialmente nublado' | 'Nublado' | 'Neblina' | 'Garoa' | 'Chuva' | 'Chuva forte' | 'Tempestade';

// Recorte da resposta de /v1/forecast que usamos (horários já no fuso pedido).
export type RespostaOpenMeteo = {
  hourly: {
    time: string[]; // AAAA-MM-DDTHH:MM
    precipitation_probability: (number | null)[];
    precipitation: (number | null)[];
    temperature_2m: (number | null)[];
    weather_code: (number | null)[];
  };
  daily: {
    time: string[]; // AAAA-MM-DD
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
    precipitation_probability_max: (number | null)[];
    weather_code: (number | null)[];
  };
};

export type Previsao = {
  agora: number;
  max: number;
  min: number;
  condicao: Condicao;
  chuva: boolean; // condição de hoje é de chuva (garoa, chuva, tempestade)
  chuvaAs: { hora: number; prob: number } | null; // primeira hora de trabalho com chuva provável
  amanha: { condicao: Condicao; prob: number | null; max: number | null; min: number | null } | null;
};

export const HORA_INICIO = 7;
export const HORA_FIM = 18; // a última hora considerada é a das 17h
export const PROB_CHUVA = 60;

// Códigos WMO usados pela Open-Meteo.
export function condicaoWMO(codigo: number | null | undefined): Condicao {
  const c = codigo ?? 0;
  if (c <= 1) return 'Sol';
  if (c === 2) return 'Parcialmente nublado';
  if (c === 3) return 'Nublado';
  if (c === 45 || c === 48) return 'Neblina';
  if (c >= 51 && c <= 57) return 'Garoa';
  if (c === 65 || c === 67 || c === 82) return 'Chuva forte';
  if (c >= 95) return 'Tempestade';
  if (c >= 61) return 'Chuva'; // 61–66, 71–77 (neve), 80, 81, 85, 86
  return 'Nublado';
}

export const ehChuva = (c: Condicao) => c === 'Garoa' || c === 'Chuva' || c === 'Chuva forte' || c === 'Tempestade';

// O Brasil não tem horário de verão desde 2019: São Paulo é sempre UTC−3.
// Assim não dependemos do fuso do aparelho nem do Intl.
export function horaLocalSP(agora: Date) {
  const iso = new Date(agora.getTime() - 3 * 3600_000).toISOString();
  return { dia: iso.slice(0, 10), hora: Number(iso.slice(11, 13)) };
}

// Primeira hora de hoje, de agora em diante e dentro do expediente, com chance de chuva >= 60%.
export function horaDeChuva(r: RespostaOpenMeteo, agora: Date): Previsao['chuvaAs'] {
  const { dia, hora } = horaLocalSP(agora);
  const h = r.hourly;
  for (let i = 0; i < h.time.length; i++) {
    if (h.time[i].slice(0, 10) !== dia) continue;
    const hh = Number(h.time[i].slice(11, 13));
    if (hh < hora || hh < HORA_INICIO || hh >= HORA_FIM) continue;
    const prob = h.precipitation_probability[i];
    if (prob != null && prob >= PROB_CHUVA) return { hora: hh, prob };
  }
  return null;
}

export function montarPrevisao(r: RespostaOpenMeteo, agora: Date): Previsao | null {
  const { dia, hora } = horaLocalSP(agora);
  const d = r.daily;
  const i = d.time.indexOf(dia);
  if (i < 0) return null;
  const j = r.hourly.time.indexOf(`${dia}T${String(hora).padStart(2, '0')}:00`);
  const max = d.temperature_2m_max[i];
  const min = d.temperature_2m_min[i];
  const temp = j >= 0 ? r.hourly.temperature_2m[j] : null;
  if (max == null || min == null) return null;
  const condicao = condicaoWMO(d.weather_code[i]);
  const k = i + 1 < d.time.length ? i + 1 : -1;
  return {
    agora: Math.round(temp ?? max),
    max: Math.round(max),
    min: Math.round(min),
    condicao,
    chuva: ehChuva(condicao),
    chuvaAs: horaDeChuva(r, agora),
    amanha:
      k < 0
        ? null
        : {
            condicao: condicaoWMO(d.weather_code[k]),
            prob: d.precipitation_probability_max[k],
            max: d.temperature_2m_max[k] == null ? null : Math.round(d.temperature_2m_max[k]!),
            min: d.temperature_2m_min[k] == null ? null : Math.round(d.temperature_2m_min[k]!),
          },
  };
}
