# App de Controle Financeiro Pessoal — Arquitetura

## CP1 — Escopo e Requisitos (FECHADO)

**Objetivo:** app de controle financeiro pessoal com módulo de investimentos embutido, focado em praticidade de uso diário (registrar e visualizar rápido).

**Stack definida:**
- Frontend: PWA (React)
- Backend: Node.js
- Banco de dados: PostgreSQL (via Supabase)
- Deploy: Vercel
- Mesma estrutura já usada em projeto anterior (reaproveitar padrões/config)

**Uso:** individual no início, com modelagem já pensando em multi-usuário (dados isolados por usuário desde o design do schema, mesmo que a UI de "convidar outra pessoa" venha depois).

**Restrição de custo:** começar sem custo (free tier Supabase + Vercel).

**Funcionalidades core:**
1. Ingestão de dados via comprovante Pix / extrato do dia (foto ou PDF → extração automática) — sem integração bancária direta (Open Finance) na v1
2. Múltiplas fontes de renda (fixa + variáveis) com fluxo de caixa consolidado
3. Motor de orçamento adaptativo — limites dinâmicos que reagem ao fluxo real, não a um valor fixo mensal
4. Módulo de investimentos com acompanhamento de rendimento
5. Projeção de patrimônio de longo prazo
6. Cadastro e acompanhamento de dívidas de longo prazo (financiamentos, parcelas)
7. Dashboard "horizonte financeiro": visão de linha do tempo + limites + projeção

---

## CP2 — Modelo de Dados (FECHADO)

**Decisões:**
- Categorias: pré-definidas (fixo, alimentação, lazer, transporte, saúde, etc.) + usuário pode criar as próprias
- Investimentos: sincronização automática via API como padrão; cadastro manual como fallback para ativos que a API não cobre (ex: previdência privada)

**Entidades principais:**

- **users** — dados básicos, todo o resto isolado por `user_id`
- **income_sources** — id, user_id, nome, tipo (fixa/variável), periodicidade, valor esperado (null se variável)
- **accounts** — id, user_id, nome, tipo (conta corrente, carteira, etc.) — sem conexão bancária, só onde o saldo "mora"
- **categories** — id, user_id (null = categoria padrão do sistema), nome, tipo (receita/despesa), is_default
- **transactions** — id, user_id, account_id, category_id, income_source_id (null), valor, direção (entrada/saída), data, origem (manual/comprovante_pix/extrato), descrição, receipt_id (null)
- **receipts** — id, user_id, arquivo, tipo (comprovante_pix/extrato), status (processando/concluído/erro), dados_extraidos (json)
- **debts** — id, user_id, nome, valor_principal, taxa_juros, valor_parcela, saldo_devedor, prazo_meses, data_vencimento
- **investments** — id, user_id, nome, tipo (renda_fixa/renda_variável/previdência_privada/etc.), fonte (api/manual), ticker_externo (null), saldo_atual, rendimento_acumulado, última_sincronização
- **investment_contributions** — id, investment_id, data, valor, tipo_aporte (próprio/contrapartida_empresa) — cobre o caso da previdência privada com aporte 100% da empresa
- **budget_rules** — id, user_id, reserva_mínima, tipo_regra, parâmetros (json)

**Nota sobre a previdência privada:** modelada como `investment` com `fonte = manual`, e cada aporte registrado em `investment_contributions` separando o que é seu e o que é contrapartida da empresa — assim dá pra ver os dois números (saldo total x quanto já é "seu" de fato). Assumi que a contrapartida é 100% vestida (sem carência) — se o seu plano tiver regra de carência/vesting, ajustamos o campo depois.

---

## CP3 — Motor de Orçamento Adaptativo (FECHADO)

**Filosofia confirmada:** nada de valor fixo engessado. O usuário define metas/inputs, o app calcula e reajusta dinamicamente.

**Requisitos capturados (ordem executiva de implementação):**

1. **Cálculo do fluxo livre do mês** — renda (fixa + variável já recebida/esperada) menos dívidas/contas fixas menos meta de guarda/investimento mínima definida pelo usuário = "livre para o mês". Base de tudo o que vem depois.
2. **Meta de guarda mínima (input dinâmico do usuário)** — ex: "quero guardar/investir no mínimo R$X este mês" — não é % fixo, o usuário ajusta conforme o mês.
3. **Motor de sugestão de gastos** — a partir do "livre do mês", o app sugere quanto dá pra gastar em lazer, alimentação etc., e pode sugerir aumentar aporte se sobrar mais que o esperado.
4. **Investimento sem objetivo definido (longo prazo, "bruto")** — ex: 30% do salário líquido, à parte da previdência privada, sem meta específica, só acumulação de patrimônio.
5. **Módulo de Metas com objetivo definido** — usuário cadastra meta (nome, valor alvo, prazo desejado). App calcula aporte mensal necessário. Se o aporte real for maior/menor que o planejado, o prazo de conclusão da meta é recalculado automaticamente (reprojeção dinâmica, pra mais ou pra menos).
6. **Projeção de patrimônio futuro** — cenários em horizontes escolhíveis (1, 5, 10 anos), considerando padrão atual de aportes (metas + investimento sem objetivo + previdência). Permitir simulações "e se" (mudar % de aporte, taxa de retorno esperada, etc.) sem alterar os dados reais.

**Decisão de UI:** exibição em camadas (progressive disclosure) — por padrão mostra só o valor livre final; expandindo, mostra o detalhamento completo (recebido bruto, contas fixas, meta de guarda, livre).

---

## CP4 — Motor de Projeção e Metas (FECHADO)

