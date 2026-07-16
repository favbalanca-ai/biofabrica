# BioFábrica · App de Controle de Produção (Google Sheets + WhatsApp)

App web para **vários celulares**, com os dados guardados numa **planilha do Google Sheets**
(banco compartilhado) e envio do **laudo por WhatsApp**. Grátis, sem servidor para manter.

- Todos os celulares abrem o mesmo endereço e leem/gravam na mesma planilha.
- Os registros ficam numa planilha Google que você controla (abas Lotes, Visitas, Ajustes, Fermentadores).
- Cada lote tem uma tela de **Laudo** com botão que abre o WhatsApp já com o texto pronto.

## Arquivos

- `Codigo.gs` — o "motor" (lê e grava na planilha).
- `Index.html` — a tela do app (o que aparece no celular).

---

## Como instalar (passo a passo, ~10 min)

### 1. Criar a planilha
1. Acesse <https://sheets.google.com> e crie uma **planilha em branco**.
2. Dê um nome, por exemplo **"BioFábrica — Produção"**.

### 2. Abrir o editor de script
1. Na planilha, menu **Extensões → Apps Script**.
2. Vai abrir o editor de código numa nova aba.

### 3. Colar o código
1. No editor, apague o conteúdo do arquivo `Código.gs` que veio em branco e **cole todo o
   conteúdo de `Codigo.gs`** desta pasta.
2. Clique no **＋** ao lado de "Arquivos" → **HTML** → dê o nome exatamente **`Index`**
   (sem `.html`). Apague o conteúdo padrão e **cole todo o conteúdo de `Index.html`**.
3. Clique no ícone de **salvar** (💾).

### 4. Configurar a planilha (uma vez)
1. No editor, na barra de cima, selecione a função **`setup`** e clique em **Executar**.
2. Na primeira vez o Google vai pedir **autorização** — clique em *Revisar permissões*,
   escolha sua conta, e em "app não verificado" clique em *Avançado → Acessar (inseguro)*
   (é o seu próprio script). Autorize. **Importante:** o app também pede acesso ao **Google Drive**
   (para guardar as fotos e gerar os PDFs). Autorize normalmente. Ao rodar o `setup` é criada
   automaticamente a pasta **"BioFábrica — Fotos e Laudos"** no seu Drive.
3. Volte à planilha: as abas **Fermentadores, Lotes, Visitas, Ajustes** devem ter sido criadas,
   com os 10 fermentadores (A1–A4 e B1–B6) já cadastrados.

### 5. Publicar o app (deploy)
1. No editor, canto superior direito: **Implantar → Nova implantação**.
2. Em "Tipo", escolha **App da Web**.
3. Configure:
   - **Executar como:** *Eu* (sua conta).
   - **Quem pode acessar:** escolha conforme sua necessidade:
     - *Qualquer pessoa* → qualquer um com o link usa (mais simples para os operadores).
     - *Qualquer pessoa com conta Google* → exige login Google (fica registrado quem fez cada lote).
4. Clique em **Implantar** e **copie o URL do app da Web** (termina em `/exec`).

### 6. Usar nos celulares
1. Abra o URL no navegador de cada celular.
2. Toque em **Compartilhar → Adicionar à tela inicial** para virar um ícone de app.
3. Pronto — todos os celulares veem e editam os mesmos dados.

> Ao alterar o código depois, use **Implantar → Gerenciar implantações → editar (lápis) →
> Nova versão** para publicar a atualização no mesmo URL.

---

## Publicar direto do Git (clasp) — sem colar código à mão

O projeto já está ligado ao Apps Script pelo arquivo [`.clasp.json`](../.clasp.json)
(planilha e projeto configurados). Com o **clasp** você envia o código do Git para o
Apps Script com **um comando**, em vez de copiar e colar.

### Uma vez, no seu computador
1. Instale o Node.js e o clasp: `npm install -g @google/clasp`
2. Faça login com a **sua conta Google** (a mesma dona do projeto): `clasp login`
   - Isso cria o arquivo `~/.clasprc.json` (as suas credenciais — **não** vão para o Git).

### Sempre que quiser publicar
Na pasta do repositório:
```bash
clasp push            # envia Codigo.gs, Index.html e appsscript.json para o Apps Script
```
Depois, no editor do Apps Script, publique a versão: **Implantar → Gerenciar implantações →
✏️ → Nova versão** (mantém o mesmo link `/exec`). Para publicar a versão também pela linha de
comando: `clasp deploy -i <ID_DA_IMPLANTAÇÃO>`.

### Publicação automática ao dar push no GitHub (opcional)
Já existe o fluxo [`.github/workflows/deploy-appsscript.yml`](../.github/workflows/deploy-appsscript.yml):
a cada push no `main` que mexa em `apps-script/`, ele roda `clasp push` sozinho. Para ligar:

1. No seu computador, após `clasp login`, copie **todo o conteúdo** do arquivo `~/.clasprc.json`.
   - Windows: `%USERPROFILE%\.clasprc.json` · Mac/Linux: `~/.clasprc.json`
2. No GitHub: repositório → **Settings → Secrets and variables → Actions → New repository secret**.
   - Nome: `CLASPRC_JSON` · Valor: cole o conteúdo do `.clasprc.json`.

