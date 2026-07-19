-- Fase 2 (commit 3): aprendizado de categorização por favorecido.
-- Toda vez que o usuário confirma/corrige a categoria de uma transação
-- vinda de comprovante (favorecido = para_nome/de_nome extraído), essa
-- tabela guarda o mapeamento pra sugerir automaticamente da próxima vez.

create table public.payee_category_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  favorecido_normalizado text not null,
  category_id uuid not null references public.categories(id) on delete cascade,
  updated_at timestamptz not null default now(),
  unique (user_id, favorecido_normalizado)
);

create index payee_category_memory_user_id_idx on public.payee_category_memory(user_id);

alter table public.payee_category_memory enable row level security;

create policy "payee_category_memory_select_own" on public.payee_category_memory
  for select using (user_id = auth.uid());
create policy "payee_category_memory_insert_own" on public.payee_category_memory
  for insert with check (user_id = auth.uid());
create policy "payee_category_memory_update_own" on public.payee_category_memory
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "payee_category_memory_delete_own" on public.payee_category_memory
  for delete using (user_id = auth.uid());
