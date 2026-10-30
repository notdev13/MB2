import { useEffect, useRef, useState } from 'react';
import { useDados } from '../dados/contexto';
import { Icone } from './Icone';
import { construtorDoNavegador, criarControleFalar, type ControleFalar, type Visao } from './Falar.logica';
import type { EstadoVoz } from './sessaoVoz';

// Campo "fale ou escreva o lançamento". O microfone usa o reconhecimento de voz do próprio
// aparelho (Safari/Chrome); onde ele não existir ou não for liberado, o microfone do teclado
// do iPhone escreve no campo do mesmo jeito. Toda a regra (texto digitado x ao vivo, tempos,
// reinício) está em Falar.logica.ts e sessaoVoz.ts, com testes. Nenhum áudio é gravado ou guardado.

const FRASE: Record<EstadoVoz, string> = {
  pronto: 'Toque no microfone e fale.',
  pedindo: 'Abrindo o microfone… se o iPhone perguntar, toque em Permitir.',
  ouvindo: 'Ouvindo… fale o valor, a obra e o que foi pago. Toque no microfone para terminar.',
  processando: 'Entendendo o que você disse…',
  erro: '',
};

export function Falar({ aoEntender }: { aoEntender: (texto: string) => void }) {
  const [v, setV] = useState<Visao>({ texto: '', estado: 'pronto', erro: null });
  const ctl = useRef<ControleFalar | null>(null);
  const rolagem = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aoEntenderRef = useRef(aoEntender);
  aoEntenderRef.current = aoEntender;
  const temVoz = construtorDoNavegador() !== null;

  // "Salvar e lançar outro" mantém este campo na tela: quando entra um custo novo, o texto que já
  // virou lançamento é esquecido, para o próximo não herdar (nem acrescentar a) a fala antiga.
  // (Sem mexer no FormCusto: o campo observa a lista de custos.)
  const { custos } = useDados();
  const totalCustos = useRef(custos.length);
  useEffect(() => {
    if (custos.length > totalCustos.current) ctl.current?.novoLancamento();
    totalCustos.current = custos.length;
  }, [custos.length]);

  useEffect(() => {
    const c = criarControleFalar({
      obterConstrutor: construtorDoNavegador,
      aoEntender: (t) => aoEntenderRef.current(t),
      aoMudar: setV,
    });
    ctl.current = c;
    return () => {
      c.destruir();
      ctl.current = null;
      if (rolagem.current) clearTimeout(rolagem.current);
    };
  }, []);

  const { texto, estado, erro } = v;
  const escutando = estado === 'pedindo' || estado === 'ouvindo';
  const temTexto = texto.trim().length > 0;

  function aoFocarCampo(el: HTMLTextAreaElement) {
    ctl.current?.focar(); // quer editar: encerra a escuta, mantém o texto, não preenche o formulário
    // Com o teclado aberto, mantém o campo visível acima dele.
    if (rolagem.current) clearTimeout(rolagem.current);
    rolagem.current = setTimeout(() => el.scrollIntoView?.({ block: 'nearest' }), 350);
  }

  const frase = erro ?? FRASE[estado];
  const rotuloMic = escutando ? 'Parar de ouvir' : temTexto ? 'Ouvir de novo e acrescentar' : 'Falar o lançamento';

  return (
    <div className="falar">
      <div className="falar-linha">
        <label className="campo" style={{ flex: 1, margin: 0 }}>
          <span>Fale ou escreva o lançamento</span>
          <textarea rows={2} value={texto} enterKeyHint="done"
            placeholder="Ex.: paguei 360 de cimento no Lote 39 ontem, no pix"
            onFocus={(e) => aoFocarCampo(e.currentTarget)}
            onChange={(e) => ctl.current?.digitar(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ctl.current?.enter(); }
            }} />
        </label>
        {temVoz && (
          <button type="button" className={'botao microfone' + (escutando ? ' ouvindo' : ' secundario')} onClick={() => ctl.current?.ouvir()}
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
      {!escutando && estado !== 'processando' && temTexto && (
        <div className="falar-acoes">
          <button type="button" className="botao secundario" onClick={() => ctl.current?.preencher()}>
            Preencher com este texto
          </button>
          {temVoz && (
            <button type="button" className="botao secundario" onClick={() => ctl.current?.ouvir()}>
              Ouvir de novo
            </button>
          )}
          <button type="button" className="botao secundario" onClick={() => ctl.current?.limpar()}>
            Limpar
          </button>
        </div>
      )}
      {temVoz && temTexto && !escutando && (
        <p className="nota">Ouvir de novo acrescenta ao texto acima; nada é apagado. Para recomeçar, toque em Limpar.</p>
      )}
      <p className="nota falar-privacidade">
        Falar usa o reconhecimento de voz do navegador e pode enviar o áudio à Apple ou ao Google. O painel não grava nem guarda áudio. Se preferir, é só digitar.
      </p>
    </div>
  );
}
