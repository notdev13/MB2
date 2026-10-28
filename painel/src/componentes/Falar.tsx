import { useEffect, useRef, useState } from 'react';
import { Icone } from './Icone';

// Campo "fale ou escreva o lançamento". O microfone usa o reconhecimento de voz do próprio
// aparelho (Safari/Chrome); onde ele não existir ou não for liberado, o microfone do teclado
// do iPhone escreve no campo do mesmo jeito.

interface Resultado { 0: { transcript: string }; isFinal: boolean }
interface Reconhecedor {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<Resultado> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type Construtor = new () => Reconhecedor;

const construtor = (): Construtor | null => {
  const w = window as unknown as { SpeechRecognition?: Construtor; webkitSpeechRecognition?: Construtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export function Falar({ aoEntender }: { aoEntender: (texto: string) => void }) {
  const [texto, setTexto] = useState('');
  const [ouvindo, setOuvindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const reconhecedor = useRef<Reconhecedor | null>(null);
  const temVoz = construtor() !== null;

  useEffect(() => () => reconhecedor.current?.stop(), []);

  function ouvir() {
    if (ouvindo) { reconhecedor.current?.stop(); return; }
    const R = construtor();
    if (!R) return;
    const r = new R();
    r.lang = 'pt-BR';
    r.interimResults = true;
    r.continuous = false;
    let final = '';
    r.onresult = (e) => {
      let parcial = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else parcial += e.results[i][0].transcript;
      }
      setTexto((final + parcial).trim());
    };
    r.onerror = (e) => {
      setErro(e.error === 'not-allowed' || e.error === 'service-not-allowed'
        ? 'O microfone não foi liberado aqui. Toque no campo e use o microfone do teclado.'
        : e.error === 'no-speech' ? 'Não ouvi nada. Toque no microfone e fale de novo.'
        : 'Não consegui ouvir. Tente de novo ou escreva no campo.');
    };
    r.onend = () => {
      setOuvindo(false);
      reconhecedor.current = null;
      if (final.trim()) aoEntender(final.trim());
    };
    setErro(null);
    setTexto('');
    reconhecedor.current = r;
    try {
      r.start();
      setOuvindo(true);
    } catch {
      setErro('Não consegui ligar o microfone. Toque no campo e use o microfone do teclado.');
    }
  }

  return (
    <div className="falar">
      <div className="falar-linha">
        <label className="campo" style={{ flex: 1, margin: 0 }}>
          <span>Fale ou escreva o lançamento</span>
          <textarea rows={2} value={texto} enterKeyHint="done"
            placeholder="Ex.: paguei 360 de cimento no Lote 39 ontem, no pix"
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (texto.trim()) aoEntender(texto.trim()); }
            }} />
        </label>
        {temVoz && (
          <button type="button" className={'botao microfone' + (ouvindo ? ' ouvindo' : ' secundario')} onClick={ouvir}
            aria-label={ouvindo ? 'Parar de ouvir' : 'Falar o lançamento'} aria-pressed={ouvindo}>
            <Icone nome="microfone" />
          </button>
        )}
      </div>
      {ouvindo && <p className="nota">Ouvindo… fale o valor, a obra e o que foi pago.</p>}
      {erro && <p className="nota" style={{ color: 'var(--alerta)' }}>{erro}</p>}
      {!ouvindo && texto.trim() && (
        <button type="button" className="botao secundario pequeno" style={{ marginTop: 8 }} onClick={() => aoEntender(texto.trim())}>
          Preencher com este texto
        </button>
      )}
    </div>
  );
}
