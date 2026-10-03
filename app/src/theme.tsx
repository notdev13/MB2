import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

// Dois temas, escolhidos pelo botão de tema (Mais › Usar tema claro/escuro):
// - Claro: paleta original da Estrutura v1 — branco, preto, verde de ação e laranja só para alerta.
// - Escuro: identidade MB² Incorporações — preto, bronze e creme.
// As fontes são as mesmas nos dois. Texto fica sempre em preto/branco ou em tom escurecido,
// para continuar legível no sol forte do canteiro.
// `orange` é a cor de alerta (atraso, ocorrência); `onOrange` é o texto sobre ela.
// `bronze` é o acento de detalhes (barras, ² da marca); no tema claro ele é verde.
const claro = {
  bg: '#F3F4F2', surface: '#FFFFFF', text: '#15191E', muted: '#454D54', border: '#DADDD8',
  divider: '#ECEDEA', tint: '#E3F2EA', accent: '#178350', accentText: '#178350', onAccent: '#FFFFFF',
  warnBg: '#FBEBD3', warnText: '#8A4B00', okBg: '#E2F0E6', okText: '#1E5E37',
  hero: '#FFFFFF', heroText: '#15191E', heroBar: '#178350', heroTrack: '#E3E5E1', heroBorder: '#DADDD8',
  orange: '#F07A1A', onOrange: '#15191E', danger: '#B3261E',
  bronze: '#178350', marcador: '#15191E', barra: 'rgba(255,255,255,0.96)', fab: '#178350', onFab: '#FFFFFF',
};
const escuro: typeof claro = {
  bg: '#0D0C0B', surface: '#181614', text: '#F3EEE6', muted: '#A8A096', border: '#2E2A26',
  divider: '#26231F', tint: 'rgba(201,160,110,0.14)', accent: '#C9A06E', accentText: '#D6B07F', onAccent: '#141210',
  warnBg: 'rgba(232,149,107,0.14)', warnText: '#EFA27A', okBg: 'rgba(201,160,110,0.14)', okText: '#E2BE8F',
  hero: '#181614', heroText: '#F3EEE6', heroBar: '#C9A06E', heroTrack: '#2E2A26', heroBorder: '#2E2A26',
  orange: '#E8956B', onOrange: '#141210', danger: '#F2B8B5',
  bronze: '#C9A06E', marcador: '#F3EEE6', barra: 'rgba(13,12,11,0.95)', fab: '#C9A06E', onFab: '#141210',
};
export type Tema = typeof claro;

// Fontes carregadas em App.tsx (useFonts). Serifa só em títulos e números de destaque.
export const fonte = {
  titulo: 'CormorantGaramond_600SemiBold',
  tituloLeve: 'CormorantGaramond_500Medium',
  texto: 'Manrope_400Regular',
  media: 'Manrope_500Medium',
  forte: 'Manrope_600SemiBold',
  negrito: 'Manrope_700Bold',
};

type Ctx = { t: Tema; escuro: boolean; alternar: () => void };
const TemaContext = createContext<Ctx>({ t: claro, escuro: false, alternar: () => {} });
const CHAVE = 'mb2-tema';

export function TemaProvider({ children }: { children: ReactNode }) {
  const sistema = useColorScheme();
  const [escolha, setEscolha] = useState<'claro' | 'escuro' | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(CHAVE).then((v) => {
      if (v === 'claro' || v === 'escuro') setEscolha(v);
    });
  }, []);

  const ehEscuro = (escolha ?? (sistema === 'dark' ? 'escuro' : 'claro')) === 'escuro';
  const alternar = () => {
    const nova = ehEscuro ? 'claro' : 'escuro';
    setEscolha(nova);
    AsyncStorage.setItem(CHAVE, nova);
  };

  return (
    <TemaContext.Provider value={{ t: ehEscuro ? escuro : claro, escuro: ehEscuro, alternar }}>
      {children}
    </TemaContext.Provider>
  );
}

export const useTema = () => useContext(TemaContext);
