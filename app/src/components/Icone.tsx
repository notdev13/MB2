import Svg, { Circle, Path } from 'react-native-svg';

export type Nome =
  | 'diario' | 'foto' | 'material' | 'ocorrencia' | 'sol' | 'lua' | 'sair' | 'seta' | 'chuva' | 'calendario'
  | 'inicio' | 'cronograma' | 'mais' | 'pontos' | 'check' | 'abrir' | 'equipe' | 'chave' | 'nuvem' | 'caixa' | 'painel';

export function Icone({ nome, cor, tamanho = 20, espessura = 1.8 }: { nome: Nome; cor: string; tamanho?: number; espessura?: number }) {
  const p = { stroke: cor, strokeWidth: espessura, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24">
      {nome === 'diario' && (<><Path d="M4 4h12l4 4v12H4z" {...p} /><Path d="M8 12h8M8 16h5" {...p} /></>)}
      {nome === 'foto' && (<><Path d="M3 8h4l2-3h6l2 3h4v11H3z" {...p} /><Circle cx="12" cy="13" r="3.5" {...p} /></>)}
      {nome === 'material' && (<><Path d="M3 7l9-4 9 4-9 4z" {...p} /><Path d="M3 7v10l9 4 9-4V7" {...p} /><Path d="M12 11v10" {...p} /></>)}
      {nome === 'ocorrencia' && (<><Path d="M12 3 2 20h20z" {...p} /><Path d="M12 10v4M12 17h.01" {...p} /></>)}
      {nome === 'sol' && (<><Circle cx="12" cy="12" r="4" {...p} /><Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" {...p} /></>)}
      {nome === 'lua' && <Path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" {...p} />}
      {nome === 'sair' && (<><Path d="M15 4h4v16h-4" {...p} /><Path d="M10 8l-4 4 4 4M6 12h10" {...p} /></>)}
      {nome === 'seta' && <Path d="m9 18 6-6-6-6" {...p} />}
      {nome === 'calendario' && (<><Path d="M4 6h16v14H4z" {...p} /><Path d="M4 10h16M8 3v4M16 3v4" {...p} /><Path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" {...p} /></>)}
      {nome === 'chuva' && (<><Path d="M17 17a4 4 0 0 0 0-8 6 6 0 0 0-11.6 2A3.5 3.5 0 0 0 6 17z" {...p} /><Path d="M8 20l1-2M12 21l1-2M16 20l1-2" {...p} /></>)}
      {nome === 'inicio' && <Path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" {...p} />}
      {nome === 'cronograma' && <Path d="M4 6h10M4 12h16M4 18h7" {...p} />}
      {nome === 'mais' && <Path d="M12 5v14M5 12h14" {...p} />}
      {nome === 'pontos' && (<><Circle cx="5" cy="12" r="1.2" {...p} /><Circle cx="12" cy="12" r="1.2" {...p} /><Circle cx="19" cy="12" r="1.2" {...p} /></>)}
      {nome === 'check' && <Path d="M5 12l5 5L20 7" {...p} />}
      {nome === 'abrir' && <Path d="M6 9l6 6 6-6" {...p} />}
      {nome === 'equipe' && (<><Circle cx="9" cy="8" r="3.5" {...p} /><Path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" {...p} /><Path d="M16 4.5a3.5 3.5 0 0 1 0 7M21 20c0-2.6-1.6-4.8-4-5.6" {...p} /></>)}
      {nome === 'chave' && (<><Circle cx="8" cy="15" r="4" {...p} /><Path d="M11 12l9-9M17 6l3 3" {...p} /></>)}
      {nome === 'nuvem' && <Path d="M17 18a4 4 0 0 0 0-8 6 6 0 0 0-11.6 2A3.5 3.5 0 0 0 6 18z" {...p} />}
      {nome === 'caixa' && (<><Path d="M4 13h4l2 3h4l2-3h4" {...p} /><Path d="M5 5h14l1 8v6H4v-6z" {...p} /></>)}
      {nome === 'painel' && <Path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" {...p} />}
    </Svg>
  );
}
