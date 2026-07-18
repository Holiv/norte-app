-- Fase 1 (commit 8): contas fixas recorrentes + guarda mínima mensal.
-- Peças que faltavam pro motor "livre do mês" (CP3 item 1).

-- =========================================================
-- fixed_expenses
-- Contas fixas recorrentes (aluguel, internet, etc.). valor_esperado é usado
-- proativamente no cálculo; se uma transação do mês for vinculada a ela
-- (transactions.fixed_expense_id), o motor usa o valor real no lugar do
-- esperado (reativo).
-- =========================================================
create table public.fixed_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  valor_esperado numeric(14, 2) not null,
  created_at timestamptz not null default now()
);

create index fixed_expenses_user_id_idx on public.fixed_expenses(user_id);

alter table public.fixed_expenses enable row level security;

create policy "fixed_expenses_select_own" on public.fixed_expenses
  for select using (user_id = auth.uid());
create policy "fixed_expenses_insert_own" on public.fixed_expenses
  for insert with check (user_id = auth.uid());
create policy "fixed_expenses_update_own" on public.fixed_expenses
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "fixed_expenses_delete_own" on public.fixed_expenses
  for delete using (user_id = auth.uid());

-- =========================================================
-- transactions.fixed_expense_id
-- Vínculo opcional (só faz sentido pra saída); auxiliar como income_source_id,
-- por isso on delete set null em vez de restrict.
-- =========================================================
alter table public.transactions
  add column fixed_expense_id uuid references public.fixed_expenses(id) on delete set null;

create index transactions_fixed_expense_id_idx on public.transactions(fixed_expense_id);

-- =========================================================
-- budget_rules
-- Guarda mínima do mês: um valor único "atual" por usuário (sem histórico
-- por mês, decisão da Fase 1 — ver arquitetura-app-financas.md).
-- user_id como chave primária garante 1 linha por usuário (upsert simples).
-- =========================================================
create table public.budget_rules (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reserva_minima numeric(14, 2) not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.budget_rules enable row level security;

create policy "budget_rules_select_own" on public.budget_rules
  for select using (user_id = auth.uid());
create policy "budget_rules_insert_own" on public.budget_rules
  for insert with check (user_id = auth.uid());
create policy "budget_rules_update_own" on public.budget_rules
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "budget_rules_delete_own" on public.budget_rules
  for delete using (user_id = auth.uid());
