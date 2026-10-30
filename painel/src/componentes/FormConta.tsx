import { useState } from 'react';
import { useDados } from '../dados/contexto';
import { comSaldoAtualizado, novaConta } from '../dominio/contas';
import { hoje, lerReais, reaisParaCampo } from '../dominio/formato';
import type { Conta } from '../dominio/tipos';
import { useAviso } from './Aviso';
import { useConfirmar } from './Confirmar';
import { Folha } from './Folha';

// Cadastro de conta (nome, de quem é, saldo) e atualização rápida de saldo (soSaldo).
// Só o apelido da conta é guardado, nunca agência e número.
export function FormConta({ conta, obraId, soSaldo, aoFechar }: {
  conta?: Conta;
  obraId?: string; // pré-seleciona a obra ao criar a conta a partir dela
  soSaldo?: boolean;
  aoFechar: () => void;
}) {
  const { obras, contas, salvarConta, excluirConta } = useDados();
  const avisar = useAviso();
  const confirmar = useConfirmar();
  // Cada obra tem uma conta só; a conta principal também é única.
  const ocupados = new Set(contas.filter((c) => c.id !== conta?.id).map((c) => c.obraId ?? ''));
  const opcoes = [
    { valor: '', rotulo: 'Conta principal da empresa' },
    ...obras.filter((o) => o.status !== 'concluida' || o.id === conta?.obraId).map((o) => ({ valor: o.id, rotulo: `Conta da obra ${o.nome}` })),
  ].filter((o) => !ocupados.has(o.valor));

  const [nome, setNome] = useState(conta?.nome ?? '');
  const [dono, setDono] = useState<string>(conta ? (conta.obraId ?? '') : (opcoes.some((o) => o.valor === (obraId ?? '')) ? (obraId ?? '') : (opcoes[0]?.valor ?? '')));
  const [saldo, setSaldo] = useState(conta ? reaisParaCampo(conta.saldo) : '');
  const [data, setData] = useState(hoje());
  const [tentou, setTentou] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const centavos = saldo.trim() ? lerReais(saldo) : null;
  const erros = {
    nome: nome.trim() ? null : 'Dê um nome para a conta.',
    dono: opcoes.some((o) => o.valor === dono) ? null : 'Essa obra (ou a conta principal) já tem conta.',
    saldo: centavos === null ? 'Informe o saldo atual.' : null,
    data: data && data <= hoje() ? null : 'A data do saldo não pode ser no futuro.',
  };
  const invalido = (soSaldo ? [erros.saldo, erros.data] : Object.values(erros)).some(Boolean);

  async function salvar() {
    setTentou(true);
    if (invalido || salvando || centavos === null) return;
    setSalvando(true);
    try {
      if (conta) {
        const base = comSaldoAtualizado(conta, centavos, data);
        const mudouSaldo = centavos !== conta.saldo || data !== conta.saldoEm;
        const dados = soSaldo
          ? base
          : { ...base, nome: nome.trim(), tipo: dono ? 'obra' as const : 'principal' as const, obraId: dono || null };
        await salvarConta(mudouSaldo ? dados : { ...dados, saldo: conta.saldo, saldoEm: conta.saldoEm, historico: conta.historico }, conta.id);
        avisar(soSaldo ? 'Saldo atualizado' : 'Conta atualizada');
      } else {
        await salvarConta({ ...novaConta({ nome: nome.trim(), obraId: dono || null, saldo: centavos, data }) });
        avisar('Conta cadastrada');
      }
      aoFechar();
    } catch (e) {
      avisar('Não foi possível salvar: ' + String(e));
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!conta || !(await confirmar({ texto: `Excluir a conta "${conta.nome}" e o histórico de saldos dela?`, acao: 'Excluir conta', perigo: true }))) return;
    setSalvando(true);
    try {
      await excluirConta(conta.id);
      avisar('Conta excluída');
      aoFechar();
    } catch (e) {
      avisar('Não foi possível excluir: ' + String(e));
      setSalvando(false);
    }
  }

  return (
    <Folha titulo={soSaldo ? 'Atualizar saldo' : conta ? 'Editar conta' : 'Nova conta'} aoFechar={aoFechar}>
      <form onSubmit={(e) => { e.preventDefault(); salvar(); }} noValidate>
        {soSaldo && conta && <p className="sub">{conta.nome}</p>}
        {!soSaldo && (
          <>
            <label className="campo">
              <span>Nome da conta</span>
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Itaú PJ · final 1234" autoFocus={!conta} />
              {tentou && erros.nome && <span className="erro">{erros.nome}</span>}
            </label>
            <label className="campo">
              <span>De quem é</span>
              <select value={dono} onChange={(e) => setDono(e.target.value)}>
                {opcoes.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
              </select>
              {tentou && erros.dono && <span className="erro">{erros.dono}</span>}
            </label>
          </>
        )}
        <div className="dupla">
          <label className="campo">
            <span>Saldo atual (R$)</span>
            <input inputMode="decimal" value={saldo} onChange={(e) => setSaldo(e.target.value)} placeholder="0,00" autoFocus={!!conta} />
            {tentou && erros.saldo && <span className="erro">{erros.saldo}</span>}
          </label>
          <label className="campo">
            <span>Saldo de</span>
            <input type="date" value={data} max={hoje()} onChange={(e) => setData(e.target.value)} />
            {tentou && erros.data && <span className="erro">{erros.data}</span>}
          </label>
        </div>
        <div className="acoes">
          <button className="botao cheio" type="submit" disabled={salvando}>Salvar</button>
          {conta && !soSaldo && <button className="botao perigo cheio" type="button" disabled={salvando} onClick={excluir}>Excluir conta</button>}
        </div>
      </form>
    </Folha>
  );
}
