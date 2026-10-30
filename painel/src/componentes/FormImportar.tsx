import { lazy, Suspense, useMemo, useRef, useState, type DragEvent } from 'react';
import { useDados } from '../dados/contexto';
import { gravarImportacao } from '../dados/importar';
import { avaliarImportacao, contaPeloFinal, ultimoSaldoValido } from '../dominio/importacao';
import { dataBR, hoje, reais } from '../dominio/formato';
import { decodificarOfx, lerOfx, TAMANHO_MAX_OFX, type ExtratoOfx } from '../dominio/ofx';
import type { CandidatosPdf } from '../dominio/extratoPdf';
import { useAviso } from './Aviso';
import { useConfirmar } from './Confirmar';
import { Folha } from './Folha';
import { ehPdf, TAMANHO_MAX_PDF } from './pdfLimites';

// A conferência do PDF também é carregada só quando precisa (junto com o leitor).
const ConferirPdf = lazy(() => import('./ConferirPdf').then((m) => ({ default: m.ConferirPdf })));

// "Importar extrato": lê um arquivo OFX (ou PDF) só neste aparelho (nada é enviado e o arquivo não é
// guardado), mostra o que achou e só grava depois que o dono confere. Rejeitado = só "Fechar": não
// existe "importar assim mesmo". As regras estão em dominio/importacao.ts. O PDF segue por uma
// conferência assistida (ConferirPdf): o dono toca no saldo e na data certos.
type Estado =
  | { tipo: 'escolher' }
  | { tipo: 'lendo' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'lido'; extrato: ExtratoOfx }
  | { tipo: 'pdf'; candidatos: CandidatosPdf; paginas: number; lidas: number };