### Fórmula base (valor futuro de série com aportes)
**FV = P₀·(1+i)ⁿ + PMT·[((1+i)ⁿ − 1)/i]**
- Taxa mensal derivada da anual por composição: **i = (1+taxa_anual)^(1/12) − 1** (nunca anual/12)
- Patrimônio total = soma da projeção de cada "balde" (cada um com sua taxa)

### Baldes
1. **Previdência privada** — aporte efetivo = 2×C (match de 100% da empresa). Modelar explicitamente. PENDENTE: carência/vesting do match.
2. **Investimento bruto** — ~30% do líquido, longo prazo, sem objetivo.
3. **Metas específicas** — cada uma com valor alvo e prazo.

### Taxa de retorno (DECIDIDO)
- App **sugere** a taxa por tipo de ativo (renda fixa ≈ Selic/CDI, renda variável ≈ média histórica, previdência ≈ conservadora).
- Defaults puxados de dados atuais (Selic/CDI/IPCA via API do Banco Central / brapi) e **editáveis** pelo usuário.

### Inflação (DECIDIDO)
- Projeção exibe **duas curvas: nominal e real** (real = deflacionada por IPCA esperado).
- IPCA esperado é um default editável.

### Cenários (conservador / médio / otimista)
- Presets da engine de simulação: variam a taxa de retorno (−X% / sugerida / +X%).
- Aporte projetado pra frente pode variar entre: guarda mínima (conservador) / média histórica de aportes (médio) / otimista.

### Reprojeção de metas (DECIDIDO — regra fina)
- **Ritmo assumido pra frente = aporte fixo mensal (PMT_fixo)**. Só muda por edição explícita do usuário.
- **Extras (renda variável) = lump sums** que abatem o saldo acumulado `A`. Não alteram o ritmo assumido, mas antecipam a data de conclusão.
- App nunca assume repetição de extras (são incertos); colhe o benefício apenas quando ocorrem.
- Prazo: **n = ln[(V·i + PMT_fixo)/(A·i + PMT_fixo)] / ln(1+i)**
- Dois modos de meta: (valor + prazo → calcula aporte) OU (valor + aporte → calcula prazo).
- Aporte necessário: **PMT = [FV − P₀(1+i)ⁿ]·i / [(1+i)ⁿ − 1]**

### Engine de simulação "e se"
- Roda sobre cópia dos dados (não persiste). Parâmetros ajustáveis: taxa de retorno, aporte mensal, horizonte (1/5/10 anos), aportes pontuais.

### PENDENTE (bridge CP3↔CP4)
- Regra de alocação do "livre do mês" entre os baldes (previdência, bruto, metas) — como o dinheiro se distribui quando há concorrência. (Próxima pergunta.)

---

### Engine de Alocação do "livre do mês" (DECIDIDO — bridge CP3↔CP4)

**Objetivo da função:** maximizar o fluxo de caixa livre ao longo do tempo.

**Princípio central:** pagar dívida = investimento livre de risco que rende a taxa da própria dívida → tudo (dívida, investimento, meta) é comparado na mesma régua de "retorno".

**Modo escolhido: MATEMÁTICA MANDA** (otimização financeira pura; metas emocionais ficam com a sobra). Determinístico.

**Cascata (waterfall):**
1. **Proteger:** guarda mínima + previdência até o limite do match (match de 100% = retorno instantâneo de 100%, prioridade máxima absoluta).
2. **Quitar dívida cara:** dívidas rankeadas por taxa decrescente; prioriza toda dívida cuja taxa > melhor retorno de investimento disponível. Para quando a taxa da dívida cai abaixo do retorno dos investimentos.
3. **Sobra → maior retorno:** vai pro balde de investimento de maior retorno. Metas NÃO são aceleradas por sobra sob math puro (o aporte da meta era discricionário; concluí-la cedo não "libera" obrigação mandatória como uma dívida). Metas recebem só o aporte fixo planejado.

**Escape hatch:** o app sempre propõe o ótimo financeiro, mas o usuário pode sobrepor manualmente a alocação de qualquer mês (é o dinheiro dele). O default é sempre a otimização.

**Efeito liberação (aplicável a dívidas):** concluir uma dívida devolve a parcela ao fluxo livre — capturado na régua de retorno via priorização por taxa.

**Nota de produto:** apresentar as sugestões como auxílio de planejamento baseado em matemática padrão, não como consultoria financeira profissional. Decisão final sempre do usuário.

---

## CP5 — Ingestão (OCR de comprovante/extrato) (FECHADO)

**Dois canais de entrada:**
- **Comprovante Pix** (foto, na hora da transação) — captura rápida, dia a dia.
- **Extrato do dia** (PDF/imagem, pode subir dias depois) — usuário seleciona a data à qual o extrato pertence; app reconcilia e recalcula.

**Fluxo:** captura → extração via modelo de visão → **tela de confirmação (sempre)** → categorização automática → salva → recalcula números do mês.

**Motor de Reconciliação (extrato):**
1. Extrai todas as transações do extrato.
2. Compara com as já registradas naquela data (comprovante/manual).
3. Casa por valor + direção (entrada/saída), tratando **multiplicidade** (2× R$15 no extrato e 1 registrada → adiciona só 1).
4. Casou → ignora (não duplica). Não casou → propõe adicionar (esquecidas).
5. Recalcula os números do mês.

**Extrato como fonte da verdade (DECIDIDO):** se o extrato diverge de uma transação já registrada, o app **alerta** o usuário pra corrigir — nunca sobrescreve sozinho. (Consistente com "sempre confirmo".)

**Categorização automática:** sugere pela descrição/favorecido e **aprende com as correções** do usuário (memória favorecido→categoria), ficando mais precisa com o uso.

**Nota técnica:** extração roda server-side chamando um modelo de visão (ex: API Anthropic). Arquivos ficam em bucket de storage (Supabase). Suporte a extrato de intervalo de datas (não só 1 dia) como extensão natural.

