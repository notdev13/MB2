import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

// Identidade MB² Incorporações: preto, bronze e creme.
// Bronze é só acento (barras, ícones, detalhes): texto fica sempre em preto/branco
// ou em bronze escurecido, para continuar legível no sol forte do canteiro.
// `orange` é a cor de alerta (atraso, ocorrência); o nome ficou por compatibilidade.
const claro = {
  bg: '#F4EFE7', surface: '#FFFFFF', text: '#15120F', muted: '#5C554D', border: '#E2DAD0',
  divider: '#ECE5DA', tint: '#F1E6D7', accent: '#15120F', accentText: '#7A532E', onAccent: '#F4EFE7',
  warnBg: '#FBE6DA', warnText: '#9E4119', okBg: '#F1E6D7', okText: '#6B4826',
  hero: '#FFFFFF', heroText: '#15120F', heroBar: '#A97A4B', heroTrack: '#ECE5DA', heroBorder: '#E2DAD0',
  orange: '#B04A1C', danger: '#B3261E',
  bronze: '#A97A4B', marcador: '#15120F', barra: 'rgba(244,239,231,0.96)', fab: '#15120F', onFab: '#E2BE8F',
};
const escuro: typeof claro = {
  bg: '#0D0C0B', surface: '#181614', text: '#F3EEE6', muted: '#A8A096', border: '#2E2A26',
  divider: '#26231F', tint: 'rgba(201,160,110,0.14)', accent: '#C9A06E', accentText: '#D6B07F', onAccent: '#141210',
  warnBg: 'rgba(232,149,107,0.14)', warnText: '#EFA27A', okBg: 'rgba(201,160,110,0.14)', okText: '#E2BE8F',
  hero: '#181614', heroText: '#F3EEE6', heroBar: '#C9A06E', heroTrack: '#2E2A26', heroBorder: '#2E2A26',
  orange: '#E8956B', danger: '#F2B8B5',
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
