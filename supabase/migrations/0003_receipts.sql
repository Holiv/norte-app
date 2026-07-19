-- Fase 2 (commit 1): tabela receipts + vínculo com transactions.arquivo já
-- reservado desde o commit 3 da Fase 1 (transactions.receipt_id).

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  arquivo text not null, -- caminho no bucket "comprovantes": {user_id}/{arquivo}
  tipo text not null check (tipo in ('comprovante_pix', 'extrato')),
  status text not null default 'processando' check (status in ('processando', 'concluido', 'erro')),
  dados_extraidos jsonb,
  erro_mensagem text,
  created_at timestamptz not null default now()
);

create index receipts_user_id_idx on public.receipts(user_id);

alter table public.receipts enable row level security;

create policy "receipts_select_own" on public.receipts
  for select using (user_id = auth.uid());
create policy "receipts_insert_own" on public.receipts
  for insert with check (user_id = auth.uid());
create policy "receipts_update_own" on public.receipts
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "receipts_delete_own" on public.receipts
  for delete using (user_id = auth.uid());

alter table public.transactions
  add constraint transactions_receipt_id_fkey
  foreign key (receipt_id) references public.receipts(id) on delete set null;

create index transactions_receipt_id_idx on public.transactions(receipt_id);

-- =========================================================
-- Bucket de Storage "comprovantes" — arquivos em {user_id}/{arquivo},
-- RLS isolando por pasta (primeiro segmento do path = user_id).
-- =========================================================
insert into storage.buckets (id, name, public)
values ('comprovantes', 'comprovantes', false)
on conflict (id) do nothing;

create policy "comprovantes_select_own" on storage.objects
  for select using (
    bucket_id = 'comprovantes' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "comprovantes_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'comprovantes' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "comprovantes_delete_own" on storage.objects
  for delete using (
    bucket_id = 'comprovantes' and (storage.foldername(name))[1] = auth.uid()::text
  );
