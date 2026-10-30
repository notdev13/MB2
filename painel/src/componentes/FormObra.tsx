import { useState } from 'react';
import { useDados } from '../dados/contexto';
import { hoje, lerNumero, lerReais, reaisParaCampo } from '../dominio/formato';
import { STATUS_OBRA, type Obra, type StatusObra } from '../dominio/tipos';
import { useAviso } from './Aviso';
import { useConfirmar } from './Confirmar';
import { Folha } from './Folha';

export function FormObra({ obra, aoFechar, aoSalvar, aoExcluir }: {
  obra?: Obra;
  aoFechar: () => void;
  aoSalvar?: (o: Obra) => void;
  aoExcluir?: () => void;
}) {
  const { custos, salvarObra, excluirObra } = useDados();
  const avisar = useAviso();
  const confirmar = useConfirmar();
  const [nome, setNome] = useState(obra?.nome ?? '');
  const [endereco, setEndereco] = useState(obra?.endereco ?? '');
  const [cliente, setCliente] = useState(obra?.cliente ?? '');
  const [orcamento, setOrcamento] = useState(obra && obra.orcamento > 0 ? reaisParaCampo(obra.orcamento) : '');
  const [area, setArea] = useState(obra?.areaM2 ? String(obra.areaM2).replace('.', ',') : '');
  const [inicio, setInicio] = useState(obra?.inicio ?? '');
  const [previsaoFim, setPrevisaoFim] = useState(obra?.previsaoFim ?? '');
  const [status, setStatus] = useState<StatusObra>(obra?.status ?? 'em_andamento');
  const [observacoes, setObservacoes] = useState(obra?.observacoes ?? '');
  const [conta, setConta] = useState(obra?.contaBancaria ?? '');
  const [saldo, setSaldo] = useState(obra?.saldoConta != null ? reaisParaCampo(obra.saldoConta) : '');
  const [tentou, setTentou] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const centavos = orcamento.trim() ? lerReais(orcamento) : 0;
  const areaNum = area.trim() ? lerNumero(area) : null;
  const saldoCentavos = saldo.trim() ? lerReais(saldo) : null;
  const erros = {
    saldo: saldo.trim() && saldoCentavos === null ? 'Valor inválido.' : null,
    nome: nome.trim() ? null : 'Dê um nome para a obra.',
    orcamento: centavos === null || centavos < 0 ? 'Valor inválido.' : null,
    area: area.trim() && !(areaNum !== null && areaNum > 0) ? 'Área inválida.' : null,
    datas: inicio && previsaoFim && previsaoFim < inicio ? 'A previsão de término é antes do início.' : null,
  };

  async function salvar() {
    setTentou(true);
    if (Object.values(erros).some(Boolean) || salvando) return;
    setSalvando(true);
    try {
      const salva = await salvarObra({
        nome: nome.trim(), endereco: endereco.trim(), cliente: cliente.trim(), orcamento: centavos ?? 0,
        areaM2: areaNum, inicio: inicio || null, previsaoFim: previsaoFim || null, status, observacoes: observacoes.trim(),
        contaBancaria: conta.trim(),
        saldoConta: saldoCentavos,
        // Só muda a data quando o saldo muda; apagar o saldo apaga a data.
        saldoContaEm: saldoCentavos === null ? null : saldoCentavos === (obra?.saldoConta ?? null) ? obra?.saldoContaEm ?? hoje() : hoje(),
      }, obra?.id);
      avisar(obra ? 'Obra atualizada' : 'Obra cadastrada');
      aoSalvar?.(salva);
      aoFechar();
    } catch (e) {
      avisar('Não foi possível salvar: ' + String(e));
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!obra) return;
    const qtd = custos.filter((c) => c.obraId === obra.id).length;
    const msg = qtd > 0
      ? `Excluir "${obra.nome}" e os ${qtd} lançamento(s) de custo dela? Não dá para desfazer.`
      : `Excluir "${obra.nome}"?`;
    if (!(await confirmar({ texto: msg, acao: 'Excluir obra', perigo: true }))) return;
    setSalvando(true);
    try {
      await excluirObra(obra.id);
      avisar('Obra excluída');
      aoFechar();
      aoExcluir?.();
    } catch (e) {
      avisar('Não foi possível excluir: ' + String(e));
      setSalvando(false);
    }
  }

  return (
    <Folha titulo={obra ? 'Editar obra' : 'Nova obra'} aoFechar={aoFechar}>
      <form onSubmit={(e) => { e.preventDefault(); salvar(); }} noValidate>
        <label className="campo">
          <span>Nome da obra</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Casa Campeche · Lote 12" autoFocus={!obra} />
          {tentou && erros.nome && <span className="erro">{erros.nome}</span>}
        </label>
        <label className="campo">
          <span>Endereço</span>
          <input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, bairro" />
        </label>
        <label className="campo">
          <span>Cliente ou proprietário</span>
          <input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Opcional" />
        </label>
        <div className="dupla">
          <label className="campo">
            <span>Orçamento (R$)</span>
            <input inputMode="decimal" value={orcamento} onChange={(e) => setOrcamento(e.target.value)} placeholder="0,00" />
            {tentou && erros.orcamento && <span className="erro">{erros.orcamento}</span>}
          </label>
          <label className="campo">
            <span>Área (m²)</span>
            <input inputMode="decimal" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Ex.: 220" />
            {tentou && erros.area && <span className="erro">{erros.area}</span>}
          </label>
        </div>
        <div className="dupla">
          <label className="campo">
            <span>Início</span>
            <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </label>
          <label className="campo">
            <span>Previsão de término</span>
            <input type="date" value={previsaoFim} onChange={(e) => setPrevisaoFim(e.target.value)} />
          </label>
        </div>
        {tentou && erros.datas && <p className="aviso">{erros.datas}</p>}
        <label className="campo">
          <span>Situação</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as StatusObra)}>
            {Object.entries(STATUS_OBRA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <div className="dupla">
          <label className="campo">
            <span>Conta bancária da obra</span>
            <input value={conta} onChange={(e) => setConta(e.target.value)} placeholder="Ex.: Itaú PJ · final 1234" />
          </label>
          <label className="campo">
            <span>Saldo atual da conta (R$)</span>
            <input inputMode="decimal" value={saldo} onChange={(e) => setSaldo(e.target.value)} placeholder="0,00" />
            {tentou && erros.saldo && <span className="erro">{erros.saldo}</span>}
          </label>
        </div>
        <label className="campo">
          <span>Observações</span>
          <textarea rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        </label>
        <div className="acoes">
          <button className="botao cheio" type="submit" disabled={salvando}>Salvar</button>
          {obra && <button className="botao perigo cheio" type="button" disabled={salvando} onClick={excluir}>Excluir obra</button>}
        </div>
      </form>
    </Folha>
  );
}
