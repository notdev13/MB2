import { useCallback, useEffect, useState } from 'react';
import { AvisoProvider } from '../componentes/Aviso';
import { ConfirmarProvider } from '../componentes/Confirmar';
import { FormCusto } from '../componentes/FormCusto';
import { FormObra } from '../componentes/FormObra';
import { useDados } from '../dados/contexto';
import type { Custo, Obra } from '../dominio/tipos';
import { useTema } from '../tema';
import { Ajustes } from '../telas/Ajustes';
import { IconeD, SeloStatus, type NomeIconeD } from './componentes/Base';
import { irD, linkD, useRotaD, type RotaD } from './rotas';
import { ID_BUSCA, LancamentosD } from './telas/LancamentosD';
import { ObraD } from './telas/ObraD';
import { ObrasD } from './telas/ObrasD';
import { VisaoD } from './telas/VisaoD';
import './desktop.css';

// Casca da versão para computador: menu lateral fixo, cabeçalho da página e área de conteúdo.
// Dados, regras e formulários são os mesmos do celular; o layout e os componentes são próprios.

type Gaveta =
  | { tipo: 'custo'; custo?: Custo; obraId?: string }
  | { tipo: 'obra'; obra?: Obra }
  | null;

const MENU: { rota: RotaD; rotulo: string; icone: NomeIconeD }[] = [
  { rota: { tela: 'visao' }, rotulo: 'Visão geral', icone: 'visao' },
  { rota: { tela: 'obras' }, rotulo: 'Obras', icone: 'obras' },
  { rota: { tela: 'lancamentos' }, rotulo: 'Lançamentos', icone: 'lancamentos' },
  { rota: { tela: 'ajustes' }, rotulo: 'Ajustes', icone: 'ajustes' },
];

const TITULOS: Record<Exclude<RotaD['tela'], 'obra'>, [string, string]> = {
  visao: ['Visão geral', 'Como estão as obras e o caixa de cada uma.'],
  obras: ['Obras', 'Todas as obras, com orçamento e gasto.'],
  lancamentos: ['Lançamentos', 'Todos os custos lançados, com filtros e busca.'],
  ajustes: ['Ajustes', 'Tema, sincronização e backup dos dados.'],
};

export function AppDesktop() {
  return (
    <div className="dk">
      <AvisoProvider>
        <ConfirmarProvider>
          <Casca />
        </ConfirmarProvider>
      </AvisoProvider>
    </div>
  );
}

