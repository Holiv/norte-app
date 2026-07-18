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

## Estrutura

```
api/              Vercel Functions (Node.js) — só endpoints que exigem segredo
src/lib/calc/     Motores de cálculo puros (orçamento, projeção) — sem UI
src/features/     Uma pasta por área de produto (accounts, income, debts, transactions, dashboard)
supabase/         Migrations SQL (schema + RLS) e seed de categorias
```