export function FormImportar({ aoFechar, aoDigitarSaldo }: { aoFechar: () => void; aoDigitarSaldo?: () => void }) {
  const { contas, saldos, salvarSaldo, salvarConta } = useDados();
  const avisar = useAviso();
  const confirmar = useConfirmar();
  const entrada = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<Estado>({ tipo: 'escolher' });
  const [contaId, setContaId] = useState('');
  const [arrastando, setArrastando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const ativas = contas.filter((c) => c.ativa);

  async function ler(arquivo: File | undefined) {
    if (!arquivo) return;
    setEstado({ tipo: 'lendo' });
    try {
      const eraPdf = ehPdf(new Uint8Array(await arquivo.slice(0, 1024).arrayBuffer()));
      if (!eraPdf && /\.pdf$/i.test(arquivo.name)) {
        setEstado({ tipo: 'erro', mensagem: 'Este arquivo não é um PDF válido.' });
        return;
      }
      if (eraPdf) {
        if (arquivo.size > TAMANHO_MAX_PDF) {
          setEstado({ tipo: 'erro', mensagem: 'O PDF é grande demais (o limite é 10 MB).' });
          return;
        }
        // O leitor de PDF (pdf.js) só é baixado agora, quando alguém importa um PDF.
        const { lerCandidatosDoPdf } = await import('./lerPdf');
        const leitura = await lerCandidatosDoPdf(await arquivo.arrayBuffer());
        if (!leitura.ok) {
          setEstado({ tipo: 'erro', mensagem: leitura.erro });
          return;
        }
        setEstado({ tipo: 'pdf', candidatos: leitura.candidatos, paginas: leitura.paginas, lidas: leitura.lidas });
        return;
      }
      if (arquivo.size > TAMANHO_MAX_OFX) {
        setEstado({ tipo: 'erro', mensagem: 'O arquivo é muito grande para ser um extrato (o limite é 5 MB).' });
        return;
      }
      // O conteúdo só existe nesta função: no estado fica apenas o resultado da leitura.
      const r = lerOfx(decodificarOfx(await arquivo.arrayBuffer()));
      if (!r.ok) {
        setEstado({ tipo: 'erro', mensagem: r.erro });
        return;
      }
      setContaId(contaPeloFinal(contas, r.extrato.contaFinal)?.id ?? '');
      setEstado({ tipo: 'lido', extrato: r.extrato });
    } catch {
      setEstado({ tipo: 'erro', mensagem: 'Não consegui ler este arquivo.' });
    } finally {
      if (entrada.current) entrada.current.value = '';
    }
  }

  const extrato = estado.tipo === 'lido' ? estado.extrato : null;
  const conta = ativas.find((c) => c.id === contaId);
  const avaliacao = useMemo(
    () => (extrato && conta ? avaliarImportacao(extrato, conta, saldos, hoje()) : null),
    [extrato, conta, saldos],
  );
  const anterior = conta ? ultimoSaldoValido(conta.id, saldos, hoje()) : null;
  const outraComEsteFinal = extrato && conta && !conta.finalConta
    ? ativas.find((c) => c.id !== conta.id && c.finalConta === extrato.contaFinal)
    : undefined;

  async function salvar() {
    if (!extrato || !conta || !avaliacao?.ok || salvando) return;
    if (avaliacao.precisaConfirmarMudancaGrande && avaliacao.anterior) {
      const ok = await confirmar({
        texto: `Isso troca o saldo de ${reais(avaliacao.anterior.valor)} para ${reais(extrato.saldo)}. Gravar?`,
        acao: 'Gravar',
      });
      if (!ok) return;
    }
    setSalvando(true);
    try {
      const r = await gravarImportacao({ salvarSaldo, salvarConta }, extrato, conta, saldos, hoje());
      if (!r.ok) {
        setEstado({ tipo: 'erro', mensagem: r.mensagem });
        setSalvando(false);
        return;
      }
      avisar('Saldo atualizado');
      aoFechar();
    } catch (e) {
      avisar('Não foi possível salvar: ' + String(e));
      setSalvando(false);
    }
  }

  const soltar = (e: DragEvent) => {
    e.preventDefault();
    setArrastando(false);
    void ler(e.dataTransfer.files[0]);
  };

  return (
    <Folha titulo="Importar extrato" aoFechar={aoFechar}>
      <div className="imp">
      {(estado.tipo === 'escolher' || estado.tipo === 'lendo') && (
        <div className={'imp-zona' + (arrastando ? ' sobre' : '')}
          onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
          onDragLeave={() => setArrastando(false)} onDrop={soltar}>
          <p>Escolha o extrato que você baixou do banco: OFX (o mais seguro) ou PDF. Ele é lido só neste aparelho: nada é enviado e o arquivo não fica guardado.</p>
          <input ref={entrada} type="file" accept=".ofx,.OFX,.qfx,application/x-ofx,text/plain,.pdf,application/pdf" hidden
            aria-label="Arquivo do extrato (OFX)" onChange={(e) => void ler(e.target.files?.[0])} />
          <button type="button" className="botao cheio" disabled={estado.tipo === 'lendo'} onClick={() => entrada.current?.click()}>
            {estado.tipo === 'lendo' ? 'Lendo o arquivo…' : 'Escolher arquivo'}
          </button>
          <p className="nota imp-arraste">Ou arraste o arquivo e solte aqui.</p>
        </div>
      )}

      {estado.tipo === 'pdf' && (
        <Suspense fallback={<p className="nota" role="status">Carregando…</p>}>
          <ConferirPdf candidatos={estado.candidatos} paginas={estado.paginas} lidas={estado.lidas}
            aoFechar={aoFechar} aoDigitarSaldo={aoDigitarSaldo} />
        </Suspense>
      )}

      {estado.tipo === 'erro' && (
        <>
          <div className="aviso" role="alert">⚠ {estado.mensagem}</div>
          <div className="acoes"><button type="button" className="botao secundario cheio" onClick={aoFechar}>Fechar</button></div>
        </>
      )}

      {extrato && (
        <>
          <h2>Confira antes de salvar</h2>
          <dl className="imp-dados">
            <div><dt>Banco no arquivo</dt><dd>{extrato.banco ?? 'não informado'}</dd></div>
            <div><dt>Conta no arquivo</dt><dd>final {extrato.contaFinal}{extrato.tipoConta === 'poupanca' ? ' · poupança' : ''}</dd></div>
            <div><dt>Data do saldo</dt><dd>{dataBR(extrato.data)}</dd></div>
            <div><dt>Saldo no extrato</dt><dd>{extrato.saldo < 0 && '⚠ Negativo: '}{reais(extrato.saldo)}</dd></div>
          </dl>

          {ativas.length === 0 ? (
            <div className="aviso" role="alert">⚠ Você ainda não tem uma conta cadastrada. Feche, cadastre a conta e importe de novo.</div>
          ) : (
            <label className="campo">
              <span>Conta do painel</span>
              <select value={contaId} onChange={(e) => setContaId(e.target.value)}>
                <option value="">Escolha a conta…</option>
                {ativas.map((c) => <option key={c.id} value={c.id}>{c.nome}{c.banco ? ` · ${c.banco}` : ''}{c.finalConta ? ` · final ${c.finalConta}` : ''}</option>)}
              </select>
            </label>
          )}

          {conta && !conta.finalConta && !outraComEsteFinal && (
            <p className="nota">Ao salvar, o painel guarda o final {extrato.contaFinal} nesta conta, para reconhecê-la nas próximas vezes.</p>
          )}
          {outraComEsteFinal && (
            <div className="aviso atencao" role="status">
              Atenção: a conta “{outraComEsteFinal.nome}” já tem o final {extrato.contaFinal}. Confira se é mesmo esta conta.
            </div>
          )}

          {avaliacao && (
            <>
              <dl className="imp-dados">
                <div><dt>Saldo anterior</dt><dd>{anterior ? `${anterior.valor < 0 ? '⚠ Negativo: ' : ''}${reais(anterior.valor)} em ${dataBR(anterior.data)}` : 'nenhum ainda'}</dd></div>
                {anterior && (
                  <div><dt>Diferença</dt>
                    <dd>{extrato.saldo === anterior.valor ? 'nenhuma' : `${extrato.saldo > anterior.valor ? 'aumentou' : 'diminuiu'} ${reais(Math.abs(extrato.saldo - anterior.valor))}`}</dd></div>
                )}
              </dl>
              {!avaliacao.ok && <div className="aviso" role="alert">⚠ {avaliacao.mensagem}</div>}
              {avaliacao.ok && avaliacao.aviso && <div className="aviso atencao" role="alert">{avaliacao.aviso}</div>}
              {avaliacao.ok && avaliacao.precisaConfirmarMudancaGrande && (
                <div className="aviso atencao" role="alert">A mudança é grande (mais de 30%). Vou pedir uma confirmação antes de gravar.</div>
              )}
            </>
          )}

          <div className="acoes">
            {avaliacao?.ok
              ? <button type="button" className="botao cheio" disabled={salvando} onClick={() => void salvar()}>Salvar saldo</button>
              : <button type="button" className="botao secundario cheio" onClick={aoFechar}>Fechar</button>}
          </div>
        </>
      )}
      </div>
    </Folha>
  );
}
