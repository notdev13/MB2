import { useId, useMemo, useState } from 'react';
import { useDados } from '../dados/contexto';
import { porMes, resumirObra, type ResumoObra } from '../dominio/calculos';
import { hoje, mesAno, porcentagem, reais, reaisCurto } from '../dominio/formato';
import { historicoSaldo, mesDoPico, PERIODOS, totalDoPeriodo, usoLimitado, variacaoSerie, type Periodo } from '../dominio/paineis';
import { contasComSaldo, type ContaComSaldo } from '../dominio/saldos';
import { curvaSuave } from './curva';

// Painéis da Visão geral (celular e computador): bloco escuro com título em serifa,
// primeira palavra em itálico, e um cartão de vidro com os dados.

const DIAS_PARA_CONFERIR = 7;
const LARGURA_BARRA = 46; // % do cartão ocupado pela barra do orçamento (o resto é o rótulo)
// Cor de cada obra na ordem da lista (variações claras, legíveis no fundo escuro).
const CORES = ['var(--iris-claro)', 'var(--orquidea-claro)', 'var(--pervinca-claro)', 'var(--iris-escuro-claro)', 'var(--iris-palido)'];
const cor = (i: number) => CORES[i % CORES.length];
const iniciais = (nome: string) => nome.replace(/^(obra|lote|projeto|terreno)\s+/i, '').slice(0, 2).toUpperCase();

export function Paineis({ aoAbrirObra, aoAtualizarSaldo, aoLancar }: {
  aoAbrirObra: (id: string) => void; aoAtualizarSaldo: () => void; aoLancar: () => void;
}) {
  const { obras, custos, contas, saldos } = useDados();
  const ref = hoje();
  const resumos = useMemo(
    () => obras.filter((o) => o.status !== 'concluida').map((o) => resumirObra(o, custos)),
    [obras, custos],
  );
  const itens = useMemo(() => contasComSaldo(contas, saldos, ref), [contas, saldos, ref]);
  if (resumos.length === 0) return null;
  return (
    <section className="pn-grade" aria-label="Resumo em painéis">
      <PainelGasto resumos={resumos} aoLancar={aoLancar} />
      <PainelOrcamento resumos={resumos} />
      <PainelObra resumos={resumos} itens={itens} aoAbrirObra={aoAbrirObra} />
      <PainelCaixa itens={itens} aoAtualizarSaldo={aoAtualizarSaldo} />
    </section>
  );
}

function Painel({ destaque, resto, texto, children }: { destaque: string; resto: string; texto: string; children: React.ReactNode }) {
  return (
    <div className="pn">
      <h3 className="pn-titulo"><i>{destaque}</i> {resto}</h3>
      <p className="pn-texto">{texto}</p>
      {children}
    </div>
  );
}

function PainelGasto({ resumos, aoLancar }: { resumos: ResumoObra[]; aoLancar: () => void }) {
  const { custos } = useDados();
  const [periodo, setPeriodo] = useState<Periodo>('1A');
  const ativas = new Set(resumos.map((r) => r.obra.id));
  const meses = porMes(custos.filter((c) => ativas.has(c.obraId)), hoje(), PERIODOS[periodo]);
  const total = totalDoPeriodo(meses);
  const pico = mesDoPico(meses);
  const curva = curvaSuave(meses.map((m) => m.total), 320, 140, 8, 14);
  return (
    <Painel destaque="Acompanhe" resto="o gasto das obras" texto="Tudo o que sai das obras em aberto, mês a mês, num só lugar.">
      <div className="pn-vidro">
        <div className="pn-cab">Gasto</div>
        <div className="pn-corpo">
          <div className="pn-apoio">Gasto de {mesAno(meses[0].mes)} a {mesAno(meses[meses.length - 1].mes)}</div>
          <div className="pn-total">
            <span className="pn-grande">{reaisCurto(total)}</span>
            {pico && <span className="pn-apoio">pico em {mesAno(pico)}</span>}
          </div>
          {total > 0 ? (
            <svg className="pn-linha" viewBox="0 0 320 140" role="img" aria-label={`Gasto por mês nos últimos ${PERIODOS[periodo]} meses`}>
              <path d={curva.d} fill="none" stroke="var(--dado)" strokeWidth="2" strokeLinecap="round" />
              <circle cx={curva.fim[0]} cy={curva.fim[1]} r="7" fill="var(--dado)" opacity="0.2" />
              <circle cx={curva.fim[0]} cy={curva.fim[1]} r="3.5" fill="var(--dado)" />
            </svg>
          ) : (
            <div className="pn-sem">
              <p>Nenhum gasto nesse período.</p>
              <button type="button" className="botao secundario pequeno" onClick={aoLancar}>Lançar custo</button>
            </div>
          )}
          <div className="pn-periodos" role="group" aria-label="Período">
            {(Object.keys(PERIODOS) as Periodo[]).map((p) => (
              <button key={p} type="button" aria-pressed={periodo === p} onClick={() => setPeriodo(p)}>{p}</button>
            ))}
          </div>
        </div>
      </div>
    </Painel>
  );
}