function Casca() {
  const rota = useRotaD();
  const [tema, alternarTema] = useTema();
  const { carregando, erro, obras } = useDados();
  const [gaveta, setGaveta] = useState<Gaveta>(null);
  const fechar = useCallback(() => setGaveta(null), []);
  const obraAtual = rota.tela === 'obra' ? obras.find((o) => o.id === rota.id) : undefined;

  const lancar = useCallback(
    () => setGaveta({ tipo: 'custo', obraId: rota.tela === 'obra' ? rota.id : undefined }),
    [rota],
  );
  const novaObra = () => setGaveta({ tipo: 'obra' });
  const abrirCusto = (c: Custo) => setGaveta({ tipo: 'custo', custo: c });

  // Link "#/obras?nova=1" (vem do formulário de custo quando não há obras) abre o cadastro de obra.
  useEffect(() => {
    if (window.location.hash.includes('nova=1')) {
      setGaveta({ tipo: 'obra' });
      window.history.replaceState(null, '', '#/obras');
    }
  }, [rota]);

  // Atalhos: N lança um custo, / vai para a busca dos lançamentos.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      if (gaveta || e.metaKey || e.ctrlKey || e.altKey || alvo.closest('input, select, textarea, [role=dialog], [role=alertdialog]')) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        lancar();
      } else if (e.key === '/') {
        e.preventDefault();
        if (rota.tela !== 'lancamentos') irD({ tela: 'lancamentos' });
        setTimeout(() => document.getElementById(ID_BUSCA)?.focus(), 50);
      }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [gaveta, lancar, rota]);

  const [titulo, subtitulo] = rota.tela === 'obra'
    ? [obraAtual?.nome ?? 'Obra', '']
    : TITULOS[rota.tela];

  return (
    <>
      <div className="d-app" inert={gaveta !== null}>
        <aside className="d-lateral">
          <a className="d-marca" href={linkD({ tela: 'visao' })} aria-label="MB2 Painel, visão geral">
            <b>MB<sup>²</sup></b>
            <span>PAINEL DE OBRAS</span>
          </a>
          <button type="button" className="d-botao primario largo" onClick={lancar}>
            <IconeD nome="mais" tamanho={16} /> Lançar custo <kbd>N</kbd>
          </button>
          <nav aria-label="Seções">
            {MENU.map((m) => {
              const ativo = rota.tela === m.rota.tela || (m.rota.tela === 'obras' && rota.tela === 'obra');
              return (
                <a key={m.rotulo} href={linkD(m.rota)} className="d-menu" aria-current={ativo ? 'page' : undefined}>
                  <IconeD nome={m.icone} /> {m.rotulo}
                </a>
              );
            })}
          </nav>
          {obras.length > 0 && (
            <div className="d-atalhos">
              <span className="d-rotulo">Obras em aberto</span>
              {obras.filter((o) => o.status !== 'concluida').map((o) => (
                <a key={o.id} href={linkD({ tela: 'obra', id: o.id })} className="d-menu sub d-corta"
                  aria-current={rota.tela === 'obra' && rota.id === o.id ? 'page' : undefined}>{o.nome}</a>
              ))}
            </div>
          )}
          <div className="d-lateral-pe">
            <button type="button" className="d-menu" onClick={alternarTema}>
              <IconeD nome={tema === 'claro' ? 'lua' : 'sol'} /> {tema === 'claro' ? 'Tema escuro' : 'Tema claro'}
            </button>
            <small>Atalhos: <kbd>N</kbd> lançar · <kbd>/</kbd> buscar</small>
          </div>
        </aside>

        <div className="d-conteudo">
          <header className="d-cabecalho">
            <div>
              {rota.tela === 'obra' && (
                <nav className="d-trilha" aria-label="Caminho">
                  <a href={linkD({ tela: 'obras' })}>Obras</a>
                  <IconeD nome="seta" tamanho={14} />
                  <span aria-current="page">{titulo}</span>
                </nav>
              )}
              <h1>{titulo}</h1>
              {rota.tela === 'obra' && obraAtual
                ? <p className="d-sub"><SeloStatus status={obraAtual.status} />{obraAtual.endereco && <span>{obraAtual.endereco}</span>}</p>
                : subtitulo && <p className="d-sub">{subtitulo}</p>}
            </div>
            <div className="d-cabecalho-acoes">
              {rota.tela === 'obras' && (
                <button type="button" className="d-botao secundario" onClick={novaObra}>
                  <IconeD nome="mais" tamanho={16} /> Nova obra
                </button>
              )}
              {rota.tela === 'obra' && obraAtual && (
                <>
                  <button type="button" className="d-botao secundario" onClick={() => setGaveta({ tipo: 'obra', obra: obraAtual })}>
                    <IconeD nome="editar" tamanho={16} /> Editar obra
                  </button>
                  <button type="button" className="d-botao primario" onClick={lancar}>
                    <IconeD nome="mais" tamanho={16} /> Lançar nesta obra
                  </button>
                </>
              )}
            </div>
          </header>

          {erro && <div className="aviso" role="alert">{erro}</div>}
          {!carregando && !erro && (
            <main className="d-pagina">
              {rota.tela === 'visao' && <VisaoD aoNovaObra={novaObra} aoAbrirCusto={abrirCusto} />}
              {rota.tela === 'obras' && <ObrasD aoNovaObra={novaObra} />}
              {rota.tela === 'obra' && <ObraD id={rota.id} aoAbrirCusto={abrirCusto} />}
              {rota.tela === 'lancamentos' && <LancamentosD aoAbrirCusto={abrirCusto} />}
              {rota.tela === 'ajustes' && (
                <div className="d-coluna-estreita">
                  <Ajustes tema={tema} alternarTema={alternarTema} />
                </div>
              )}
            </main>
          )}
        </div>
      </div>

      {gaveta?.tipo === 'custo' && <FormCusto custo={gaveta.custo} obraId={gaveta.obraId} aoFechar={fechar} />}
      {gaveta?.tipo === 'obra' && (
        <FormObra obra={gaveta.obra} aoFechar={fechar}
          aoSalvar={(o) => !gaveta.obra && irD({ tela: 'obra', id: o.id })}
          aoExcluir={() => irD({ tela: 'obras' })} />
      )}
    </>
  );
}
