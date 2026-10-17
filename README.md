# Projeto MB2 + AR Board

Tudo o que foi construído nesta conversa, em quatro pastas.
Todos os dados de obras, vendas e pessoas são fictícios.

## 1-mb2-gestao — Painel de gestão da MB2 (principal)
- Arquivo único: `index.html`. Abre com dois cliques em qualquer navegador.
- Áreas: Visão geral, Obras (escritório + canteiro), Financeiro, Vendas, Compras e Pessoas.
- Modo demonstração: os dados voltam ao exemplo quando a página recarrega.
- A leitura do ditado pelo Claude só funciona dentro do Claude. Fora dele, o painel usa a leitura simples, que já vem embutida.
- Versão publicada no Claude: https://claude.ai/artifact/R9P81F7zB241fwurASDz5E

## 2-canteiro-netlify — Canteiro com botão de áudio estilo WhatsApp
- Site estático pronto para o Netlify: arraste a pasta inteira em https://app.netlify.com/drop
- Abra no Safari do iPhone (precisa de https para liberar o microfone).
- Segurar grava; soltar envia; deslizar para a esquerda cancela; para cima, trava.
- Transcrição pelo reconhecimento de voz do próprio aparelho (Ditado ativado nos Ajustes).
- Registros ficam só no aparelho; o resumo vai para o escritório pelo WhatsApp.

## 3-gestor-obras-prototipo — Primeiro protótipo (só obras)
- Versão anterior: escritório + canteiro lado a lado, sem os outros módulos.
- Mantido como referência. Publicado em: https://claude.ai/artifact/T2gzssrWUtPZSxQNpMbhGV

## 4-ar-board — Painel de aprovar / rejeitar / comentar (EM STANDBY)
- **Em standby**: guardado no repositório, mas fora do foco atual (gestor empresarial e gestor de obras).
- `index.html` é o código do painel. Ele depende do banco de dados do Claude, então só funciona
  de verdade pelo link publicado: https://claude.ai/artifact/XT5K918mjnu844wJZJHG8t
- `dados/` traz a cópia do banco no momento do download (projetos, rodadas, decisões,
  rodadas concluídas e regras aprendidas), em JSON.
- `seed/` traz a primeira rodada (hero do Empório Eucalipto) e o script que a gerou.

## Próximos passos sugeridos
- Testar o canteiro no iPhone pelo Netlify.
- Se a transcrição falhar com barulho de obra: trocar por Whisper + leitura com IA (Netlify Functions).
- Para uso real: banco de dados compartilhado ligando canteiro e painel, com login.
