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
  extraída daquele arquivo: `#009364` (primário), `#00734B` (primário
  hover no claro), `#96A59E` (texto mudo/neutro), `#EEAA00` (aviso),
  `#C0683C` (negativo/saída — usado no lugar de um vermelho genérico
  pra manter tudo na família da paleta), `#212B27` (texto no tema
  claro), `#6C7B74` (texto mudo no tema claro). Fonte: "Segoe UI"
  (com fallback pra system-ui/Roboto).
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
