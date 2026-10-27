# Painel MB² · versão para computador

## Arquitetura

O painel tem duas interfaces ("cascas") sobre a mesma base:

```
src/
  dominio/      regras e contas (puras, com teste)          ← compartilhado
  dados/        contrato do repositório, IndexedDB, backup  ← compartilhado
  casca.ts      escolhe a casca pela tela
  App.tsx, telas/, componentes/   casca do celular (não muda por causa do desktop)
  desktop/
    AppDesktop.tsx    menu lateral, cabeçalho da página, atalhos, gaveta de formulário
    rotas.ts          rotas do desktop (#/visao, #/obras, #/obra/id, #/lancamentos, #/ajustes)
    componentes/      Base (ícones, Painel, Kpi, selos), Tabela, TabelaLancamentos, Graficos
    telas/            VisaoD, ObrasD, ObraD, LancamentosD
    desktop.css       design system desktop, todo dentro de .dk
```

- **Escolha da casca** (`casca.ts`): `(min-width: 1024px) and (hover: hover)` abre o desktop; o resto
  abre o celular. Troca ao vivo se a janela mudar de tamanho. Um iPad na horizontal com mouse pega o desktop.
- **Mesmas rotas**: os endereços são iguais nas duas cascas, então um link serve nas duas.
  `#/lancamentos` só existe no desktop; no celular cai na visão geral.
- **Contas fora das telas**: o que o desktop precisa a mais está em `src/dominio/consultas.ts`
  (filtrar, ordenar, agrupar por fornecedor, variação entre meses), com testes.
- **Reaproveitado do celular, sem alterar**: `FormCusto`, `FormObra`, `Ajustes`, `Aviso`, `Confirmar`
  e o tema. No desktop os formulários abrem como gaveta lateral (só CSS dentro de `.dk`).
- **Isolamento**: todo estilo do desktop usa classes `d-…` ou fica sob `.dk`. Nada em `desktop/`
  muda a aparência do celular.

## Design system

Parte da identidade do celular (DESIGN 15): fundo quase preto, serifa Cormorant Garamond em
títulos e números grandes, Manrope na interface, cobre só nas categorias, dourado só nos gráficos,
pílulas, bordas finas, sem sombra. Temas escuro e claro usam os mesmos tokens de cor de `estilo.css`.

O que é próprio do desktop:

| Token | Valor | Uso |
|---|---|---|
| `--d-lateral` | 256px | largura do menu lateral |
| `--d-margem` | 40px | margem lateral da página |
| `--d-vao` | 20px | espaço entre cartões da grade |
| `--d-largura-max` | 1480px | largura máxima do conteúdo |
| `--d-raio` / `--d-raio-p` | 12px / 8px | cartões / itens de menu |
| `--d-corpo` | 14px | texto padrão (mais denso que os 16px do celular) |
| `--d-titulo` | 44px serifa | título da página |
| `--d-kpi` | 32px serifa | número dos indicadores |
| `--d-linha` | 46px | altura da linha de tabela |

**Layout**: menu lateral fixo + conteúdo com grade de 12 colunas (`.d-grade-12`, `.span-4/6/8/12`).
Abaixo de 1280px, os blocos de 4 e 8 colunas ocupam a linha inteira.

**Componentes**
- `Painel`: cartão com cabeçalho (título à esquerda, ação ou link à direita).
- `Kpi`: rótulo, número em serifa, detalhe; tom `alerta` com borda vermelha e texto.
- `Tabela`: cabeçalho fixo, números à direita com algarismos de largura fixa, ordenação pelo
  cabeçalho (`aria-sort`), linha clicável por mouse ou Enter, rodapé com total.
- `TabelaLancamentos`: busca, filtros, ordenação, total do filtro e "mostrar mais" (100 por vez).
- Gráficos: `ColunasMes` (12 meses, grade com valores redondos, valor ao passar o mouse, mês atual
  destacado), `BarrasCategoria`, `UsoOrcamento` (barra + % + selo "Estourou"). Todos com tabela
  escondida para leitor de tela.
- Botões `d-botao` (`primario` branco cheio, uma ação principal por tela; `secundario` contorno;
  `fantasma`; `pequeno`; `largo`). Filtros em pílula (`d-busca`, `d-select`, `d-segmentos`).
- Selos de status reaproveitam `.selo` do celular.

**Interação**: foco visível em cobre; atalhos `N` (lançar custo) e `/` (buscar lançamentos), que não
disparam com um campo ou janela abertos. Esc fecha gaveta e perguntas.

## Regra de manutenção

Tela ou regra nova: a conta vai para `dominio/` com teste; cada casca decide como mostrar.
Se a mudança for só do desktop, ela fica em `desktop/`. A página `apresentacao/iphone.html` é
regerada a cada versão (ver README).
