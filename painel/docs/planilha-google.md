# Painel MB² · planilha no Google (espelho, somente leitura)

A planilha do Google mostra o que está no Painel e se atualiza sozinha a cada hora. **O Painel é a fonte única**: lance e corrija sempre nele. As abas do espelho são reescritas a cada atualização, então não digite nelas. Para fazer contas suas, crie abas novas e aponte para as do espelho (fórmulas, tabela dinâmica, gráficos).

Abas criadas: **Lançamentos**, **Resumo por obra**, **Por categoria**, **Contas** (último saldo conferido) e **Atualização** (hora da última cópia).

## Segurança
- A planilha entra no banco com um usuário próprio, o **leitor**, que só consegue ler. Ele não lança, não altera e não apaga nada.
- A senha do leitor fica guardada nas propriedades do script, não nas células da planilha. Não compartilhe a planilha com quem não deve ver os valores.
- O Painel não muda: nada disso envia dados do aparelho para o Google, a cópia é puxada do banco pela planilha.

## Passo a passo (uma vez, cerca de 10 minutos)
1. **Banco:** no Supabase, abra **SQL Editor**, cole o `painel/supabase/painel.sql` inteiro e clique em Run (pode rodar de novo, não apaga nada). Ele acrescenta o leitor somente leitura.
2. **Usuário leitor:** em **Authentication > Users > Add user**, crie um e-mail novo (por exemplo `planilha@…`) com senha forte, marcando "Auto Confirm User". Depois, no SQL Editor, rode (troque o e-mail):
   ```sql
   insert into public.painel_leitores (user_id)
   select id from auth.users where email = 'planilha@exemplo.com'
   on conflict (user_id) do nothing;
   ```
3. **Planilha:** crie uma planilha nova no Google Planilhas (nome sugerido: "MB2 · Espelho do painel"). Vá em **Extensões > Apps Script**, apague o que houver, cole o conteúdo de `painel/google/espelho.gs` e salve.
4. **Propriedades:** no Apps Script, **Configurações do projeto > Propriedades do script > Adicionar**, com estes quatro nomes:
   - `SUPABASE_URL`: o endereço do projeto (o mesmo das variáveis do GitHub);
   - `SUPABASE_CHAVE`: a chave pública (anon) do projeto;
   - `LEITOR_EMAIL` e `LEITOR_SENHA`: o usuário do passo 2.
5. **Ligar:** volte à planilha e recarregue a página. No menu **Espelho MB2**, clique em **Atualizar agora** (o Google pede autorização na primeira vez) e depois em **Agendar a cada hora**.

## Se algo falhar
- "Login do leitor recusado": e-mail ou senha errados, ou o usuário não foi criado com "Auto Confirm".
- "Não consegui ler o painel (401/403)": faltou rodar o SQL do passo 1 ou o `insert` do passo 2.
- Planilha vazia: o painel ainda não sincronizou. Confira no Painel, em Ajustes, se a nuvem está ligada e a sincronização em dia.
