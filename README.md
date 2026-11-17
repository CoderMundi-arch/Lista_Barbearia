# Fila de Atendimento — Studio Anadison O Mágico

Lista de atendimento diária da barbearia, feita em **HTML, CSS e JavaScript puros**
(hospedada no **GitHub Pages**), com os dados guardados numa **planilha do Google**
para que todos os aparelhos vejam a mesma lista.

| Página | Endereço | Quem usa | O que pode fazer |
| --- | --- | --- | --- |
| Lista | `https://SEU-USUARIO.github.io/REPOSITORIO/` | Clientes (QR Code) | Ver a lista e cadastrar o próprio nome |
| Painel | `https://SEU-USUARIO.github.io/REPOSITORIO/admin/` | Barbeiro (com senha) | Marcar atendidos, remover, cadastrar e limpar a lista |

## Primeira configuração

Siga o **[GUIA-CONFIGURACAO.md](GUIA-CONFIGURACAO.md)** (≈10 minutos): criar a planilha,
colar o script, publicar e colar a URL em `assets/js/config.js`.

Sem essa URL o site funciona em **modo demonstração** (dados só no navegador; senha `demo`).

> ⚠️ **Não coloque a senha real no `Code.gs` deste repositório**, ele é público no GitHub.
> A senha é definida apenas no editor do Apps Script, dentro da sua conta Google.

## Publicar no GitHub Pages

1. Envie o conteúdo desta pasta para a raiz do repositório (incluindo o arquivo `.nojekyll`).
2. **Settings → Pages → Deploy from a branch → main → / (root)**.

## Como funciona

```
Celulares dos clientes ─┐                       ┌─ Planilha "Fila"
                        ├──► Google Apps Script ─┤  (uma linha por nome)
Celular do barbeiro ────┘   (regras + senha)     └─ Zera a cada novo dia
```

- O site consulta a planilha a cada **6 s** (painel: 4 s) e pausa quando a aba fica em segundo plano.
- **Segurança no servidor:** marcar, remover e limpar exigem a senha, verificada pelo script.
  A página do cliente não tem esses botões e, mesmo que alguém altere o código no navegador,
  o Google recusa a ação.
- Regras no servidor: limite de 30 por dia, nome e sobrenome obrigatórios para clientes,
  sem nomes repetidos (ignora acentos), apenas letras (bloqueia fórmulas na planilha).
- 10 senhas erradas seguidas bloqueiam o painel por 5 minutos.
- No painel, marcar/remover aparece na hora e é confirmado com a planilha em seguida
  (se falhar, a tela volta ao estado anterior e avisa).
- Sem internet, aparece um aviso "Sem conexão com a lista" e o site tenta de novo sozinho.

## Estrutura

```
index.html                   Página do cliente (lista + cadastro)
admin/index.html             Painel do barbeiro (login + gerenciamento)
google-apps-script/Code.gs   Script que transforma a planilha em API
GUIA-CONFIGURACAO.md         Passo a passo da planilha
assets/
├─ css/styles.css            Visual (mobile first)
├─ img/                      Logo, símbolo e favicons
└─ js/
   ├─ config.js              URL da planilha, nome da barbearia, intervalos
   ├─ repository.js          Comunicação com a planilha (e modo demonstração)
   ├─ rules.js / utils.js    Regras e validações (no aparelho, para resposta rápida)
   ├─ ui.js                  Componentes: janelas, avisos, lista
   ├─ public.js              Página do cliente
   ├─ admin.js               Painel do barbeiro
   └─ icons.js               Ícones Lucide embutidos
```

## Alterações comuns

- **Nome exibido:** `businessName` em `assets/js/config.js`.
- **Senha, limite diário, quem pode cadastrar:** no topo do script, no editor do Apps Script
  (depois publique uma nova versão — veja o guia).
