# Fila de Atendimento — Studio Anadison O Mágico

Lista de atendimento diária da barbearia, feita em **HTML, CSS e JavaScript puros**:
sem build, sem framework e sem instalar nada. Pronto para o **GitHub Pages**.

- Página principal: `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`
  botão "Cadastrar nome" (abre uma janela para digitar o nome completo) + lista na ordem
  de cadastro, com um checkbox em cada nome.
  Marcou → o nome fica riscado (atendimento concluído). Desmarcou → volta ao normal.
  A lixeira ao lado de cada nome remove o cliente (com confirmação) e libera a vaga.
- Painel do barbeiro (opcional): `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/admin/`
  resumo do dia, remover cliente, adicionar manualmente e limpar a lista.
  Se não for usar, basta apagar a pasta `admin`.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub (ex.: `fila-studio`).
2. Envie **todo o conteúdo desta pasta** para a raiz do repositório
   (pelo site: *Add file → Upload files*, arrastando as pastas `admin` e `assets` e os arquivos soltos).
3. No repositório, vá em **Settings → Pages**.
4. Em *Build and deployment*, escolha **Deploy from a branch**, branch **main**, pasta **/ (root)** e salve.
5. Em 1 ou 2 minutos o endereço aparece no topo da mesma tela. Use esse link no QR Code.

O arquivo `.nojekyll` evita que o GitHub processe os arquivos; deixe-o no repositório.

## Testar no computador

Basta abrir o `index.html` no navegador (duplo clique). Para o painel, abra `admin/index.html`.

## Estrutura

```
index.html               Página pública (clientes)
admin/index.html         Painel do barbeiro
assets/
├─ css/styles.css        Todo o visual (paleta, layout mobile first, animações)
├─ img/                  Logo original, símbolo "AM" e favicons
└─ js/
   ├─ config.js          Nome da barbearia, limite de 30 vagas, chaves de armazenamento
   ├─ utils.js           Datas em português, validação e formatação de nomes
   ├─ icons.js           Ícones Lucide embutidos (funciona offline)
   ├─ rules.js           Regras de negócio da fila (funções puras)
   ├─ repository.js      Persistência em localStorage
   ├─ ui.js              Componentes: toast, modal, progresso, indicadores, lista, formulário
   ├─ public.js          Página principal: cadastro, lista e checkbox
   └─ admin.js           Comportamento do painel do barbeiro
```

Para trocar o nome exibido ou o limite de vagas, edite `assets/js/config.js`.

## Regras implementadas

- Limite de 30 inscrições por dia; o formulário bloqueia ao lotar.
- Ordem de cadastro preservada; a numeração exibida é a posição na lista (se ajusta ao remover um nome).
- A página pública exige nome e sobrenome; o barbeiro pode adicionar só o primeiro nome.
- Nomes duplicados são bloqueados, sem diferenciar acentos, maiúsculas ou espaços.
- Marcar como atendido **não** libera vaga; remover o cliente libera.
- Ao marcar o checkbox, o nome fica riscado e com aparência discreta; continua na lista.
- Novo dia → lista vazia automaticamente: ao abrir a página e também com ela aberta
  na virada da meia-noite (verificação a cada minuto, pelo horário do aparelho).
- Dados corrompidos → cópia de segurança em `studio-anadison:corrupted-backup` e fila nova, com aviso.
- Nomes são sempre exibidos como texto (proteção contra injeção de código).

## ⚠️ Limitação do localStorage

Os dados ficam **somente no navegador/aparelho onde foram salvos**.
O celular de um cliente **não** enxerga a fila de outro celular, nem a do barbeiro.
Nesta versão, o uso que funciona de verdade é **um aparelho único na barbearia**
(ex.: tablet no balcão com a página pública e o painel abertos em abas).
Abas do mesmo navegador se atualizam sozinhas.

O painel `/admin/` não tem senha: qualquer pessoa que souber o endereço o abre,
mas só altera os dados do próprio aparelho. A página pública não tem link para o painel.

## Próximo passo: banco de dados

Toda a leitura e gravação passa por `assets/js/repository.js`. Para compartilhar a fila
entre aparelhos (ex.: Supabase com tempo real), crie outro objeto com os mesmos métodos
(`getState`, `addClient`, `setServed`, `removeClient`, `resetQueue`, `subscribe`…)
e troque a última linha do arquivo. As páginas e componentes não precisam mudar.
Nessa etapa, adicione também login no painel do barbeiro.
