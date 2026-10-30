import { useMemo, useState } from 'react';
import { useDados } from '../dados/contexto';
import { gravarImportacao } from '../dados/importar';
import {
  candidatoPreSelecionado, datasParaEscolher, PONTUACAO_MIN_PRESELECAO, type CandidatoSaldo, type CandidatosPdf,
} from '../dominio/extratoPdf';
import { dataBR, hoje, reais } from '../dominio/formato';
import { avaliarImportacaoPdf, dataPlausivel, ultimoSaldoValido, type Confirmacao } from '../dominio/importacao';
import { useAviso } from './Aviso';
import { useConfirmar } from './Confirmar';

// Conferência ASSISTIDA do PDF: o painel lista o que achou e o dono TOCA no certo (saldo, sinal e data).
// Nada é gravado sem essa escolha explícita. A regra de data é a mesma do OFX (dominio/importacao.ts).
const ULTIMA_CONTA = 'mb2.importar.ultimaContaPdf'; // só o id da conta escolhida por último

const lembrada = () => {
  try { return localStorage.getItem(ULTIMA_CONTA) ?? ''; } catch { return ''; }
};

type Etapa = 'saldo' | 'data' | 'resumo';

export function ConferirPdf({ candidatos, paginas, lidas, aoFechar, aoDigitarSaldo }: {
  candidatos: CandidatosPdf; paginas: number; lidas: number; aoFechar: () => void; aoDigitarSaldo?: () => void;
}) {
  const { contas, saldos, salvarSaldo, salvarConta, listarSaldos } = useDados();
  const avisar = useAviso();
  const confirmar = useConfirmar();
  const ativas = contas.filter((c) => c.ativa);
  const [contaId, setContaId] = useState(() => (ativas.some((c) => c.id === lembrada()) ? lembrada() : ''));
  const [etapa, setEtapa] = useState<Etapa>('saldo');
  const [escolhido, setEscolhido] = useState<CandidatoSaldo | null>(() => candidatoPreSelecionado(candidatos.saldos));
  const sugerido = useMemo(() => candidatoPreSelecionado(candidatos.saldos), [candidatos]);
  const [sinal, setSinal] = useState<'credor' | 'devedor' | null>(null);
  const [data, setData] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [recusa, setRecusa] = useState<string | null>(null);

  const conta = ativas.find((c) => c.id === contaId);
  const valorFinal = !escolhido ? null
    : escolhido.sinalIncerto ? (sinal === null ? null : sinal === 'devedor' ? -Math.abs(escolhido.valor) : Math.abs(escolhido.valor))
    : escolhido.valor;
  const datas = useMemo(() => datasParaEscolher(candidatos, escolhido), [candidatos, escolhido]);
  const dataDigitada = dataPlausivel(data, hoje()) ? data : '';
  const datasEncontradas = useMemo(() => datas.map((d) => d.data), [datas]);

  const avaliacao = useMemo(
    () => (etapa === 'resumo' && conta && valorFinal !== null && dataDigitada
      ? avaliarImportacaoPdf({ saldo: valorFinal, data: dataDigitada }, conta, saldos, hoje(), candidatos.periodoFim, datasEncontradas)
      : null),
    [etapa, conta, valorFinal, dataDigitada, saldos, candidatos.periodoFim, datasEncontradas],
  );
  const anterior = conta ? ultimoSaldoValido(conta.id, saldos, hoje()) : null;

  async function salvar() {
    if (!conta || valorFinal === null || !dataDigitada || !avaliacao?.ok || salvando) return;
    const confirmadas: Confirmacao[] = [];
    const perguntar = async (c: Confirmacao, texto: string, acao = 'Gravar') => {
      const ok = await confirmar({ texto, acao });
      if (ok) confirmadas.push(c);
      return ok;
    };
    if (avaliacao.precisaConfirmarMesmoDia
      && !(await perguntar('mesmo-dia', 'Já existe saldo deste dia com outro valor; este é mesmo o mais novo?', 'Sim, gravar'))) return;
    if (avaliacao.precisaConfirmarDataAnteriorAoPeriodo && candidatos.periodoFim
      && !(await perguntar('data-anterior-periodo',
        `A data escolhida (${dataBR(dataDigitada)}) é anterior ao fim do período do extrato (${dataBR(candidatos.periodoFim)}). Gravar com esta data?`))) return;
    if (avaliacao.precisaConfirmarDataPosterior
      && !(await perguntar('data-posterior', candidatos.periodoFim
        ? `A data escolhida (${dataBR(dataDigitada)}) é bem depois do fim do período do extrato (${dataBR(candidatos.periodoFim)}). Gravar com esta data?`
        : `A data escolhida (${dataBR(dataDigitada)}) não é nenhuma das datas encontradas no PDF. Gravar com esta data?`))) return;
    if (avaliacao.precisaConfirmarMudancaGrande && avaliacao.anterior
      && !(await perguntar('mudanca-grande', `Isso troca o saldo de ${reais(avaliacao.anterior.valor)} para ${reais(valorFinal)}. Gravar?`))) return;
    setSalvando(true);
    try {
      const r = await gravarImportacao(
        { salvarSaldo, salvarConta, listarSaldos }, { saldo: valorFinal, data: dataDigitada }, conta, hoje(),
        { origem: 'pdf', periodoFim: candidatos.periodoFim, datasEncontradas, confirmadas },
      );
      if (!r.ok) {
        setRecusa(r.mensagem);
        setSalvando(false);
        return;
      }
      try { localStorage.setItem(ULTIMA_CONTA, conta.id); } catch { /* sem armazenamento: tudo bem */ }
      avisar('Saldo atualizado');
      aoFechar();
    } catch (e) {
      avisar('Não foi possível salvar: ' + String(e));
      setSalvando(false);
    }
  }

  const aviso = paginas > lidas && (
    <div className="aviso atencao" role="alert">
      O PDF tem {paginas} páginas e li só as {lidas} primeiras. O saldo mais recente pode estar nas últimas páginas.
    </div>
  );

  if (recusa) {
    return (
      <>
        <div className="aviso" role="alert">⚠ {recusa}</div>
        <div className="acoes"><button type="button" className="botao secundario cheio" onClick={aoFechar}>Fechar</button></div>
      </>
    );
  }

  if (candidatos.saldos.length === 0) {
    return (
      <>
        {aviso}
        <div className="aviso" role="alert">⚠ Não achei o saldo neste PDF. Use o extrato em OFX ou digite o saldo.</div>
        <div className="acoes">
          {aoDigitarSaldo && <button type="button" className="botao cheio" onClick={aoDigitarSaldo}>Digitar o saldo</button>}
          <button type="button" className="botao secundario cheio" onClick={aoFechar}>Fechar</button>
        </div>
      </>
    );
  }

  const seletorConta = ativas.length === 0 ? (
    <div className="aviso" role="alert">⚠ Você ainda não tem uma conta cadastrada. Feche, cadastre a conta e importe de novo.</div>
  ) : (
    <label className="campo">
      <span>Conta do painel</span>
      <select value={contaId} onChange={(e) => setContaId(e.target.value)}>
        <option value="">Escolha a conta…</option>
        {ativas.map((c) => <option key={c.id} value={c.id}>{c.nome}{c.banco ? ` · ${c.banco}` : ''}</option>)}
      </select>
    </label>
  );

  if (etapa === 'saldo') {
    const podeContinuar = !!conta && valorFinal !== null;
    return (
      <>
        {aviso}
        <h2>1. Qual é o saldo da conta?</h2>
        <p className="nota">Cada banco monta o PDF de um jeito. Veja o que o painel achou e toque no saldo certo.</p>
        {seletorConta}
        <div role="group" aria-label="Saldos encontrados no PDF" className="imp-opcoes">
          {candidatos.saldos.map((c, i) => {
            const marcado = escolhido === c;
            return (
              <button key={i} type="button" className="imp-opcao" aria-pressed={marcado}
                onClick={() => { setEscolhido(c); setSinal(null); }}>
                <strong>{reais(c.sinalIncerto ? Math.abs(c.valor) : c.valor)}</strong>
                <span className="imp-rotulos">
                  {marcado && <b>✓ Escolhido</b>}
                  {c === sugerido && <i>Sugestão do painel: confira</i>}
                  {c.anterior && <i>saldo anterior</i>}
                  {!c.anterior && c.pontuacao < PONTUACAO_MIN_PRESELECAO && <i>pouco provável</i>}
                  <i>{c.sinalIncerto ? 'sinal incerto: escolha abaixo' : c.valor < 0 ? 'devedor (negativo)' : 'credor (positivo)'}</i>
                </span>
                <small>{c.trecho}</small>
              </button>
            );
          })}
        </div>
        {escolhido?.sinalIncerto && (
          <div role="group" aria-label="O saldo é credor ou devedor?" className="imp-opcoes">
            <p className="nota">Não consegui saber o sinal. Este saldo é:</p>
            {(['credor', 'devedor'] as const).map((s) => (
              <button key={s} type="button" className="imp-opcao" aria-pressed={sinal === s} onClick={() => setSinal(s)}>
                <strong>{s === 'credor' ? 'Credor (positivo)' : 'Devedor (negativo)'}</strong>
                <small>{sinal === s ? '✓ Escolhido · ' : ''}{s === 'credor' ? 'a conta tem dinheiro' : 'a conta está no vermelho'}</small>
              </button>
            ))}
          </div>
        )}
        <div className="acoes">
          <button type="button" className="botao cheio" disabled={!podeContinuar} onClick={() => setEtapa('data')}>Continuar</button>
          <button type="button" className="botao secundario cheio" onClick={aoFechar}>Fechar</button>
        </div>
      </>
    );
  }

  if (etapa === 'data') {
    return (
      <>
        {aviso}
        <h2>2. De que dia é esse saldo?</h2>
        <p className="nota">Toque na data do saldo ou digite. Se o extrato é de um período, use o último dia dele.</p>
        <div role="group" aria-label="Datas encontradas no PDF" className="imp-opcoes">
          {datas.map((d) => (
            <button key={d.data} type="button" className="imp-opcao" aria-pressed={data === d.data} onClick={() => setData(d.data)}>
              <strong>{dataBR(d.data)}</strong>
              <small>{data === d.data ? '✓ Escolhida · ' : ''}{d.trecho}</small>
            </button>
          ))}
        </div>
        <label className="campo">
          <span>Ou digite a data</span>
          <input type="date" value={data} min="1990-01-01" onChange={(e) => setData(e.target.value)} />
        </label>
        {data && !dataDigitada && <p className="nota" role="alert">Esta data não parece certa. Use uma data entre 1990 e o próximo ano.</p>}
        <div className="acoes">
          <button type="button" className="botao cheio" disabled={!dataDigitada} onClick={() => setEtapa('resumo')}>Continuar</button>
          <button type="button" className="botao secundario cheio" onClick={() => setEtapa('saldo')}>Voltar</button>
        </div>
      </>
    );
  }

  // resumo
  return (
    <>
      {aviso}
      <h2>3. Confira antes de salvar</h2>
      {seletorConta}
      {valorFinal !== null && dataDigitada && (
        <dl className="imp-dados">
          <div><dt>Saldo a gravar</dt><dd>{valorFinal < 0 && '⚠ Negativo: '}{reais(valorFinal)} em {dataBR(dataDigitada)}</dd></div>
          <div><dt>Saldo anterior</dt><dd>{anterior ? `${anterior.valor < 0 ? '⚠ Negativo: ' : ''}${reais(anterior.valor)} em ${dataBR(anterior.data)}` : 'nenhum ainda'}</dd></div>
          {anterior && (
            <div><dt>Diferença</dt>
              <dd>{valorFinal === anterior.valor ? 'nenhuma' : `${valorFinal > anterior.valor ? 'aumentou' : 'diminuiu'} ${reais(Math.abs(valorFinal - anterior.valor))}`}</dd></div>
          )}
        </dl>
      )}
      {!conta && <p className="nota">Escolha a conta do painel para continuar.</p>}
      {avaliacao && !avaliacao.ok && <div className="aviso" role="alert">⚠ {avaliacao.mensagem}</div>}
      {avaliacao?.ok && avaliacao.aviso && <div className="aviso atencao" role="alert">{avaliacao.aviso}</div>}
      {avaliacao?.ok && (avaliacao.precisaConfirmarMesmoDia || avaliacao.precisaConfirmarDataPosterior || avaliacao.precisaConfirmarDataAnteriorAoPeriodo) && (
        <div className="aviso atencao" role="alert">Vou pedir uma confirmação extra antes de gravar.</div>
      )}
      {avaliacao?.ok && avaliacao.precisaConfirmarMudancaGrande && (
        <div className="aviso atencao" role="alert">A mudança é grande (mais de 30%). Vou pedir uma confirmação antes de gravar.</div>
      )}
      <div className="acoes">
        {avaliacao?.ok && (
          <>
            <button type="button" className="botao cheio" disabled={salvando} onClick={() => void salvar()}>Salvar saldo</button>
            <button type="button" className="botao secundario cheio" onClick={() => setEtapa('data')}>Voltar</button>
          </>
        )}
        {!avaliacao?.ok && avaliacao && <button type="button" className="botao secundario cheio" onClick={aoFechar}>Fechar</button>}
        {!avaliacao && <button type="button" className="botao secundario cheio" onClick={() => setEtapa('data')}>Voltar</button>}
      </div>
    </>
  );
}
