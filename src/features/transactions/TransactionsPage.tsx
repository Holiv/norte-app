import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Pencil, Trash2, Upload } from 'lucide-react'
import { listAccounts } from '../accounts/api'
import type { Account } from '../accounts/types'
import { listIncomeSources } from '../income/api'
import type { IncomeSource } from '../income/types'
import { listFixedExpenses } from '../fixedExpenses/api'
import type { FixedExpense } from '../fixedExpenses/types'
import { ReceiptUploadModal } from '../receipts/ReceiptUploadModal'
import {
  createTransaction,
  deleteTransaction,
  listCategories,
  listTransactions,
  updateTransaction,
} from './api'
import type { Category, Direction, Transaction } from './types'
import { Button, Card, Field, Input, Select } from '../../components/ui'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

interface FormState {
  direcao: Direction
  valor: string
  data: string
  accountId: string
  categoryId: string
  incomeSourceId: string
  fixedExpenseId: string
  descricao: string
}

function emptyForm(defaults: { accountId: string; categoryId: string }): FormState {
  return {
    direcao: 'saida',
    valor: '',
    data: today(),
    accountId: defaults.accountId,
    categoryId: defaults.categoryId,
    incomeSourceId: '',
    fixedExpenseId: '',
    descricao: '',
  }
}

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([])
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm({ accountId: '', categoryId: '' }))
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    refresh()
  }, [])

  const categoriesForDirection = useMemo(() => {
    const tipo = form.direcao === 'entrada' ? 'receita' : 'despesa'
    return categories.filter((c) => c.tipo === tipo)
  }, [categories, form.direcao])

  async function refresh() {
    setError(null)
    try {
      const [tx, acc, cat, inc, fixed] = await Promise.all([
        listTransactions(),
        listAccounts(),
        listCategories(),
        listIncomeSources(),
        listFixedExpenses(),
      ])
      setTransactions(tx)
      setAccounts(acc)
      setCategories(cat)
      setIncomeSources(inc)
      setFixedExpenses(fixed)
      setForm((f) =>
        f.accountId || f.categoryId
          ? f
          : emptyForm({
              accountId: acc[0]?.id ?? '',
              categoryId: cat.find((c) => c.tipo === 'despesa')?.id ?? '',
            }),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  function setDirecao(direcao: Direction) {
    const tipo = direcao === 'entrada' ? 'receita' : 'despesa'
    const firstMatch = categories.find((c) => c.tipo === tipo)
    setForm((f) => ({
      ...f,
      direcao,
      categoryId: firstMatch?.id ?? '',
      incomeSourceId: direcao === 'entrada' ? (incomeSources[0]?.id ?? '') : '',
      fixedExpenseId: direcao === 'saida' ? f.fixedExpenseId : '',
    }))
  }

  function startEdit(tx: Transaction) {
    setEditingId(tx.id)
    setForm({
      direcao: tx.direcao,
      valor: String(tx.valor),
      data: tx.data,
      accountId: tx.account_id,
      categoryId: tx.category_id,
      incomeSourceId: tx.income_source_id ?? '',
      fixedExpenseId: tx.fixed_expense_id ?? '',
      descricao: tx.descricao ?? '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(
      emptyForm({
        accountId: accounts[0]?.id ?? '',
        categoryId: categories.find((c) => c.tipo === 'despesa')?.id ?? '',
      }),
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (form.direcao === 'entrada' && !form.incomeSourceId) {
      setError('Selecione a fonte de renda dessa entrada.')
      return
    }

    setSubmitting(true)
    try {
      const input = {
        account_id: form.accountId,
        category_id: form.categoryId,
        income_source_id: form.direcao === 'entrada' ? form.incomeSourceId : null,
        fixed_expense_id: form.direcao === 'saida' ? form.fixedExpenseId || null : null,
        valor: Number(form.valor),
        direcao: form.direcao,
        data: form.data,
        descricao: form.descricao || null,
      }
      if (editingId) {
        await updateTransaction(editingId, input)
      } else {
        await createTransaction(input)
      }
      cancelEdit()
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    setError(null)
    try {
      await deleteTransaction(id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-xl font-semibold text-ink">Transações</h2>
        <p className="text-sm text-ink-muted">Carregando...</p>
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-xl font-semibold text-ink">Transações</h2>
        <p className="text-sm text-ink-muted">
          Cadastre pelo menos uma conta (aba "Contas") antes de registrar transações.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-ink">Transações</h2>
        <Button variant="secondary" size="sm" onClick={() => setReceiptModalOpen(true)}>
          <Upload size={16} />
          Importar comprovante
        </Button>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDirecao('saida')}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                form.direcao === 'saida'
                  ? 'bg-negative-muted text-negative'
                  : 'bg-surface-2 text-ink-muted hover:text-ink'
              }`}
            >
              Saída
            </button>
            <button
              type="button"
              onClick={() => setDirecao('entrada')}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                form.direcao === 'entrada'
                  ? 'bg-primary-muted text-primary'
                  : 'bg-surface-2 text-ink-muted hover:text-ink'
              }`}
            >
              Entrada
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Valor (R$)">
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.valor}
                onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                required
              />
            </Field>

            <Field label="Data">
              <Input
                type="date"
                value={form.data}
                onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                required
              />
            </Field>

            <Field label="Conta">
              <Select
                value={form.accountId}
                onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
                required
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Categoria">
              <Select
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                required
              >
                {categoriesForDirection.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Select>
            </Field>

            {form.direcao === 'entrada' &&
              (incomeSources.length === 0 ? (
                <p className="text-sm text-negative sm:col-span-2">
                  Cadastre uma fonte de renda (aba "Rendas") antes de lançar uma entrada.
                </p>
              ) : (
                <Field label="Fonte de renda">
                  <Select
                    value={form.incomeSourceId}
                    onChange={(e) => setForm((f) => ({ ...f, incomeSourceId: e.target.value }))}
                    required
                  >
                    {incomeSources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                  </Select>
                </Field>
              ))}

            {form.direcao === 'saida' && fixedExpenses.length > 0 && (
              <Field label="Conta fixa vinculada (opcional)">
                <Select
                  value={form.fixedExpenseId}
                  onChange={(e) => setForm((f) => ({ ...f, fixedExpenseId: e.target.value }))}
                >
                  <option value="">Nenhuma</option>
                  {fixedExpenses.map((fe) => (
                    <option key={fe.id} value={fe.id}>
                      {fe.nome}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            <Field label="Descrição (opcional)">
              <Input
                type="text"
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              />
            </Field>
          </div>

          {error && <p className="text-sm text-negative">{error}</p>}

          <div className="flex justify-end gap-2">
            {editingId && (
              <Button type="button" variant="secondary" onClick={cancelEdit}>
                Cancelar
              </Button>
            )}
            <Button
              type="submit"
              disabled={submitting || (form.direcao === 'entrada' && incomeSources.length === 0)}
            >
              {editingId ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </Card>

      {transactions.length === 0 ? (
        <p className="text-sm text-ink-muted">Nenhuma transação registrada ainda.</p>
      ) : (
        <Card padding={false} className="divide-y divide-border overflow-hidden">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p
                  className={`text-sm font-semibold ${
                    tx.direcao === 'entrada' ? 'text-primary' : 'text-negative'
                  }`}
                >
                  {tx.direcao === 'entrada' ? '+' : '−'} R$ {tx.valor.toFixed(2)}
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {tx.data} · {tx.categories?.nome} · {tx.accounts?.nome}
                  {tx.income_sources?.nome ? ` · ${tx.income_sources.nome}` : ''}
                  {tx.fixed_expenses?.nome ? ` · ${tx.fixed_expenses.nome}` : ''}
                  {tx.descricao ? ` · ${tx.descricao}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(tx)}
                  className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                  aria-label="Editar"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(tx.id)}
                  className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-negative"
                  aria-label="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <ReceiptUploadModal
        open={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        onSaved={refresh}
        accounts={accounts}
        categories={categories}
        incomeSources={incomeSources}
        fixedExpenses={fixedExpenses}
      />
    </div>
  )
}
