import { useEffect, useState, type FormEvent } from 'react'
import { createAccount, deleteAccount, listAccounts, updateAccount } from './api'
import { ACCOUNT_TYPES, type Account } from './types'

export function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<string>(ACCOUNT_TYPES[0])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    refresh()
  }, [])

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      setAccounts(await listAccounts())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  function startEdit(account: Account) {
    setEditingId(account.id)
    setNome(account.nome)
    setTipo(account.tipo)
  }

  function cancelEdit() {
    setEditingId(null)
    setNome('')
    setTipo(ACCOUNT_TYPES[0])
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (editingId) {
        await updateAccount(editingId, { nome, tipo })
      } else {
        await createAccount({ nome, tipo })
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
      await deleteAccount(id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <section className="accounts-page">
      <h2>Contas</h2>

      <form onSubmit={handleSubmit} className="inline-form">
        <input
          type="text"
          placeholder="Nome da conta"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {ACCOUNT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button type="submit" disabled={submitting}>
          {editingId ? 'Salvar' : 'Adicionar'}
        </button>
        {editingId && (
          <button type="button" onClick={cancelEdit}>
            Cancelar
          </button>
        )}
      </form>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <p>Carregando...</p>
      ) : accounts.length === 0 ? (
        <p>Nenhuma conta cadastrada ainda.</p>
      ) : (
        <ul className="item-list">
          {accounts.map((account) => (
            <li key={account.id}>
              <span>
                {account.nome} <em>({account.tipo})</em>
              </span>
              <span className="item-actions">
                <button type="button" onClick={() => startEdit(account)}>
                  Editar
                </button>
                <button type="button" onClick={() => handleDelete(account.id)}>
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
