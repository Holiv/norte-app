import { useEffect, useState, type FormEvent } from 'react'
import { Landmark, Pencil, Plus, Trash2 } from 'lucide-react'
import { createAccount, deleteAccount, listAccounts, updateAccount } from './api'
import { ACCOUNT_TYPES, type Account } from './types'
import { Button, Card, Field, Input, Modal, Select } from '../../components/ui'

export function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
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

  function openCreate() {
    setEditingId(null)
    setNome('')
    setTipo(ACCOUNT_TYPES[0])
    setModalOpen(true)
  }

  function openEdit(account: Account) {
    setEditingId(account.id)
    setNome(account.nome)
    setTipo(account.tipo)
    setModalOpen(true)
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
      setModalOpen(false)
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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-ink">Contas</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus size={16} />
          Nova conta
        </Button>
      </div>

      {error && <p className="text-sm text-negative">{error}</p>}

      {loading ? (
        <p className="text-sm text-ink-muted">Carregando...</p>
      ) : accounts.length === 0 ? (
        <p className="text-sm text-ink-muted">Nenhuma conta cadastrada ainda.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {accounts.map((account) => (
            <Card key={account.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-muted text-primary">
                  <Landmark size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">{account.nome}</p>
                  <p className="text-xs text-ink-muted">{account.tipo}</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(account)}
                  className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                  aria-label="Editar"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(account.id)}
                  className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-negative"
                  aria-label="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar conta' : 'Nova conta'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Nome da conta">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus />
          </Field>
          <Field label="Tipo">
            <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {editingId ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
