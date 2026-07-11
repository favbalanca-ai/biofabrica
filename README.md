# BioFábrica · Controle de Produção

App para **registro e controle do processo de produção da BioFábrica** (Fazenda Água Viva):
fermentadores, lotes de bioinsumos, visitas/coletas, ajustes e monitoramento de processo,
análise de dados e emissão do **laudo por WhatsApp e PDF**.

> **Versão em produção:** pasta [`apps-script/`](apps-script/) — app web para **vários celulares**,
> com os dados numa **planilha do Google Sheets** compartilhada (banco de dados), sem servidor.
>
> ➡️ **Instalação passo a passo:** [`apps-script/README.md`](apps-script/README.md)

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

## Estrutura

```
apps-script/
  Codigo.gs     # backend: lê/grava na planilha Google Sheets
  Index.html    # app web mobile (o que aparece no celular)
  README.md     # guia de instalação passo a passo (Apps Script)
```

## Tecnologia

Google Apps Script + Google Sheets (grátis, sem servidor para manter). Os registros ficam numa
planilha do Google que a fazenda controla.
