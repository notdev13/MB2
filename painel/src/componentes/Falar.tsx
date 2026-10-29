import { useEffect, useRef, useState } from 'react';
import { Icone } from './Icone';
import {
  criarSessao, juntarTexto, mensagemErro, vibrar,
  type ConstrutorVoz, type EstadoVoz, type Sessao,
} from './sessaoVoz';

// Campo "fale ou escreva o lançamento". O microfone usa o reconhecimento de voz do próprio
// aparelho (Safari/Chrome); onde ele não existir ou não for liberado, o microfone do teclado
// do iPhone escreve no campo do mesmo jeito. A lógica de ouvir/reiniciar/tempos está em
// sessaoVoz.ts (testada). Nenhum áudio é gravado ou guardado por este painel.

const construtor = (): ConstrutorVoz | null => {
  const w = window as unknown as { SpeechRecognition?: ConstrutorVoz; webkitSpeechRecognition?: ConstrutorVoz };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

const FRASE: Record<EstadoVoz, string> = {
  pronto: 'Toque no microfone e fale.',
  pedindo: 'Abrindo o microfone… se o iPhone perguntar, toque em Permitir.',
  ouvindo: 'Ouvindo… fale o valor, a obra e o que foi pago. Toque no microfone para terminar.',
  processando: 'Entendendo o que você disse…',
  erro: '',
};

export function Falar({ aoEntender }: { aoEntender: (texto: string) => void }) {
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState<EstadoVoz>('pronto');
  const [erro, setErro] = useState<string | null>(null);
  const sessao = useRef<Sessao | null>(null);
  const base = useRef('');
  const vivo = useRef(true);
  const rolagem = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aoEntenderRef = useRef(aoEntender);
  aoEntenderRef.current = aoEntender;
  const temVoz = construtor() !== null;

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
      sessao.current?.destruir();
      sessao.current = null;
      if (rolagem.current) clearTimeout(rolagem.current);
    };
  }, []);

  const escutando = estado === 'pedindo' || estado === 'ouvindo';

  function ouvir() {
    if (escutando) { sessao.current?.parar(); return; }
    if (estado === 'processando') return;
    const R = construtor();
    if (!R) return;
    base.current = texto.trim();
    setErro(null);
    vibrar(10);
    const s = criarSessao({
      construtor: R,
      aoEstado: (e) => { if (vivo.current) setEstado(e); },
      aoTexto: (falado) => { if (vivo.current) setTexto(juntarTexto(base.current, falado)); },
      aoFim: (falado, codigo) => {
        if (!vivo.current) return;
        sessao.current = null;
        vibrar(falado ? [20, 40, 20] : 40);
        if (codigo) setErro(mensagemErro(codigo));
        if (falado) {
          const completo = juntarTexto(base.current, falado);
          setTexto(completo);
          aoEntenderRef.current(completo);
        }
      },
    });
    sessao.current = s;
    s.iniciar();
  }

  function aoFocarCampo(el: HTMLTextAreaElement) {
    if (escutando) sessao.current?.parar(); // a pessoa quer editar: encerra a escuta
    // Com o teclado aberto, mantém o campo visível acima dele.
    if (rolagem.current) clearTimeout(rolagem.current);
    rolagem.current = setTimeout(() => el.scrollIntoView?.({ block: 'nearest' }), 350);
  }

  const frase = erro ?? FRASE[estado];
  const rotuloMic = escutando ? 'Parar de ouvir' : texto.trim() ? 'Ouvir de novo e acrescentar' : 'Falar o lançamento';

  return (
    <div className="falar">
      <div className="falar-linha">
        <label className="campo" style={{ flex: 1, margin: 0 }}>
          <span>Fale ou escreva o lançamento</span>
          <textarea rows={2} value={texto} enterKeyHint="done"
            placeholder="Ex.: paguei 360 de cimento no Lote 39 ontem, no pix"
            onFocus={(e) => aoFocarCampo(e.currentTarget)}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (texto.trim()) aoEntender(texto.trim()); }
            }} />
        </label>
        {temVoz && (
          <button type="button" className={'botao microfone' + (escutando ? ' ouvindo' : ' secundario')} onClick={ouvir}
            disabled={estado === 'processando'}
            aria-label={rotuloMic} aria-pressed={escutando}>
            <Icone nome="microfone" />
          </button>
        )}
      </div>
      <div className={'falar-estado' + (erro ? ' com-erro' : '')} role="status" aria-live="polite">
        {estado === 'ouvindo' && <span className="nivel" aria-hidden="true"><i /><i /><i /></span>}
        <span>{temVoz ? frase : (erro ?? 'Este navegador não tem reconhecimento de voz. Toque no campo e use o microfone do teclado, ou digite.')}</span>
      </div>
      {!escutando && estado !== 'processando' && texto.trim() && (
        <div className="falar-acoes">
          <button type="button" className="botao secundario" onClick={() => aoEntender(texto.trim())}>
            Preencher com este texto
          </button>
          {temVoz && (
            <button type="button" className="botao secundario" onClick={ouvir}>
              Ouvir de novo
            </button>
          )}
          <button type="button" className="botao secundario" onClick={() => { setTexto(''); setErro(null); }}>
            Limpar
          </button>
        </div>
      )}
      {temVoz && texto.trim() && !escutando && (
        <p className="nota">Ouvir de novo acrescenta ao texto acima; nada é apagado. Para recomeçar, toque em Limpar.</p>
      )}
      <p className="nota falar-privacidade">
        Falar usa o reconhecimento de voz do navegador e pode enviar o áudio à Apple ou ao Google. O painel não grava nem guarda áudio. Se preferir, é só digitar.
      </p>
    </div>
  );
}