Pronto: a cada push no `main`, o fluxo roda `clasp push` **e publica a nova versão no mesmo
link `/exec`** — ele **descobre sozinho** a implantação existente (não precisa informar o ID).

> (Opcional) Se você tiver mais de uma implantação e quiser fixar exatamente qual atualizar,
> rode `clasp deployments`, copie o ID desejado e crie o secret `CLASP_DEPLOYMENT_ID` com ele.

> **Nunca** faça commit do `.clasprc.json` — são as suas credenciais. Só o `.clasp.json`
> (que tem apenas os IDs do projeto/planilha) fica no Git.

---

## Como usar

- **Cadastros:** no mapa, toque em **📚 Cadastros** para cadastrar, na planilha:
  - **Organismos** (microrganismos);
  - **Inóculos** e **Meios de cultura** — cada um com a **receita/preparo** e o
    **tempo de produção (em horas)**;
  - **Funcionários** (nome + função).
  Tudo o que for cadastrado aqui vira **lista de seleção** no lote: o operador **escolhe,
  não digita** (organismo, inóculo, meio e responsáveis). Ao escolher um inóculo/meio, a
  receita cadastrada aparece logo abaixo.
- **Mapa de fermentadores:** toque em um fermentador para ver o histórico ou tocar em **+ Novo Lote**.
- **Lote:** abas **Ficha**, **Visitas**, **Ajustes**, **Análise** e **Laudo**.
  - *Ficha:* produto, organismo, inóculo, meio, parâmetros e tempo de processo.
    Ao escolher o inóculo/meio, o **tempo de produção** vem da receita e começa um
    **contador regressivo** (início + tempo), mostrado no lote e no mapa. O botão
    **🏁 Finalizar produção → Laudo** grava a **data final** (agora), muda o status para
    *Aguardando Análise* e leva direto para o Relatório/Laudo.
  - *Visitas (geral):* no mapa, **👥 Visitas** registra o acesso do funcionário à
    **biofábrica inteira** (entrada/saída). Dentro de cada visita registram-se as
    **coletas e vistorias individuais**, cada uma direcionada a um fermentador (e a um
    lote, se for o caso).
  - *Parâmetros:* leituras de **pH, temperatura, O₂ e agitação ao longo do processo**
    (série temporal), comparadas com a faixa-alvo do organismo.
  - *Ajustes:* pH, antiespuma, temperatura etc.
  - *Relatório:* campos do **Relatório de Análise Microbiológica On Farm** (modelo 2026):
    dados da amostra, dados da análise (com padrões já preenchidos — Spread plate,
    diluições 10-3/10-4/10-5, incubação 30±02 °C) e resultados em **UFC/mL** (concentração do
    microrganismo de interesse com choque térmico + presença de outros microrganismos).
  - *Fotos:* anexe fotos do lote (placas de diluição 10-4/10-5, microscopia/Gram) usando a
    câmera do celular. As fotos ficam no Google Drive e entram no PDF do laudo.
  - *Laudo:* monta o laudo e oferece:
    - **📤 Enviar laudo (texto) no WhatsApp** — envia o laudo como mensagem de texto.
    - **📄 Enviar PDF no WhatsApp** — gera o PDF no formato do documento oficial (com as fotos)
      e compartilha o arquivo (Android) ou envia o link do PDF; e **👁 Ver / baixar PDF**.

> O cabeçalho do laudo (título, endereço e contato) pode ser ajustado no topo do
> `Index.html`, nas variáveis `LAUDO_TITULO`, `LAUDO_ENDERECO` e `LAUDO_CONTATO`.
- **Lotes (busca):** no mapa, **🔎 Lotes** busca por código/produto/organismo e filtra por
  situação, reunindo todos os lotes (não só por fermentador).
- **Painel & Análise:** no mapa, **📊 Painel** traz os indicadores **e a análise de dados** —
  consolida cada lote (condições de processo × resultado do laudo), com faixas-alvo por organismo,
  pH/temperatura médios e % dentro da faixa, médias de resultado (UFC/mL) por meio e por organismo,
  observações automáticas do que se associa a melhor rendimento, e **Exportar dados (CSV)**.
- Botão **⟳** no topo atualiza os dados manualmente (o app também atualiza sozinho a cada ~30s
  e ao reabrir, nas telas de leitura).

### Praticidade
- **Atualização automática** nas telas de leitura (mapa, painel, histórico, visitas, busca).
- **Rascunho automático** do lote: o que você digita não se perde ao trocar de aba ou recarregar
  (é gravado de vez quando você toca em *Salvar*).
- **Validação**: exige produto e organismo antes de *Finalizar produção*.
- **Nº de relatório automático** (sequencial) ao criar o lote.
- **Coleta liga ao laudo**: ao registrar uma *Coleta* de um lote (nas Visitas), o app preenche
  o *responsável pela coleta* e a *data da coleta* no Relatório daquele lote.

## Observações

- Os dados ficam **na sua planilha Google** — dá para consultar, filtrar e exportar direto por lá.
- O envio pelo WhatsApp abre o app/WhatsApp Web com o texto do laudo já preenchido; é só escolher
  o contato (ou já vai direto se você digitou o número) e enviar.
- O arquivo `Index.html` também funciona sozinho no navegador (com dados de demonstração salvos
  localmente) — útil para testar a interface antes de publicar.
