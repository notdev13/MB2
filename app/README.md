# MB2 Obras · app (iOS e Android)

App em Expo (React Native) conectado ao Supabase. Primeira versão: login por e-mail e a tela **Hoje**
(obra ativa, progresso executado x previsto, ações rápidas, ocorrências abertas e entregas do dia),
com tema claro e escuro.

## Rodar no celular
1. Instalar o Node.js 20 ou mais novo.
2. Nesta pasta: `npm install` e depois `npx expo start`.
3. Instalar o app **Expo Go** no celular e ler o QR code que aparece no terminal.

Para ver no navegador: `npx expo start --web`.

## Antes de entrar
- O banco precisa ter a estrutura de `supabase/migrations` aplicada (PR do banco).
- Criar o usuário em Supabase › Authentication › Users e incluí-lo numa obra
  (tabela `obra_membros`), senão a tela Hoje mostra "Você ainda não está em nenhuma obra".

## Configuração
O arquivo `.env` tem a URL do projeto e a chave **anon** (pública por definição; quem protege
os dados são as regras RLS do banco). Nunca coloque a chave `service_role` no app.

## Verificar
- `npx tsc --noEmit` (tipos)
- `npx expo export --platform web` (build)
