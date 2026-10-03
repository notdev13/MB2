import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

// Paleta do protótipo (identidade MB2). O tema claro evita blocos pretos
// para manter a leitura fácil no sol forte.
const claro = {
  bg: '#F3F4F2', surface: '#FFFFFF', text: '#15191E', muted: '#454D54', border: '#DADDD8',
  divider: '#ECEDEA', tint: '#E3F2EA', accent: '#178350', accentText: '#178350', onAccent: '#FFFFFF',
  warnBg: '#FBEBD3', warnText: '#8A4B00', okBg: '#E2F0E6', okText: '#1E5E37',
  hero: '#FFFFFF', heroText: '#15191E', heroBar: '#178350', heroTrack: '#E3E5E1', heroBorder: '#C9CDC7',
  orange: '#F07A1A', danger: '#B3261E',
};
const escuro: typeof claro = {
  bg: '#0B0B0B', surface: '#17181A', text: '#F2F2F0', muted: '#9BA1A6', border: '#2E3033',
  divider: '#26282B', tint: '#10291B', accent: '#178350', accentText: '#3CC47E', onAccent: '#FFFFFF',
  warnBg: '#3A2610', warnText: '#F5B266', okBg: '#10291B', okText: '#6FD49A',
  hero: '#1C1D20', heroText: '#FFFFFF', heroBar: '#FFFFFF', heroTrack: 'rgba(255,255,255,0.22)', heroBorder: '#1C1D20',
  orange: '#F07A1A', danger: '#F2B8B5',
};
export type Tema = typeof claro;

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
