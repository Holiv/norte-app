-- Fase 3 (commit 1): investimentos (previdência automática + bruto manual) e metas.
-- Decisões completas em arquitetura-app-financas.md ("Fase 3 — Inteligência financeira").
--
-- Previdência é automática (descontada do salário bruto, nunca passa pela conta do
-- usuário) — a config guarda o % do bruto, o match da empresa e o teto opcional;
-- os aportes reais (proprio + contrapartida_empresa) são inseridos pelo app todo mês.
-- Investimento "bruto" e metas são sempre aportes manuais, registrados com data real.
--
-- "livre do mês" só desconta aportes de investimento tipo 'bruto' e aportes de metas
-- (nunca previdência, que já saiu no bruto->líquido antes de chegar no app).

-- =========================================================
-- investments
-- =========================================================
create table public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('previdencia', 'bruto')),
  -- previdência (automática)
  salario_bruto_mensal numeric(14, 2),
  percentual_proprio numeric(6, 4),
  percentual_match numeric(6, 4),
  teto_match_mensal numeric(14, 2),
  -- investimento bruto (manual)
  aporte_mensal_planejado numeric(14, 2),
  taxa_retorno_anual numeric(7, 4) not null,
  created_at timestamptz not null default now()
);

create index investments_user_id_idx on public.investments(user_id);

alter table public.investments enable row level security;

create policy "investments_select_own" on public.investments
  for select using (user_id = auth.uid());
create policy "investments_insert_own" on public.investments
  for insert with check (user_id = auth.uid());
create policy "investments_update_own" on public.investments
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "investments_delete_own" on public.investments
  for delete using (user_id = auth.uid());

-- =========================================================
-- investment_contributions
-- Ledger dos aportes reais, com data. 'contrapartida_empresa' só existe pra
-- investimento tipo previdência (inserida automaticamente pelo app).
-- =========================================================
create table public.investment_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  investment_id uuid not null references public.investments(id) on delete cascade,
  data date not null,
  valor numeric(14, 2) not null check (valor > 0),
  tipo text not null check (tipo in ('proprio', 'contrapartida_empresa')),
  created_at timestamptz not null default now()
);

create index investment_contributions_user_id_idx on public.investment_contributions(user_id);
create index investment_contributions_investment_id_idx on public.investment_contributions(investment_id);

alter table public.investment_contributions enable row level security;

create policy "investment_contributions_select_own" on public.investment_contributions
  for select using (user_id = auth.uid());
create policy "investment_contributions_insert_own" on public.investment_contributions
  for insert with check (user_id = auth.uid());
create policy "investment_contributions_update_own" on public.investment_contributions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "investment_contributions_delete_own" on public.investment_contributions
  for delete using (user_id = auth.uid());

-- =========================================================
-- goals
-- Dois modos: 'prazo' (usuário define prazo_meses, app calcula aporte) ou
-- 'aporte' (usuário define aporte_mensal, app calcula prazo). CP4.
-- =========================================================
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  valor_alvo numeric(14, 2) not null check (valor_alvo > 0),
  modo text not null check (modo in ('prazo', 'aporte')),
  prazo_meses integer,
  aporte_mensal numeric(14, 2),
  taxa_retorno_anual numeric(7, 4) not null,
  created_at timestamptz not null default now()
);

create index goals_user_id_idx on public.goals(user_id);

alter table public.goals enable row level security;

create policy "goals_select_own" on public.goals
  for select using (user_id = auth.uid());
create policy "goals_insert_own" on public.goals
  for insert with check (user_id = auth.uid());
create policy "goals_update_own" on public.goals
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "goals_delete_own" on public.goals
  for delete using (user_id = auth.uid());

-- =========================================================
-- goal_contributions
-- 'fixo' = ritmo assumido pra reprojeção; 'extra' = lump sum que antecipa o
-- prazo sem alterar o ritmo (regra fina do CP4).
-- =========================================================
create table public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  data date not null,
  valor numeric(14, 2) not null check (valor > 0),
  tipo text not null check (tipo in ('fixo', 'extra')),
  created_at timestamptz not null default now()
);

create index goal_contributions_user_id_idx on public.goal_contributions(user_id);
create index goal_contributions_goal_id_idx on public.goal_contributions(goal_id);

alter table public.goal_contributions enable row level security;

create policy "goal_contributions_select_own" on public.goal_contributions
  for select using (user_id = auth.uid());
create policy "goal_contributions_insert_own" on public.goal_contributions
  for insert with check (user_id = auth.uid());
create policy "goal_contributions_update_own" on public.goal_contributions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "goal_contributions_delete_own" on public.goal_contributions
  for delete using (user_id = auth.uid());
