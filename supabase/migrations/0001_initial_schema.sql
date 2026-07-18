-- Fase 1: schema inicial + RLS
-- accounts, income_sources, categories, transactions, debts
-- Isolamento multi-usuário via RLS: user_id = auth.uid() em todas as tabelas.
-- users: não criamos tabela própria — auth.users (Supabase Auth) é a fonte de verdade.

-- =========================================================
-- accounts
-- =========================================================
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  tipo text not null,
  created_at timestamptz not null default now()
);

create index accounts_user_id_idx on public.accounts(user_id);

alter table public.accounts enable row level security;

create policy "accounts_select_own" on public.accounts
  for select using (user_id = auth.uid());
create policy "accounts_insert_own" on public.accounts
  for insert with check (user_id = auth.uid());
create policy "accounts_update_own" on public.accounts
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "accounts_delete_own" on public.accounts
  for delete using (user_id = auth.uid());

-- =========================================================
-- income_sources
-- =========================================================
create table public.income_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('fixa', 'variavel')),
  periodicidade text,
  valor_esperado numeric(14, 2), -- null se variável
  created_at timestamptz not null default now()
);

create index income_sources_user_id_idx on public.income_sources(user_id);

alter table public.income_sources enable row level security;

create policy "income_sources_select_own" on public.income_sources
  for select using (user_id = auth.uid());
create policy "income_sources_insert_own" on public.income_sources
  for insert with check (user_id = auth.uid());
create policy "income_sources_update_own" on public.income_sources
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "income_sources_delete_own" on public.income_sources
  for delete using (user_id = auth.uid());

-- =========================================================
-- categories
-- user_id = null → categoria padrão do sistema (somente leitura para usuários)
-- =========================================================
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('receita', 'despesa')),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index categories_user_id_idx on public.categories(user_id);

alter table public.categories enable row level security;

-- Leitura: próprias categorias + categorias padrão do sistema (user_id null)
create policy "categories_select_own_or_default" on public.categories
  for select using (user_id = auth.uid() or user_id is null);
-- Escrita: só nas próprias (nunca nas padrão do sistema, já que auth.uid() nunca é null)
create policy "categories_insert_own" on public.categories
  for insert with check (user_id = auth.uid());
create policy "categories_update_own" on public.categories
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "categories_delete_own" on public.categories
  for delete using (user_id = auth.uid());

-- =========================================================
-- transactions
-- Exclusão de account/category com transações vinculadas é bloqueada (on delete restrict).
-- income_source é auxiliar: se excluído, a transação só perde a referência (on delete set null).
-- =========================================================
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  category_id uuid not null references public.categories(id) on delete restrict,
  income_source_id uuid references public.income_sources(id) on delete set null,
  valor numeric(14, 2) not null check (valor > 0),
  direcao text not null check (direcao in ('entrada', 'saida')),
  data date not null,
  origem text not null default 'manual' check (origem in ('manual', 'comprovante_pix', 'extrato')),
  descricao text,
  receipt_id uuid, -- reservado para Fase 2 (tabela receipts ainda não existe)
  created_at timestamptz not null default now()
);

create index transactions_user_id_idx on public.transactions(user_id);
create index transactions_account_id_idx on public.transactions(account_id);
create index transactions_category_id_idx on public.transactions(category_id);
create index transactions_data_idx on public.transactions(data);

alter table public.transactions enable row level security;

create policy "transactions_select_own" on public.transactions
  for select using (user_id = auth.uid());
create policy "transactions_insert_own" on public.transactions
  for insert with check (user_id = auth.uid());
create policy "transactions_update_own" on public.transactions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "transactions_delete_own" on public.transactions
  for delete using (user_id = auth.uid());

-- =========================================================
-- debts
-- taxa_juros_anual: fração decimal (ex.: 0.129 = 12,9% a.a.), convenção usada em toda a
-- engine de projeção (CP4) — taxa mensal derivada por composição, nunca anual/12.
-- data_vencimento: data prevista de quitação final (última parcela).
-- =========================================================
create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  valor_principal numeric(14, 2) not null,
  taxa_juros_anual numeric(7, 4) not null,
  valor_parcela numeric(14, 2) not null,
  saldo_devedor numeric(14, 2) not null,
  prazo_meses integer not null,
  data_vencimento date not null,
  created_at timestamptz not null default now()
);

create index debts_user_id_idx on public.debts(user_id);

alter table public.debts enable row level security;

create policy "debts_select_own" on public.debts
  for select using (user_id = auth.uid());
create policy "debts_insert_own" on public.debts
  for insert with check (user_id = auth.uid());
create policy "debts_update_own" on public.debts
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "debts_delete_own" on public.debts
  for delete using (user_id = auth.uid());