---

## CP6 — Handoff para Claude Code (FECHADO)

### Stack
- **Frontend:** React (PWA instalável)
- **Backend:** Node.js
- **Banco:** PostgreSQL via Supabase
- **Auth + Storage:** Supabase (Auth multi-usuário, Storage bucket p/ comprovantes)
- **Deploy:** Vercel
- **Custo inicial:** free tier Supabase + Vercel

### Isolamento de dados (multi-usuário desde já)
- Supabase Auth para login.
- **Row Level Security (RLS)** em todas as tabelas: policy `user_id = auth.uid()`. UI de "convidar outra pessoa" fica pra depois, mas o schema já nasce isolado.

### APIs externas
- **Cotações renda variável (ações/FIIs):** brapi.dev
- **Indicadores (Selic/CDI/IPCA)** p/ taxas sugeridas e curva real: API de dados abertos do Banco Central.
- **Extração OCR (visão):** chamada server-side a modelo de visão (API Anthropic). Docs: https://docs.claude.com/en/api/overview
- **Claude Code** para implementar. Docs: https://docs.claude.com/en/docs/claude-code/overview

### Ordem de construção (CONFIRMADA)

**Fase 1 — Fundação + fluxo diário (MVP usável)**
1. Setup: repo, Supabase (projeto + Auth), deploy Vercel, PWA scaffold.
2. Schema + RLS: users, accounts, income_sources, categories (seed de defaults), transactions, debts.
3. CRUD manual de transações; cadastro de rendas (fixa/variável) e dívidas.
4. Cálculo **"livre do mês"** = renda recebida/esperada − contas fixas/dívidas − guarda mínima.
5. Dashboard com progressive disclosure (valor livre por padrão; expandir p/ detalhe completo).

**Fase 2 — Ingestão sem fricção**
6. Upload comprovante Pix → extração via visão → tela de confirmação (sempre) → salva.
7. Categorização automática com aprendizado (memória favorecido→categoria).
8. Motor de reconciliação de extrato (casa por valor+direção, multiplicidade, extrato como fonte da verdade que alerta divergências) + recálculo do mês.

**Fase 2.5 — Sincronização automática via OneDrive (pós-Fase 2, opcional)**
Adicionada em 2026-07-19, depois de avaliar viabilidade a pedido do usuário.
Objetivo: usuário salva o comprovante numa pasta do OneDrive (já sincronizada
nativamente no iPhone dele) e o app detecta e processa automaticamente, sem
precisar abrir o app pra fazer upload manual — só confirmar depois.

- Registro de app no Microsoft Entra ID (gratuito) com suporte a contas
  pessoais Microsoft, pra permitir OAuth do OneDrive pessoal.
- Fluxo "conectar OneDrive" no app (tela de Configurações) — cada usuário
  autoriza a própria conta, token armazenado isolado por `user_id` (mesmo
  padrão RLS do resto do app).
- Assinatura de webhook da Microsoft Graph API na pasta designada (raiz ou
  subpasta — funciona em OneDrive pessoal). Validade máxima ~30 dias
  (42.300 min) — 1 cron job de renovação, bem dentro do limite de 1x/dia do
  Vercel Hobby.
- Endpoint (Vercel Function) recebe a notificação, baixa o arquivo novo,
  roda a mesma extração via visão da Fase 2, salva como "pendente de
  confirmação".
- Tela de fila de confirmação ao abrir o app.
- **Custo:** não deve gerar cobrança — uso padrão da Graph API é gratuito
  dentro de limites de uso razoáveis; só APIs "metered" avançadas (não
  usadas aqui) são pagas.
- **Por que depois da Fase 2 simples:** evita depurar duas integrações
  complexas novas (OCR + OAuth/webhook do OneDrive) ao mesmo tempo. Decisão
  do usuário: validar o pipeline de extração/reconciliação com upload
  manual primeiro, decidir depois se compensa.
- Web Share Target API (compartilhar direto da folha de compartilhamento
  do sistema) foi **descartada** como alternativa — não funciona no
  iOS/Safari (WebKit não implementa), que é a plataforma principal do
  usuário. OneDrive contorna essa limitação porque é sincronização de
  arquivo nativa do SO, não depende do navegador.

**Fase 3 — Inteligência financeira**
9. Motor de alocação waterfall determinístico (proteger → matar dívida cara → maior retorno). Escape hatch manual.
10. Metas com reprojeção dinâmica (aporte fixo = ritmo; extras = lump sums que antecipam prazo).
11. Sugestão de gastos a partir do livre do mês.

**Fase 4 — Investimentos + projeção**
12. Sincronização automática (brapi + Banco Central) + cadastro manual (previdência: aportes próprio + match).
13. Projeção de patrimônio: curvas nominal + real, cenários conservador/médio/otimista.
14. Engine de simulação "e se" (sobre cópia, não persiste).

### Pendências a resolver durante a implementação
- Carência/vesting do match da previdência (ajustar `investment_contributions` se houver).
- ~~Confirmar layout dos comprovantes Pix dos bancos que você mais usa~~ — **RESOLVIDO**,
  ver "Layout de comprovante Pix — referência p/ Fase 2" abaixo.

### Layout de comprovante Pix — referência p/ Fase 2 (Itaú)
Comprovante real anexado pelo usuário (2026-07-18), campos disponíveis
pro modelo de visão extrair:
- **Valor** (destaque no topo, formato "R$ 150,00")
- **Data/hora** ("Realizado em 15/07/2026 às 07:38:17")
- **De**: nome completo, CPF mascarado (`***.958.817-**`), instituição
- **Para**: nome completo, CPF mascarado, instituição, **chave Pix**
  (nesse exemplo, um email)
