// Aplica um arquivo .sql direto no Postgres do Supabase, via DATABASE_URL (.env.local).
// Uso: node scripts/db-run-sql.mjs supabase/migrations/0001_initial_schema.sql
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { Client } from 'pg'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

function loadEnvLocal() {
  const envPath = path.join(root, '.env.local')
  const content = readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (!(key in process.env)) process.env[key] = value
  }
}

const sqlFile = process.argv[2]
if (!sqlFile) {
  console.error('Uso: node scripts/db-run-sql.mjs <caminho-do-arquivo.sql>')
  process.exit(1)
}

loadEnvLocal()

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL não encontrada em .env.local')
  process.exit(1)
}

const sql = readFileSync(path.resolve(root, sqlFile), 'utf-8')

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

try {
  await client.connect()
  await client.query(sql)
  console.log(`OK: ${sqlFile} aplicado com sucesso.`)
} catch (err) {
  console.error(`ERRO ao aplicar ${sqlFile}:`, err.message)
  process.exit(1)
} finally {
  await client.end()
}
