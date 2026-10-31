import { useId } from 'react';
import { variacaoSerie } from '../dominio/graficos';
import { curvaSuave } from './curva';

// Minigráfico do saldo de uma conta (celular e computador): linha clara com sombra embaixo,
// vermelha quando o saldo caiu do primeiro para o último registro. Só aparece com 2 registros ou mais.
export function MiniGrafico({ serie, largura = 120, altura = 32 }: { serie: number[]; largura?: number; altura?: number }) {
  const id = useId();
  if (serie.length < 2) return null;
  const v = variacaoSerie(serie);
  const cor = v !== null && v < 0 ? 'var(--cai)' : 'var(--linha-clara)';
  const c = curvaSuave(serie, largura, altura, 1.5, 4);
  return (
    <svg className="mini" viewBox={`0 0 ${largura} ${altura}`} width={largura} height={altura} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={cor} stopOpacity="0.28" />
          <stop offset="1" stopColor={cor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${c.d} L${c.fim[0]} ${altura} L${c.inicio[0]} ${altura}Z`} fill={`url(#${id})`} />
      <path d={c.d} fill="none" stroke={cor} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// Variação do saldo em texto, com seta: verde quando subiu, vermelha quando caiu.
export function VariacaoSaldo({ serie }: { serie: number[] }) {
  const v = variacaoSerie(serie);
  if (v === null) return null;
  const caiu = v < 0;
  const texto = `${caiu ? '−' : '+'}${Math.abs(v).toFixed(1).replace('.', ',')}%`;
  return (
    <span className={'var-saldo ' + (caiu ? 'caiu' : 'subiu')}
      title={`Saldo ${caiu ? 'caiu' : 'subiu'} ${texto} desde o primeiro registro mostrado`}>
      {texto} {caiu ? '↘' : '↗'}
    </span>
  );
}
