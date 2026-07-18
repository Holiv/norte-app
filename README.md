# App Financeiro

App de controle financeiro pessoal com módulo de investimentos embutido.
Arquitetura completa (escopo, modelo de dados, motores de cálculo, roadmap)
está em [`arquitetura-app-financas.md`](./arquitetura-app-financas.md).
Regras de trabalho da sessão estão em [`CLAUDE.md`](./CLAUDE.md).

## Stack

- Frontend: React (Vite) + TypeScript, PWA instalável
- Dados/Auth: Supabase (Postgres + Auth + Storage), com RLS por `user_id`
- Backend: Vercel Serverless Functions (`api/`) — usadas só onde há segredo (OCR, APIs externas)
- Deploy: Vercel (free tier)

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencher com as chaves do projeto Supabase
npm run dev
```

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção
- `npm run test` — testes (Vitest)
- `npm run lint` — lint (Oxlint)
- `npm run db:run -- <arquivo.sql>` — aplica um arquivo SQL direto no Postgres do
  Supabase (precisa de `DATABASE_URL` no `.env.local`, veja `.env.example`)

## Estrutura

```
api/              Vercel Functions (Node.js) — só endpoints que exigem segredo
scripts/          Scripts utilitários (ex.: aplicar migrations SQL)
src/lib/calc/     Motores de cálculo puros (orçamento, projeção) — sem UI
src/features/     Uma pasta por área de produto (accounts, income, debts, transactions, dashboard)
supabase/         Migrations SQL (schema + RLS) e seed de categorias
```

## Migrations

Cada mudança de schema vira um arquivo novo em `supabase/migrations/`
(numeração sequencial, ex.: `0002_...sql`). Aplique com:

```bash
npm run db:run -- supabase/migrations/000X_nome.sql
```