- **Autenticação** (hash) e **ID da transação** — únicos, podem servir
  de chave de deduplicação na Fase 2 se o mesmo comprovante for
  enviado 2x
- **Canal** (ex.: "Celular")
Pendente: comprovantes de outros bancos que o usuário usa (Banco
Inter, etc.) — pedir quando chegarmos na Fase 2 pra confirmar se o
layout varia muito entre eles.

### Como usar este documento no Claude Code
Comece a Fase 1 pedindo ao Claude Code para: (a) inicializar o projeto na stack acima, (b) criar o schema com RLS, (c) implementar o CRUD e o cálculo do "livre do mês". Trate cada item numerado como um checkpoint de commit.

---

## Decisões de implementação — Fase 1 (tomadas durante os commits)

**Arquitetura de dados (commit 1):** frontend fala direto com Supabase
(`supabase-js`, protegido por RLS); Node.js existe só como Vercel
Serverless Functions (`api/`), usadas a partir da Fase 2 onde há segredo
(OCR de visão, chamadas a brapi/Banco Central).

**Login (commit 2):** email + senha via Supabase Auth. Confirmação de
email desativada no painel do Supabase para a Fase 1 (uso individual);
reativar antes de expor o app a mais gente.

**Schema (commit 3):**
- **Sem tabela `public.users` própria** — `auth.users` (Supabase Auth) é
  a fonte de verdade da identidade; as demais tabelas referenciam
  `auth.users(id)` diretamente. Se surgir necessidade de dados de perfil
  (nome de exibição, preferências), criar `public.profiles` nessa hora.
- **Exclusão de conta (`accounts`) com transações vinculadas: bloqueada**
  (`on delete restrict`). Protege histórico financeiro — usuário precisa
  mover/apagar as transações antes de excluir a conta.
- **Exclusão de categoria personalizada com transações vinculadas:
  bloqueada** (`on delete restrict`), mesma lógica de proteção.
  Categorias padrão do sistema (`user_id null`) nunca são excluíveis
  por usuários (RLS de update/delete exige `user_id = auth.uid()`).
- **`income_source_id` em `transactions` é auxiliar**: se a fonte de
  renda for excluída, a transação só perde a referência (`on delete set
  null`), sem bloquear a exclusão — diferente de conta/categoria porque
  não é um campo de classificação financeira essencial.
- **`debts.taxa_juros_anual`**: fração decimal (ex.: `0.129` = 12,9%
  a.a.), mesma convenção da engine de projeção do CP4 (taxa mensal
  derivada por composição, nunca anual/12).
- **`debts.data_vencimento`**: interpretada como data prevista de
  quitação final (última parcela) — não existe `data_inicio`
  separada; é o único campo temporal que ancora se a dívida ainda está
  ativa. Ajustar se a intenção era outra (ex.: dia de vencimento da
  parcela mensal).
- **Categorias padrão semeadas** (`supabase/seed.sql`): despesa → Fixo,
  Alimentação, Lazer, Transporte, Saúde, Educação, Compras, Assinaturas,
  Outros; receita → Salário, Renda Extra, Outros. Editável — usuário
  pode criar as próprias a qualquer momento (já previsto no CP2).

**Motor "livre do mês" — peças de apoio (commit 8, antes do motor em si):**
- **Toda transação de entrada exige fonte de renda** (`income_source_id`
  obrigatório na UI para `direcao = 'entrada'`, campo "Nenhuma" removido).
  Motivo: 1) evita contar renda fixa 2x (uma vez pelo `valor_esperado` da
  fonte fixa, outra pela transação solta), já que o motor só soma como
  "renda variável recebida" as entradas vinculadas a uma fonte do tipo
  `variavel`; 2) cobre o caso de uso real do usuário (renda variável =
  projetos fechados com clientes) sem precisar de schema novo: a fonte de
  renda reutilizável (ex.: "Prestação de Serviço") entra por
  `income_source_id`, e a identificação específica do projeto (ex.:
  "Projeto estrutural do Jonathan") vai no campo `descricao`, que já
  existia.
- **Nova entidade `fixed_expenses`** ("contas fixas recorrentes": nome +
  valor esperado mensal, ex. "Aluguel R$1500"). Cobre a parte de "contas
  fixas" da fórmula do CP3, que não tinha tabela própria. Uso híbrido
  proativo+reativo: por padrão o motor conta o `valor_esperado`; se uma
  transação de saída do mês for vinculada a ela (`transactions.
  fixed_expense_id`, opcional — diferente de `income_source_id`, que é
  obrigatório só pra entrada), o motor usa o valor real lançado no lugar
  do esperado. `on delete set null` (auxiliar, não bloqueia exclusão).
- **Nova tabela `budget_rules`** (`user_id` como chave primária, 1 linha
  por usuário): guarda a "guarda mínima" do mês como **valor único
  atual**, sem histórico por mês — decisão explícita da Fase 1. Se no
  futuro for preciso reconstruir o "livre do mês" de meses passados com
  exatidão, criar versão histórica (chave por mês) nessa hora.

**Motor "livre do mês" (commit 9):** função pura `calcularLivreDoMes` em
`src/lib/calc/livreDoMes.ts`, com 8 testes unitários (Vitest). Sem
acesso a rede — recebe os dados já buscados e devolve o breakdown
completo (`rendaFixa`, `rendaVariavelRecebida`, `dividasAtivas`,
`contasFixas` com detalhe por conta fixa, `guardaMinima`, `livre`).
`src/features/dashboard/api.ts` faz a ponte com o Supabase.

**Dashboard com progressive disclosure (commit 10 — fecha a Fase 1):**
mostra só o valor livre do mês por padrão; botão "Ver detalhes" expande
o breakdown completo, incluindo por conta fixa qual valor foi usado
(esperado vs. lançado). Virou a aba padrão do app ao logar (era
"Transações") — decisão de UX não bloqueante: ver o panorama do mês
antes de registrar algo pareceu mais natural que abrir direto no
formulário; fácil de reverter se não fizer sentido no uso real.