function PainelOrcamento({ resumos }: { resumos: ResumoObra[] }) {
  return (
    <Painel destaque="Compare" resto="gasto e orçamento" texto="Quanto cada obra já usou do orçamento e onde está apertando.">
      <div className="pn-vidro">
        <div className="pn-cab">Obras e orçamento</div>
        {resumos.map((r, i) => (
          <div key={r.obra.id} className="pn-aloc">
            <div className="pn-nome">{r.obra.nome}</div>
            {r.obra.orcamento > 0 ? (
              <>
                <div className="pn-barra">
                  <span className="pn-cheia" style={{ width: `${usoLimitado(r.gasto, r.obra.orcamento) * LARGURA_BARRA}%`, background: cor(i) }} />
                  <span className={r.saldo < 0 ? 'pn-estourou' : undefined}>
                    {r.saldo < 0 && '⚠ '}Gasto ({porcentagem(r.gasto, r.obra.orcamento)}%)
                  </span>
                </div>
                <div className="pn-barra">
                  <span className="pn-tracejada" style={{ width: `${LARGURA_BARRA}%`, borderColor: cor(i) }} />
                  <span>Orçamento {reaisCurto(r.obra.orcamento)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="pn-barra">
                  <span className="pn-cheia" style={{ width: `${LARGURA_BARRA * 0.6}%`, background: cor(i) }} />
                  <span>Gasto {reaisCurto(r.gasto)}</span>
                </div>
                <div className="pn-barra pn-apagado">Sem orçamento cadastrado</div>
              </>
            )}
          </div>
        ))}
      </div>
    </Painel>
  );
}

function PainelObra({ resumos, itens, aoAbrirObra }: { resumos: ResumoObra[]; itens: ContaComSaldo[]; aoAbrirObra: (id: string) => void }) {
  const [escolhida, setEscolhida] = useState(resumos[0].obra.id);
  const i = Math.max(0, resumos.findIndex((r) => r.obra.id === escolhida));
  const r = resumos[i];
  const totalGeral = resumos.reduce((t, x) => t + x.gasto, 0);
  const contasDela = itens.filter((c) => c.conta.obraId === r.obra.id && c.saldo);
  const saldo = contasDela.reduce((t, c) => t + (c.saldo?.valor ?? 0), 0);
  const dias = contasDela.length ? Math.max(...contasDela.map((c) => c.dias ?? 0)) : null;
  const parte = porcentagem(r.gasto, totalGeral);
  return (
    <Painel destaque="Entre" resto="em qualquer obra" texto="Gasto, orçamento e saldo da conta de cada obra, sem procurar.">
      <div className="pn-vidro">
        <div className="pn-cab">
          Sua obra
          <button type="button" onClick={() => aoAbrirObra(r.obra.id)}>Abrir →</button>
        </div>
        <div className="pn-avatares" role="group" aria-label="Escolher obra">
          {resumos.map((x, j) => (
            <button key={x.obra.id} type="button" aria-pressed={x.obra.id === r.obra.id} aria-label={x.obra.nome} title={x.obra.nome}
              style={{ background: cor(j) }} onClick={() => setEscolhida(x.obra.id)}>{iniciais(x.obra.nome)}</button>
          ))}
          <span>{r.obra.nome}</span>
        </div>
        <div className="pn-lin"><span>Total gasto</span><span className="pn-num">{reais(r.gasto)}</span></div>
        <div className="pn-lin"><span>Orçamento</span><span className="pn-num">{r.obra.orcamento > 0 ? reais(r.obra.orcamento) : 'Não cadastrado'}</span></div>
        <div className="pn-lin">
          <span>Saldo da conta</span>
          <span className="pn-num">
            {dias === null ? 'Sem saldo digitado' : <>{saldo < 0 && '⚠ '}{reais(saldo)}{' '}
              <small className={dias > DIAS_PARA_CONFERIR ? 'pn-ruim' : 'pn-bom'}>{dias > DIAS_PARA_CONFERIR ? 'atualizar' : 'em dia'}</small></>}
          </span>
        </div>
        <div className="pn-lin"><span>A pagar</span><span className="pn-num">{reais(r.aPagar)}</span></div>
        <div className="pn-lin"><span>Parte do total</span><span className="pn-num">{parte}%</span></div>
        <div className="pn-rodape"><div className="trilho"><i style={{ width: `${parte}%` }} /></div></div>
      </div>
    </Painel>
  );
}

function PainelCaixa({ itens, aoAtualizarSaldo }: { itens: ContaComSaldo[]; aoAtualizarSaldo: () => void }) {
  const { obras, saldos } = useDados();
  const comSaldo = itens.filter((i) => i.saldo).sort((a, b) => Number(a.conta.obraId !== null) - Number(b.conta.obraId !== null)).slice(0, 4);
  return (
    <Painel destaque="Acompanhe" resto="o caixa" texto="O saldo de cada conta, com a tendência dos últimos registros.">
      <div className="pn-vidro">
        <div className="pn-cab">
          Contas em um olhar
          <button type="button" onClick={aoAtualizarSaldo}>Atualizar saldo</button>
        </div>
        {comSaldo.length === 0 ? (
          <div className="pn-corpo pn-sem">
            <p>Digite o saldo das contas para ver a tendência aqui.</p>
            <button type="button" className="botao secundario pequeno" onClick={aoAtualizarSaldo}>Atualizar saldo</button>
          </div>
        ) : (
          <div className="pn-mini">
            {comSaldo.map((c) => {
              const nome = c.conta.obraId === null ? 'MB2' : (obras.find((o) => o.id === c.conta.obraId)?.nome ?? c.conta.nome);
              return <MiniConta key={c.conta.id} nome={nome} serie={historicoSaldo(c.conta.id, saldos)} saldo={c.saldo!.valor} />;
            })}
          </div>
        )}
      </div>
    </Painel>
  );
}

function MiniConta({ nome, serie, saldo }: { nome: string; serie: number[]; saldo: number }) {
  const id = useId();
  const v = variacaoSerie(serie);
  const caiu = v !== null && v < 0;
  const traco = caiu ? 'var(--alerta)' : 'var(--bone)';
  const c = curvaSuave(serie, 140, 46, 2, 6);
  return (
    <div className="pn-mcard">
      <svg viewBox="0 0 140 46" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={traco} stopOpacity="0.28" />
            <stop offset="1" stopColor={traco} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${c.d} L${c.fim[0]} 46 L${c.inicio[0]} 46Z`} fill={`url(#${id})`} />
        <path d={c.d} fill="none" stroke={traco} strokeWidth="1.6" />
      </svg>
      <div className="pn-mnome">{nome}</div>
      <div className="pn-mvalor">{saldo < 0 && '⚠ '}{reaisCurto(saldo)}</div>
      <div className="pn-mvar">
        {v === null ? 'um registro só' : <span className={caiu ? 'pn-ruim' : undefined}>
          {v >= 0 ? '+' : ''}{v.toFixed(1).replace('.', ',')}% {caiu ? '↘' : '↗'}</span>}
      </div>
    </div>
  );
}
