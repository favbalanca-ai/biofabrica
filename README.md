# BioFábrica · Controle de Produção

App para **registro e controle do processo de produção da BioFábrica** (Fazenda Água Viva):
fermentadores, lotes de bioinsumos, visitas/coletas, ajustes e monitoramento de processo,
análise de dados e emissão do **laudo por WhatsApp e PDF**.

> **O app** fica na pasta [`apps-script/`](apps-script/) — web app para **vários celulares**,
> com os dados numa **planilha do Google Sheets** (banco de dados criado automaticamente), sem servidor.
>
> ➡️ **Instalação passo a passo:** [`apps-script/README.md`](apps-script/README.md)
> · **Publicar do Git (clasp) e deploy automático:** ver o mesmo README.

## Principais recursos

- **Mapa de fermentadores** — Série A (4 × 1.500 L) e Série B (6 × 1.000 L), com status por cor,
  contador regressivo e barra de progresso do processo.
- **Lotes** — ficha do produto, tempo de processo e parâmetros; seleção de organismo, inóculo e
  meio a partir dos cadastros (o operador escolhe, não digita).
- **Parâmetros (monitoramento)** — leituras de pH, temperatura, O₂ e agitação ao longo do
  processo, comparadas com a faixa-alvo do organismo.
- **Visitas** — acesso do funcionário à biofábrica, com **coletas e vistorias** individuais.
- **Cadastros** — organismos, inóculos e meios (com receita e tempo de produção) e funcionários.
- **Relatório / Laudo** — todos os campos do **Relatório de Análise Microbiológica On Farm (2026)**;
  envio do laudo por **WhatsApp** (texto) ou **PDF com as fotos** (placas, microscopia), fiel ao
  documento oficial.
- **Painel & Análise** — cruza processo × resultado (UFC/mL), com faixas-alvo, médias por meio/
  organismo e observações automáticas para ajudar a calibrar pH/temperatura.
- **Multiusuário** — vários celulares veem e editam os mesmos dados; atualização automática.

## Estrutura do repositório

```
.
├─ index.html                       # página que redireciona para o app (GitHub Pages)
├─ README.md                        # este arquivo (visão geral)
├─ .clasp.json                      # liga o repositório ao projeto Apps Script (clasp)
├─ .github/workflows/               # publicação automática no Apps Script a cada push
└─ apps-script/                     # O APP (fonte publicada no Google Apps Script)
   ├─ Codigo.gs                     # backend: lê/grava na planilha; gera PDF do laudo
   ├─ Index.html                    # tela do app (o que aparece no celular)
   ├─ appsscript.json               # manifesto do web app
   └─ README.md                     # guia de instalação + publicação pelo Git (clasp)
```

> Os arquivos do app ficam **apenas** em `apps-script/` (é o que o `clasp` publica). O `index.html`
> na raiz é só a página de atalho do GitHub Pages.

## Tecnologia

Google Apps Script + Google Sheets (grátis, sem servidor para manter). Os registros ficam numa
planilha do Google que a fazenda controla — criada automaticamente na primeira configuração
(`setup`). Desenvolvimento e publicação são feitos **pelo GitHub** (com o `clasp`).
