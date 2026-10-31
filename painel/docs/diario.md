# Diário da obra

Botão **Diário** na barra de baixo do celular (entre Lançar e Ajustes). Cada registro tem obra,
data, resumo do dia (falado ou escrito, com o mesmo campo de voz do Lançar custo) e até 12 fotos
ou vídeos curtos.

## Onde está o código
- Regras e limites: `src/dominio/diario.ts` (com teste).
- Armazenamento: `src/dados/diario.ts` (contrato `RepositorioDiario` em `src/dados/repositorio.ts`),
  banco próprio do aparelho `mb2-diario` com as lojas `registros` e `arquivos` (Blob de cada mídia).
- Estado compartilhado: `src/dados/useDiario.ts`. Preparo das mídias: `src/componentes/midiaDiario.ts`.
- Telas: `src/telas/Diario.tsx` (linha do tempo por dia, filtro por obra, visualizar e baixar mídia,
  exportar texto) e `src/componentes/FormDiario.tsx` (novo, editar, excluir).

## Decisões (padrão mais seguro, podem mudar)
- **Fotos**: câmera do iPhone (`capture="environment"`) ou galeria; reduzidas para no máximo 1920 px,
  JPEG 82% (12 MP de ~4 MB vira ~0,5 MB). Se o navegador não abrir a foto, guarda a original.
- **Vídeos**: até 60 s e 100 MB, guardados como o iPhone gravou (sem recompressão no aparelho).
- **Só no aparelho**: o diário NÃO entra na sincronização com o Supabase nem no backup em arquivo.
  Motivo: fotos e vídeos pesam (o plano grátis do Supabase Storage tem 1 GB) e o backup JSON ficaria
  enorme. Para guardar fora do aparelho: "Exportar texto do diário" e "Baixar" em cada mídia.
- O painel pede ao navegador armazenamento persistente (`navigator.storage.persist`) ao guardar
  mídia, para o iPhone não apagar os dados quando faltar espaço. Isso funciona melhor com o painel
  instalado na Tela de Início.
- Obra excluída: os registros dela continuam no diário com o nome "Obra excluída", para nenhuma foto
  sumir sem o dono ver; dá para excluir um a um.

## Próximo passo, se aprovado
Sincronizar o diário: texto pela tabela `painel_registros` (novo tipo `diario`) e mídias no Supabase
Storage (bucket privado por usuário), enviando só em Wi-Fi. Depende de decidir o custo do Storage.
