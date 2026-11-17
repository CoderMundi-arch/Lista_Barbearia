# Guia de configuração — Lista compartilhada pela planilha do Google

Tempo estimado: **10 minutos**, feito uma única vez.
Você vai precisar de uma conta Google (pode ser a da barbearia ou a da agência).

No final, todos os celulares e navegadores vão ver **a mesma lista**, e só o barbeiro,
com senha, consegue marcar atendidos e remover nomes.

---

## Passo 1 — Criar a planilha

1. Acesse **https://sheets.new** (cria uma planilha em branco).
2. Dê um nome, por exemplo: **Fila Studio Anadison**.

> Não precisa criar colunas: o script cria a aba **Fila** sozinho.

## Passo 2 — Colar o script

1. Na planilha, clique em **Extensões → Apps Script**.
2. Apague todo o código que aparece no editor.
3. Abra o arquivo `google-apps-script/Code.gs` deste projeto, copie **tudo** e cole no editor.
4. No topo do código, troque a senha:
   ```js
   const SENHA_ADMIN = 'troque-esta-senha';
   ```
   por uma senha sua (ex.: `const SENHA_ADMIN = 'Magico@2026';`).
5. (Opcional) Na mesma área você pode mudar:
   - `LIMITE_POR_DIA` → quantos nomes por dia (padrão 30);
   - `CLIENTE_PODE_CADASTRAR` → `false` se só o barbeiro puder cadastrar nomes.
6. Clique no ícone de **disquete (Salvar)**.

## Passo 3 — Autorizar o script

1. No seletor de funções (ao lado do botão **Executar**), escolha **configurarPlanilha**.
2. Clique em **Executar**.
3. O Google vai pedir autorização:
   - **Revisar permissões** → escolha sua conta;
   - Se aparecer "O Google não verificou este app": clique em **Avançado** →
     **Acessar (nome do projeto) (não seguro)**. É normal: o app é seu.
   - Clique em **Permitir**.
4. No registro de execução deve aparecer: *"Tudo certo! Aba "Fila" pronta."*
   Volte à planilha e confira que surgiu a aba **Fila** com os títulos das colunas.

## Passo 4 — Publicar como App da Web

1. No editor, clique em **Implantar → Nova implantação**.
2. Na engrenagem ⚙ ao lado de "Selecionar tipo", escolha **App da Web**.
3. Preencha:
   - **Descrição:** Fila Studio Anadison
   - **Executar como:** **Eu** (seu e-mail)
   - **Quem pode acessar:** **Qualquer pessoa**
4. Clique em **Implantar** e copie a **URL do app da Web**.
   Ela termina em **`/exec`**, por exemplo:
   `https://script.google.com/macros/s/AKfycb.../exec`

> "Qualquer pessoa" é necessário para os clientes acessarem sem login do Google.
> Mesmo assim, **marcar, remover e limpar só funcionam com a senha** — isso é
> verificado pelo próprio script, no servidor do Google.

## Passo 5 — Conectar o site à planilha

1. Abra `assets/js/config.js`.
2. Cole a URL entre as aspas:
   ```js
   apiUrl: 'https://script.google.com/macros/s/AKfycb.../exec',
   ```
3. Salve e envie o projeto para o GitHub (substituindo os arquivos antigos).

Pronto! Em 1 ou 2 minutos o GitHub Pages atualiza.

## Passo 6 — Testar

1. Abra o site no celular e cadastre um nome.
2. Abra o site em **outro** aparelho ou navegador: o nome aparece em alguns segundos.
3. Abra `.../admin/`, entre com a senha e marque o nome como atendido.
4. Na página do cliente, o nome fica riscado na próxima atualização (até ~6 segundos).
5. Confira na planilha: a linha mostra o status **atendido**.

---

## Dúvidas comuns

**Alterei o script. Preciso fazer algo?**
Sim. Em **Implantar → Gerenciar implantações**, clique no lápis ✏, em **Versão** escolha
**Nova versão** e clique em **Implantar**. Assim a URL continua a mesma e o site não precisa mudar.
(Se usar "Nova implantação", será gerada outra URL e você terá de atualizar o `config.js`.)

**Esqueci/quero trocar a senha.**
Troque `SENHA_ADMIN` no script e publique uma nova versão (pergunta acima).
O barbeiro precisará entrar novamente no painel.

**Errei a senha várias vezes e bloqueou.**
Por segurança, após 10 tentativas erradas o painel fica bloqueado por 5 minutos. É só aguardar.

**A lista zera sozinha?**
Sim. Na primeira consulta de cada novo dia (horário de Brasília), o script apaga os nomes do
dia anterior. Com a página aberta na virada da meia-noite, a tela se atualiza sozinha.

**Posso editar a planilha à mão?**
Pode ver à vontade. Evite editar as colunas **ID** e **Status** manualmente; use o painel
do barbeiro. Linhas sem ID são ignoradas.

**O site mostra "Modo demonstração".**
O `apiUrl` do `config.js` está vazio. Nesse modo os dados ficam só no navegador
(senha do painel: `demo`). Faça o Passo 5.

**O site mostra "Sem conexão com a lista".**
Verifique a internet do aparelho e se a URL no `config.js` está correta e termina em `/exec`.
Confira também se a implantação está com acesso **Qualquer pessoa**.

**Limites do Google.**
Para uma barbearia (algumas dezenas de pessoas por dia) a cota gratuita do Apps Script
sobra. A página do cliente consulta a lista a cada 6 segundos e pausa quando fica em
segundo plano.
