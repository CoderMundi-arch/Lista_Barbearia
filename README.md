# Fila de Atendimento — Studio Anadison O Mágico

Aplicação web para organizar a fila diária de clientes da barbearia.
React 18 + TypeScript + Tailwind CSS 4 + Lucide React, com persistência em `localStorage`.

## Rodando

```bash
npm install
npm run dev          # desenvolvimento → http://localhost:5173
npm run build        # produção → dist/
npm run preview      # testa o build de produção
npm run build:single # gera um único index.html com tudo embutido (dist-single/)
```

## Rotas

| Área | URL |
| --- | --- |
| Pública (clientes / QR Code) | `/` |
| Painel do barbeiro | `/#admin` (ou `/#/admin`, `/admin`*) |

\* `/admin` exige que a hospedagem redirecione todas as rotas para `index.html`
(Vercel: `rewrites`; Netlify: `_redirects` com `/* /index.html 200`). `/#admin` funciona em qualquer hospedagem.

> A página pública não tem link para o painel. Nesta versão sem servidor, o painel não tem login:
> quem souber o endereço consegue abrir o painel **no próprio aparelho**. Ao conectar um banco
> de dados, adicione autenticação na rota do barbeiro.

## Regras implementadas

- Limite de 30 inscrições por dia (`src/config/app.ts`); bloqueio automático ao lotar.
- Número sequencial por inscrição (nunca reutilizado no dia), ordem preservada.
- Área pública exige nome e sobrenome; o barbeiro pode adicionar só o primeiro nome.
- Nomes duplicados são bloqueados (sem diferenciar acentos, maiúsculas ou espaços extras).
- Marcar como atendido **não** libera vaga; remover um cliente libera.
- Atendidos continuam na lista, com o nome riscado e menos destaque.
- Virada de dia: ao abrir (ou voltar para a aba com a página aberta) num novo dia, a fila começa vazia.
- Dados corrompidos: são salvos em `studio-anadison:corrupted-backup` e a fila recomeça, com aviso.
- O aparelho lembra a própria inscrição e mostra número, posição atual e quantas pessoas estão na frente.

## Limitação importante do localStorage

Os dados ficam **apenas no navegador/dispositivo onde foram salvos**. O celular do cliente e o do
barbeiro **não** compartilham a fila. Abas do mesmo navegador se mantêm sincronizadas.
Para uso real com clientes inscrevendo-se pelo próprio celular, é necessário um banco de dados (veja abaixo).
Até lá, o uso viável é um aparelho único na barbearia (ex.: tablet no balcão).

## Estrutura

```
src/
├─ config/app.ts                     # nome, limite de vagas, chaves de armazenamento
├─ types/queue.ts                    # tipos do domínio
├─ lib/                              # datas pt-BR, validação/formatação de nomes, ids
├─ services/
│  ├─ queueRules.ts                  # regras de negócio puras (reutilizáveis com qualquer backend)
│  ├─ QueueRepository.ts             # contrato de persistência (assíncrono)
│  └─ LocalStorageQueueRepository.ts # implementação atual
├─ context/                          # QueueContext (estado da fila) e ToastContext (notificações)
├─ hooks/                            # roteamento sem dependências, "minha inscrição"
├─ components/                       # Header, StatsDashboard, JoinForm, JoinConfirmation, ClientList,
│                                    # ClientCard, AdminPanel, ConfirmModal, ProgressIndicator, EmptyState
└─ pages/                            # PublicPage, AdminPage
```

## Migrando para um banco de dados

1. Crie uma classe que implemente `QueueRepository` (ex.: `SupabaseQueueRepository`).
2. Reaproveite `queueRules.ts` para validar no cliente (e replique as regras no servidor/RLS).
3. Em `subscribe`, conecte o canal de tempo real e chame os listeners a cada mudança.
4. Troque a linha de `createRepository()` em `src/App.tsx`. Nenhum componente precisa mudar.

## Identidade visual

- `src/assets/logo-studio.jpg` — logo original (recorte da imagem enviada), usada no cabeçalho.
- `src/assets/logo-mark-white.png` — símbolo "AM" em branco com fundo transparente.
- `public/favicon.ico`, `favicon.png`, `apple-touch-icon.png`, `icon-512.png` — gerados a partir do símbolo.
- Fontes: Montserrat (títulos) e Poppins (textos), via Google Fonts.