---

## Fase 1 — CONCLUÍDA

Todos os 5 itens do CP6 (setup, schema+RLS, CRUD manual, motor "livre
do mês", dashboard) implementados e testados ponta a ponta em
navegador headless a cada commit. 10 commits no total, todos no
GitHub (`Holiv/norte-app`, branch `main`). Deploy no Vercel ainda não
foi feito — próximo passo natural antes de considerar a Fase 1
"em uso real", ou já emendar direto na Fase 2 conforme o usuário
decidir.

**Deploy (Vercel):** projeto `norte-app` importado do GitHub via
dashboard Vercel (deploy automático a cada push em `main`, preview em
outras branches/PRs). Env vars de produção configuradas
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). URL de produção:
https://norte-app-lyart.vercel.app — testado ponta a ponta (cadastro,
login, dashboard) direto em produção, sem erros de console.

---

## Checkpoint de Design — Redesign visual (pós-Fase 1, antes da Fase 2)

**Motivação:** app funcional mas visualmente básico/sem identidade.
Decisão do usuário: pausar antes da Fase 2 pra fechar um padrão visual
agora, evitando retrabalho conforme novas telas forem criadas.

**Decisões (checkpoint com o usuário):**
- **Abordagem:** Tailwind CSS v4 (`@tailwindcss/vite`) + componentes
  reutilizáveis próprios (não uma lib pronta tipo shadcn/ui).
- **Identidade de cor:** verde Arteris `#009364` como cor primária —
  vem de um tema de dataviz (Power BI) que o usuário já usa em outros
  projetos (`arteris_tema.json`, anexado 2026-07-18). Paleta completa
  extraída daquele arquivo: `#009364` (primário/positivo), `#00734B`
  (primário hover no claro), `#96A59E` (texto mudo/neutro), `#EEAA00`
  (aviso **e** negativo/saída — é o "bad" do próprio tema Arteris,
  ajustado depois do commit 4 pra substituir um vermelho genérico que
  não vinha da paleta), `#212B27` (texto no tema claro), `#6C7B74`
  (texto mudo no tema claro). Fonte: "Segoe UI" (com fallback pra
  system-ui/Roboto).
- **Tema:** **dark é a identidade nativa do app** (não segue o SO).
  Usuário pode trocar pra claro manualmente nas Configurações,
  preferência persistida em `localStorage`. Script inline no
  `index.html` aplica a classe `.light` antes do primeiro paint
  (evita flash de tema errado ao recarregar com "claro" selecionado).
- **Escopo:** liberado pra repensar também navegação/layout, não só
  cores — ex. sidebar no desktop + navegação mobile responsiva,
  formulários em modal em vez de sempre visíveis, cards em vez de
  listas simples.

**Mecanismo de tema:** tokens de cor via CSS custom properties em
`:root` (dark, valores diretos) e `:root.light` (override completo),
referenciados dentro de `@theme` do Tailwind (`--color-canvas`,
`--color-surface`, `--color-ink`, `--color-primary`, etc.) — gera
utilities como `bg-canvas`, `text-ink`, `bg-primary` que já respeitam
o tema ativo automaticameante, sem precisar de variante `dark:` no
JSX. `ThemeProvider` (`src/lib/ThemeProvider.tsx`) expõe
`useTheme()` pra ler/trocar o tema de dentro de componentes React.

**Ordem de commits do redesign:**
1. Setup Tailwind + tokens de design (dark nativo + light) — sem UI nova
2. Componentes reutilizáveis (Button, Input, Select, Card, Modal, nav)
3. Shell do app: sidebar desktop + navegação mobile, toggle de tema
4. Dashboard redesenhado
5. Login/Cadastro redesenhado
6. Contas + Rendas redesenhadas (modal + cards)
7. Dívidas + Contas fixas redesenhadas
8. Transações redesenhada
9. Configurações redesenhada + polimento responsivo final

Páginas ainda não migradas continuam funcionando com o CSS antigo
(`App.css`) durante a transição — sem quebra de funcionalidade entre
commits, só visual desatualizado até chegar a vez de cada tela.

### Checkpoint de Design — CONCLUÍDO

Todos os 9 commits do redesign feitos e testados (browser headless,
mobile/tablet/desktop). `App.css` foi completamente removido no
commit 9 — todo o app agora usa Tailwind + os tokens de design. Além
do planejado originalmente:
- Toggle de tema (Escuro/Claro) também disponível dentro da própria
  tela de Configurações, não só no shell — pedido explícito do
  usuário ("se quiser claro, mudar pra claro em configurações").
