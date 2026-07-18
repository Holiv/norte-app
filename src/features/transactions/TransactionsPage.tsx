import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { listAccounts } from '../accounts/api'
import type { Account } from '../accounts/types'
import { listIncomeSources } from '../income/api'
import type { IncomeSource } from '../income/types'
import { listFixedExpenses } from '../fixedExpenses/api'
import type { FixedExpense } from '../fixedExpenses/types'
import {
  createTransaction,
  deleteTransaction,
  listCategories,
  listTransactions,
  updateTransaction,
} from './api'
import type { Category, Direction, Transaction } from './types'

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
      <section className="transactions-page">
        <h2>Transações</h2>
        <p>Carregando...</p>
      </section>
    )
  }

  if (accounts.length === 0) {
    return (
      <section className="transactions-page">
        <h2>Transações</h2>
        <p>Cadastre pelo menos uma conta (aba "Contas") antes de registrar transações.</p>
      </section>
    )
  }

  return (
    <section className="transactions-page">
      <h2>Transações</h2>

      <form onSubmit={handleSubmit} className="tx-form">
        <div className="tx-form-direction">
          <button
            type="button"
            className={form.direcao === 'saida' ? 'tab active' : 'tab'}
            onClick={() => setDirecao('saida')}
          >
            Saída
          </button>
          <button
            type="button"
            className={form.direcao === 'entrada' ? 'tab active' : 'tab'}
            onClick={() => setDirecao('entrada')}
          >
            Entrada
          </button>
        </div>

        <div className="tx-form-grid">
          <label>
            Valor (R$)
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.valor}
              onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
              required
            />
          </label>

          <label>
            Data
            <input
              type="date"
              value={form.data}
              onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
              required
            />
          </label>

          <label>
            Conta
            <select
              value={form.accountId}
              onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
              required
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </label>

          <label>
            Categoria
            <select
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              required
            >
              {categoriesForDirection.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>

          {form.direcao === 'entrada' &&
            (incomeSources.length === 0 ? (
              <p className="form-error">
                Cadastre uma fonte de renda (aba "Rendas") antes de lançar uma entrada.
              </p>
            ) : (
              <label>
                Fonte de renda
                <select
                  value={form.incomeSourceId}
                  onChange={(e) => setForm((f) => ({ ...f, incomeSourceId: e.target.value }))}
                  required
                >
                  {incomeSources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </label>
            ))}

          {form.direcao === 'saida' && fixedExpenses.length > 0 && (
            <label>
              Conta fixa vinculada (opcional)
              <select
                value={form.fixedExpenseId}
                onChange={(e) => setForm((f) => ({ ...f, fixedExpenseId: e.target.value }))}
              >
                <option value="">Nenhuma</option>
                {fixedExpenses.map((fe) => (
                  <option key={fe.id} value={fe.id}>
                    {fe.nome}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            Descrição (opcional)
            <input
              type="text"
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
            />
          </label>
        </div>

        <div className="debt-form-actions">
          <button
            type="submit"
            disabled={submitting || (form.direcao === 'entrada' && incomeSources.length === 0)}
          >
            {editingId ? 'Salvar' : 'Adicionar'}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      {error && <p className="form-error">{error}</p>}

      {transactions.length === 0 ? (
        <p>Nenhuma transação registrada ainda.</p>
      ) : (
        <ul className="item-list">
          {transactions.map((tx) => (
            <li key={tx.id}>
              <span>
                <strong className={tx.direcao === 'entrada' ? 'tx-entrada' : 'tx-saida'}>
                  {tx.direcao === 'entrada' ? '+' : '-'}R$ {tx.valor.toFixed(2)}
                </strong>{' '}
                <em>
                  {tx.data} · {tx.categories?.nome} · {tx.accounts?.nome}
                  {tx.income_sources?.nome ? ` · ${tx.income_sources.nome}` : ''}
                  {tx.fixed_expenses?.nome ? ` · ${tx.fixed_expenses.nome}` : ''}
                  {tx.descricao ? ` · ${tx.descricao}` : ''}
                </em>
              </span>
              <span className="item-actions">
                <button type="button" onClick={() => startEdit(tx)}>
                  Editar
                </button>
                <button type="button" onClick={() => handleDelete(tx.id)}>
                  Excluir
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
