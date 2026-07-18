-- Categorias padrão do sistema (user_id null = visível/somente-leitura para todos os usuários).
-- Rodar como owner/postgres (SQL Editor do Supabase), que ignora RLS.
insert into public.categories (user_id, nome, tipo, is_default) values
  (null, 'Fixo', 'despesa', true),
  (null, 'Alimentação', 'despesa', true),
  (null, 'Lazer', 'despesa', true),
  (null, 'Transporte', 'despesa', true),
  (null, 'Saúde', 'despesa', true),
  (null, 'Educação', 'despesa', true),
  (null, 'Compras', 'despesa', true),
  (null, 'Assinaturas', 'despesa', true),
  (null, 'Outros', 'despesa', true),
  (null, 'Salário', 'receita', true),
  (null, 'Renda Extra', 'receita', true),
  (null, 'Outros', 'receita', true);