- Transações manteve o formulário sempre visível (não virou modal
  como as outras telas) — é a ação mais frequente do app, e um modal
  adicionaria fricção à métrica mais importante do produto ("poucos
  toques").

Pronto pra retomar a Fase 2 (Ingestão sem fricção) quando o usuário
pedir.

---

## Fase 2 — Ingestão sem fricção (em andamento)

**Commit 1 — infraestrutura (schema + storage + extração):**
- Tabela `receipts` (id, user_id, arquivo, tipo, status, dados_extraidos
  jsonb, erro_mensagem) com RLS. `transactions.receipt_id` (reservado
  desde a Fase 1) ganhou a FK de verdade.
- Bucket de Storage `comprovantes` (privado), RLS por pasta
  `{user_id}/{arquivo}` via `storage.foldername(name)[1] = auth.uid()`.
- `api/extract-receipt.ts` (Vercel Function): recebe `receiptId` +
  JWT do usuário (Authorization: Bearer), baixa o arquivo do Storage
  usando um client Supabase autenticado como o próprio usuário (sem
  precisar de `service_role` — RLS resolve o acesso), chama a API de
  visão da Anthropic (`claude-opus-4-8`, `output_config.format` com
  JSON Schema pra saída estruturada — mais confiável que pedir JSON no
  prompt e fazer parsing manual) e grava o resultado em `receipts`.
- Schema de extração: valor, data, de_nome, para_nome, instituicao_de,
  instituicao_para, chave_pix, autenticacao, id_transacao,
  descricao_sugerida. A direção (entrada/saída) e a categoria **não**
  são adivinhadas pelo modelo — ficam a cargo da tela de confirmação
  (próximo commit), consistente com "extração sempre revisada" do CP5.
- `tsconfig.api.json` criado (a pasta `api/` não era typecheckada
  antes) e referenciado em `tsconfig.json`.
- **Testado com o comprovante real** (Itaú, anexado 2026-07-18):
  todos os campos batem exatamente (valor R$150, data 15/07/2026,
  nomes, instituições, chave Pix, autenticação, ID da transação).
  Custo observado: ~2850 tokens de entrada + ~230 de saída por
  extração (frações de centavo).

**Commit 2 — upload + tela de confirmação (sempre):**
- `ReceiptUploadModal` (`src/features/receipts/`): input de arquivo
  simples (sem câmera — decisão do usuário, ele não fotografa
  comprovante, salva o arquivo e escolhe no app), sem drag-and-drop
  por enquanto. Estados: `pick → processing → review → saving`.
- Upload vai direto pro Storage (`comprovantes/{user_id}/{uuid}.ext`)
  usando a sessão do próprio usuário — sem passar pelo backend.
  Depois cria a linha em `receipts` (status `processando`) e chama
  `/api/extract-receipt`.
- Tela de review pré-preenche valor/data/descrição com o que veio da
  extração, mas direção, conta, categoria, fonte de renda e conta
  fixa são sempre decisão do usuário (mesmas regras de obrigatoriedade
  da tela de Transações manual) — nada salva sem essa confirmação,
  conforme CP5.
- Cancelar a revisão apaga o `receipts` criado (limpeza best-effort,
  evita lixo acumulando no Storage de tentativas abandonadas).
- Botão "Importar comprovante" na aba Transações (onde já vive o
  fluxo manual).
- `ANTHROPIC_API_KEY` configurada no Vercel (Production/Preview/
  Development) — a função só roda em deploy, não no `npm run dev`
  local.

**Commit 3 — categorização automática com aprendizado:**
- Tabela `payee_category_memory` (id, user_id, favorecido_normalizado,
  category_id, updated_at), RLS por `user_id = auth.uid()`, unique em
  `(user_id, favorecido_normalizado)` — um mapeamento por favorecido
  por usuário, atualizado (upsert) a cada confirmação.
- **Favorecido** = `para_nome` extraído do comprovante quando a
  transação é saída, `de_nome` quando é entrada (esses são os únicos
  campos "limpos" e estruturados que temos — a extração da IA, não
  texto livre). Normalização: trim + lowercase + colapso de espaços
  (sem remoção de acentos por enquanto).
- **Escopo desta primeira versão: só o fluxo de importação de
  comprovante.** O lançamento manual de transação não tem campo de
  favorecido estruturado (só `descricao` livre, editável, sem padrão
  consistente pra casar), então a memória não se aplica lá — decisão
  natural da arquitetura de extração já fechada no Commit 1, não uma
  ambiguidade nova. Quando o extrato entrar (próximo commit), se ele
  também trouxer favorecido estruturado, a mesma tabela/lógica serve.
- Na tela de revisão do comprovante: ao extrair (ou ao trocar
  Entrada/Saída), busca `payee_category_memory` pelo favorecido da
  direção atual; se achar, pré-seleciona a categoria e mostra um badge
  "Sugerido com base em lançamentos anteriores". Se não achar, cai no
  comportamento anterior (primeira categoria de despesa/receita).
- Ao salvar a transação, grava/atualiza a memória com a categoria que
  o usuário efetivamente confirmou (seja a sugestão aceita, seja uma
  escolhida manualmente) — assim o aprendizado se reforça ou se
  corrige a cada uso, conforme CP5.

**Commit 4 — upload e reconciliação de extrato:**
- **Decisões de produto confirmadas com o usuário antes de implementar:**
  - Extrato só extrai **saídas** (débitos/Pix enviados) — entradas são
    raras no dia a dia (valor fixo mensal + eventual "Prestação de
    Serviço") e continuam lançadas manualmente na tela de Transações.
    O modelo de visão nem tenta identificar direção por linha; todo
    item extraído do extrato é saída, ponto.
  - Revisão em **tabela única com todas as linhas novas de uma vez**
    (não modal um-a-um como o comprovante Pix) — extrato pode trazer
    várias transações, e revisar uma por uma seria muito atrito.
- Reaproveita a tabela `receipts` (`tipo = 'extrato'`), mas
  `dados_extraidos` guarda `{ linhas: [...] }` (array), diferente do
  objeto único do comprovante Pix. `api/extract-statement.ts`
  (Vercel Function separada, mesmo padrão de auth/storage/schema
  embutido do `extract-receipt.ts`): prompt instrui o modelo a
  extrair só as saídas, cada linha com valor, data, favorecido
  (opcional) e descrição sugerida.
- **Sem seletor de data global**: cada linha extraída já vem com sua
  própria data (a extração já é estruturada por linha, diferente de
  quando o CP5 foi desenhado). Isso implementa de graça a "extensão
  natural" de suporte a extrato de intervalo — um único upload pode
  cobrir várias datas sem trabalho extra.
- **Motor de reconciliação** (`src/features/categorization/reconcile.ts`,
  puro, testado com Vitest): busca transações de saída já registradas
  nas datas que aparecem no extrato, casa cada linha por
  `(valor, data)` tratando multiplicidade (cada transação registrada
  só "consome" uma linha do extrato). Linha sem par → **nova**
  (candidata a adicionar). Transação registrada sem par no extrato →
  **divergente** (alerta informativo no topo da revisão — "N
  transação(ões) já lançada(s) nessas datas não aparecem no extrato,
  confira" — nunca corrige nada sozinho, só avisa, conforme CP5).
- Tela de revisão (`StatementUploadModal`): uma conta só pra todo o
  lote (um extrato = uma conta bancária), cada linha nova com
  valor/data/descrição editáveis, categoria com a mesma sugestão por
  favorecido do Commit 3, e um ícone de lixeira pra remover uma linha
  do lote antes de confirmar. Um botão só ("Adicionar N transações")
  salva tudo de uma vez; cada transação salva atualiza a memória de
  categorização por favorecido, igual ao comprovante Pix.
- `createTransaction`/`TransactionInput` ganharam `origem` e
  `receipt_id` opcionais (antes só existiam na coluna do banco, mas
  nunca eram passados pelo frontend — toda transação virava `origem:
  'manual'` mesmo vindo de comprovante). Corrigido também no
  `ReceiptUploadModal` do Commit 2: agora grava `origem:
  'comprovante_pix'` e o `receipt_id` de verdade.

**Fase 2 (ingestão sem fricção) — CONCLUÍDA.** Próxima fase só
começa a pedido explícito do usuário.

---

## Fase 3 — Inteligência financeira (em andamento)

Iniciada em 2026-07-19 a pedido do usuário. Antes de implementar, várias
ambiguidades reais entre o CP3 e o CP4 precisaram ser fechadas — registradas
abaixo porque mudam a arquitetura do "livre do mês" que está no ar desde a
Fase 1.

### Decisão — "Livre do mês" não muda de fórmula
A fórmula do CP3 continua valendo tal como está: **Renda líquida recebida −
contas fixas/dívidas obrigatórias − guarda mínima**. O CP4 descrevia o
waterfall como se ele "consumisse" esse número (previdência, dívida extra,
investimento bruto saindo dele) — mas isso tornaria o "livre do mês" mostrado
hoje enganoso (pareceria sobrar mais do que realmente sobra). Decisão do
usuário: investimentos e metas **não são obrigações** como dívida — só
descontam do livre do mês quando o aporte é **efetivamente registrado**
(evento real, com data), nunca por estarem apenas "planejados/configurados".
O waterfall vira uma ferramenta 100% consultiva: sugere alocação ótima do
livre do mês atual (dívida cara vs. investimento bruto), mas não desconta
nada sozinho — o usuário decide se segue a sugestão e registra o aporte.

### Decisão — Previdência privada é automática, não um aporte manual
A previdência do usuário é descontada direto do salário bruto (nunca chega a
aparecer no líquido que ele lança no app). Modelagem:
- Configuração (tela de Investimentos): **salário bruto mensal**, **% do
  bruto** que vira aporte próprio, **% de match da empresa** (aplicado sobre
  o que o usuário aportou — hoje 1:1, ou seja, empresa iguala 100% do aporte
  próprio), teto de match mensal opcional.
- Todo mês, ao abrir o app, se ainda não existe o registro da previdência
  daquele mês, o app calcula (bruto × %) e insere sozinho em
  `investment_contributions` (tipo `proprio` e `contrapartida_empresa`) —
  sem pedir confirmação, já que não é uma escolha do usuário mês a mês.
- **Não desconta do livre do mês** (o dinheiro nunca passou pela conta do
  usuário pra começar — já saiu no bruto→líquido).
- **Sem aviso de "match não capturado"**: o usuário não vai fazer aportes
  extras de previdência além do que já é automático — essa sugestão foi
  removida do escopo. Quando o waterfall indicar espaço pra investir, o
  destino é outros ativos (Tesouro Selic, ETFs internacionais como VT),
  ou seja, o balde "investimento bruto".
- Acompanhamento de saldo/rendimento composto da previdência (e dos demais
  investimentos) fica pra Fase 4 — a Fase 3 só guarda o histórico de aportes
  (soma acumulada), sem calcular rendimento.

### Referência p/ Fase 4 — planilha de controle de investimentos do usuário
O usuário tinha uma planilha própria (`docs/Controle de Investimentos
Internacionais.xlsx`) que fazia acompanhamento de patrimônio e alocação por
setor/país, incluindo look-through de ETFs. Parte dela quebrou (rodava com
`GOOGLEFINANCE` no Google Sheets; ao baixar o arquivo, as fórmulas de cotação
pararam de resolver — mas a lógica nas células continua íntegra e foi
analisada campo a campo). Estrutura, pra quando a Fase 4 chegar:
- **3 grupos de ativos**: Stocks (ações individuais), ETFs, REITs — cada
  ativo com quantidade, cotação, cost basis, market value (qtd × cotação),
  setor, país, e "Wallet %" (peso no patrimônio total). Também tem uma linha
  de patrimônio em BTC e um "disponível para alocação" (cash).
- **Look-through de ETF**: a parte mais sofisticada — cada ação individual
  soma não só seu peso direto na carteira, mas também a exposição indireta
  via ETFs que a contêm (ex: peso da AAPL dentro do XLK), chegando a um
  "Total %" real de exposição àquele ativo/setor/país.
- **Cada ETF tem sua própria aba** com top holdings (nome, peso %, setor,
  país) mantidos **manualmente** (não tem fonte automática de holdings de
  ETF via Google Finance — só cotação). Isso é o principal ponto de atenção
  técnico pra Fase 4: replicar esse look-through exigiria ou manutenção
  manual de holdings por ETF, ou uma API paga que forneça isso.
- **Metas de alocação por setor e por país** ("Ideal %"), comparadas com o
  peso atual (olhando através dos ETFs) pra calcular quanto falta alocar
  (em R$) em cada categoria pra bater a meta.
- Ativos são majoritariamente internacionais (ETFs Vanguard/iShares, ações
  US, alguma exposição China/Brasil) — Fase 4 provavelmente precisa lidar
  com câmbio (USD/BRL) na precificação, não só valor de mercado local.
- Essa sofisticação (look-through + metas por setor/país) é claramente maior
  que o item 13 do roadmap ("projeção de patrimônio: curvas nominal/real,
  cenários") — quando a Fase 4 começar, vale abrir um checkpoint específico
  só pra decidir quanto desse nível de detalhe entra na v1 do módulo.

**Commit 1 — schema + motor "livre do mês" estendido:**
- Migração `0005_investments_and_goals.sql`: tabelas `investments`,
  `investment_contributions`, `goals`, `goal_contributions` + RLS
  (detalhes de cada campo nas decisões acima).
- `calcularLivreDoMes` (`src/lib/calc/livreDoMes.ts`) ganhou dois novos
  descontos opcionais: soma de `investment_contributions` do mês corrente
  com `investmentTipo === 'bruto'` (nunca `previdencia`) e soma de
  `goal_contributions` do mês corrente. Testado com Vitest, incluindo o
  caso que mais importa: aporte de previdência **não** desconta o livre
  do mês.
- Dashboard atualizado com as duas novas linhas ("Aportes em
  investimentos", "Aportes em metas") no detalhamento expandido.

**Commit 2 — páginas de Investimentos e Metas:**
- `InvestmentsPage`: CRUD com formulário que muda de cara conforme o tipo
  (previdência: salário bruto + % próprio + % match + teto opcional;
  bruto: aporte mensal planejado + taxa de retorno). Botão "Registrar
  aporte" só aparece pra investimento tipo `bruto` (previdência é
  automática, sem ação do usuário).
- `ensurePrevidenciaContribuicaoDoMes`: roda toda vez que a página
  carrega; se não existe registro do mês corrente pra aquele
  investimento de previdência, calcula (salário bruto × %) e insere
  sozinho em `investment_contributions` (tipo `proprio` e, se
  configurado, `contrapartida_empresa` respeitando o teto) — sem pedir
  confirmação.
- `GoalsPage`: CRUD de metas (modo `prazo` ou `aporte`) + registrar
  aporte (`fixo`/`extra`) + motor de reprojeção
  (`src/lib/calc/metaReprojection.ts`, puro, testado com Vitest,
  fórmulas exatas do CP4). Card mostra o valor calculado ao vivo
  (aporte necessário ou prazo estimado) toda vez que os aportes mudam.
- Testado ponta a ponta em navegador headless: investimento bruto (criar,
  registrar aporte, total acumulado atualiza), previdência (criar,
  reload da página gera o aporte automático do mês sozinho — R$960
  próprio + R$960 match pra 8% de R$12.000 com 100% de match — sem
  aparecer no livre do mês, que continuou correto), meta (criar, ver
  prazo estimado, registrar aporte, ver prazo recalculado). Sem erros de
  console.
- Nav (`AppShell`): novos itens "Investimentos" e "Metas" na navegação
  secundária.

**Commit 3 — waterfall consultivo + sugestão de gastos, no Dashboard:**
- `calcularWaterfall` (`src/lib/calc/waterfall.ts`, puro, testado com
  Vitest): dado o livre do mês atual, a maior taxa de retorno entre os
  investimentos tipo `bruto` cadastrados, e as dívidas ativas (mesmo
  filtro de "ativa" do motor de livre do mês, mais saldo devedor > 0),
  rankeia dívidas por taxa decrescente e sugere quitação extra pra
  toda dívida com taxa maior que o retorno do investimento — sobra vai
  de sugestão pro investimento bruto. 100% consultivo: só sugere, não
  desconta nada e não grava nada sozinho — o usuário decide se segue,
  registrando o aporte em Investimentos ou ajustando o saldo da dívida
  em Dívidas, do jeito que já existia antes.
- `calcularSugestaoDeGastos` (`src/lib/calc/spendingSuggestion.ts`,
  puro, testado com Vitest): média de gasto discricionário (exclui
  transações vinculadas a conta fixa) por categoria nos últimos 3
  meses, distribuída proporcionalmente sobre o livre do mês atual.
  Categoria sem histórico no período fica de fora.
- Dashboard ganhou duas seções novas (só aparecem quando há algo pra
  sugerir): "Sugestão de alocação do livre do mês" e "Sugestão de
  gastos por categoria".
- Testado ponta a ponta: dívida de 20% a.a. (saldo R$500) + investimento
  bruto de 8% a.a. + livre do mês de R$7.500 → sugeriu quitar os R$500
  da dívida (única acima da taxa de corte) e destinar os R$7.000
  restantes ao investimento bruto; 3 meses de histórico numa única
  categoria → sugestão de gastos alocou 100% do livre nela (matemática
  correta pro cenário). Sem erros de console **em produção**; em dev
  apareceu um 401 transitório numa das requisições do Dashboard —
  investigado e é artefato do StrictMode (efeitos duplicados só em
  dev), não reproduz em build de produção e não é um bug novo desta
  fase (o padrão `useEffect(() => refresh(), [])` sem cancelamento já
  existe em todas as páginas desde a Fase 1 — o Dashboard só ficou mais
  suscetível por disparar ~11 queries concorrentes no mount agora).

**Fase 3 (inteligência financeira) — CONCLUÍDA.** Próxima fase só
começa a pedido explícito do usuário.
