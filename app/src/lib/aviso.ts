import { Alert, Platform } from 'react-native';

// No navegador o Alert do React Native não aparece; usa o aviso do próprio navegador.
const web = globalThis as { alert?: (m: string) => void; confirm?: (m: string) => boolean };

export function avisar(titulo: string, texto: string) {
  if (Platform.OS === 'web') web.alert?.(`${titulo}\n\n${texto}`);
  else Alert.alert(titulo, texto);
}

export function confirmar(titulo: string, texto: string, botao: string, aoConfirmar: () => void) {
  if (Platform.OS === 'web') {
    if (web.confirm?.(`${titulo}\n\n${texto}`)) aoConfirmar();
    return;
  }
  Alert.alert(titulo, texto, [
    { text: 'Cancelar', style: 'cancel' },
    { text: botao, style: 'destructive', onPress: aoConfirmar },
  ]);
}
