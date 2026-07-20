# BioFábrica · Controle de Produção

App para **registro e controle do processo de produção da BioFábrica** (Fazenda Água Viva):
fermentadores, lotes de bioinsumos, cadastros, fluxo de produção, laudo e análise.

> **O app roda no GitHub Pages** (igual aos outros apps da fazenda): abre pelo endereço
> `github.io`, funciona **offline**, instala na tela inicial (**PWA**) e guarda os dados
> **no próprio aparelho** (localStorage). A pasta do app é [`app/`](app/).

## Como funciona

- **Onde roda:** GitHub Pages — a página inicial (`index.html`) encaminha para [`app/`](app/),
  que é o app de verdade. Não depende do `script.google.com`.
- **Dados:** ficam **no aparelho** (localStorage). Cada celular tem os seus. Funciona sem internet.
- **Sincronização com a planilha (opcional, já disponível):** em **📊 Painel → Sincronização
  com a planilha**, cole a URL do Apps Script (`/exec`) e toque em **Salvar e conectar**. A partir
  daí o app grava na **planilha do Google** e os dados são **compartilhados entre celulares**
  (com fila offline: sem internet salva no aparelho e sincroniza sozinho depois). O backend está
  em [`apps-script/`](apps-script/) — publique-o com **Quem pode acessar: Qualquer pessoa**.

## Principais recursos

- **Mapa de fermentadores** — Série A (4 × 1.500 L) e Série B (6 × 1.000 L), status por cor,
  contador regressivo e barra de progresso.
- **Cadastros** — produtos (ligam organismo + inóculo + meio), organismos, inóculos e meios
  (com dose por 1000 L) e funcionários. O operador **escolhe, não digita**.
- **Ficha do lote** — o produto preenche organismo/inóculo/meio; o volume calcula as doses;
  salvar inicia o contador; fluxo de status (Disponível → Em Processo → Aguardando → Em Análise →
  Concluído) com barra de etapas e finalização automática.
- *(Em reconstrução por camadas)* Parâmetros (pH/temperatura), Ajustes, Relatório, Laudo em PDF,
  Fotos, Visitas e Painel & Análise.

## Estrutura do repositório

```
.
├─ index.html                 # abre o app (redirect para /app/) — GitHub Pages
├─ app/                       # O APP (roda no navegador / PWA)
│   ├─ index.html             # a tela do app
│   ├─ manifest.webmanifest   # instala na tela inicial
│   ├─ sw.js                  # service worker (offline)
│   └─ icon.svg               # ícone do app
├─ apps-script/               # backend opcional (sincronização com Google Sheets)
│   ├─ Codigo.gs · Index.html · appsscript.json · README.md
├─ README.md · .clasp.json · .github/ · .gitignore
```

## Publicar (GitHub Pages)

No GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `/root` →
Save**. Em ~1 minuto o app fica em `https://favbalanca-ai.github.io/biofabrica/`
(a página inicial encaminha para `/app/`). No celular: **Compartilhar → Adicionar à tela inicial**
para virar um ícone de app.
