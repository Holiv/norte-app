import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteReceipt, extractStatement, uploadReceipt } from './api'
import type { ExtractedStatementLine } from './types'
import { createTransaction, listTransactionsByDates } from '../transactions/api'
import { reconcileStatement } from '../categorization/reconcile'
import type { Category } from '../transactions/types'
import type { Account } from '../accounts/types'
import { rememberFavorecidoCategory, suggestCategoryForFavorecido } from '../categorization/api'
import { Badge, Button, Field, Input, Modal, Select } from '../../components/ui'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  accounts: Account[]
  categories: Category[]
}

type Stage = 'pick' | 'processing' | 'review' | 'saving'

interface ReviewRow {
  linha: ExtractedStatementLine
  categoryId: string
  suggested: boolean
}

export function StatementUploadModal({ open, onClose, onSaved, accounts, categories }: Props) {
  const [stage, setStage] = useState<Stage>('pick')
  const [error, setError] = useState<string | null>(null)
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const [accountId, setAccountId] = useState('')
  const [rows, setRows] = useState<ReviewRow[]>([])
  const [divergentesCount, setDivergentesCount] = useState(0)

  const despesaCategories = categories.filter((c) => c.tipo === 'despesa')

  function reset() {
    setStage('pick')
    setError(null)
    setReceiptId(null)
    setAccountId('')
    setRows([])
    setDivergentesCount(0)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleCancelReview() {
    if (receiptId) {
      try {
        await deleteReceipt(receiptId)
      } catch {
        // limpeza best-effort — não bloqueia o cancelamento
      }
    }
    handleClose()
  }

  async function handleFileSelected(file: File) {
    setError(null)
    setStage('processing')
    try {
      const receipt = await uploadReceipt(file, 'extrato')
      setReceiptId(receipt.id)
      const extracted = await extractStatement(receipt.id)

      const datas = [...new Set(extracted.linhas.map((l) => l.data))]
      const registradas = await listTransactionsByDates(datas)
      const { novas, divergentes } = reconcileStatement(extracted.linhas, registradas)
      setDivergentesCount(divergentes.length)

      const firstDespesa = despesaCategories[0]?.id ?? ''
      const reviewRows = await Promise.all(
        novas.map(async (linha) => {
          const suggested = linha.favorecido ? await suggestCategoryForFavorecido(linha.favorecido) : null
          const categoryId = suggested && categories.some((c) => c.id === suggested) ? suggested : firstDespesa
          return { linha, categoryId, suggested: Boolean(suggested) }
        }),
      )

      setAccountId(accounts[0]?.id ?? '')
      setRows(reviewRows)
      setStage('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStage('pick')
    }
  }

  function updateRow(index: number, patch: Partial<ReviewRow>) {
    setRows((rs) => rs.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function removeRow(index: number) {
    setRows((rs) => rs.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setError(null)
    setStage('saving')
    try {
      for (const row of rows) {
        await createTransaction({
          account_id: accountId,
          category_id: row.categoryId,
          income_source_id: null,
          fixed_expense_id: null,
          valor: row.linha.valor,
          direcao: 'saida',
          data: row.linha.data,
          descricao: row.linha.descricao_sugerida || null,
          origem: 'extrato',
          receipt_id: receiptId,
        })
        if (row.linha.favorecido) {
          await rememberFavorecidoCategory(row.linha.favorecido, row.categoryId)
        }
      }
      onSaved()
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStage('review')
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Importar extrato">
      {stage === 'pick' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">
            Selecione o PDF ou imagem do extrato. O app extrai as saídas, compara com o que já
            foi lançado nas mesmas datas e mostra só o que ainda falta confirmar.
          </p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelected(file)
            }}
            className="text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-primary-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary"
          />
          {error && <p className="text-sm text-negative">{error}</p>}
        </div>
      )}

      {stage === 'processing' && (
        <div className="flex flex-col items-center gap-2 py-8 text-sm text-ink-muted">
          <p>Extraindo transações do extrato...</p>
        </div>
      )}

      {(stage === 'review' || stage === 'saving') && (
        <div className="flex flex-col gap-4">
          {divergentesCount > 0 && (
            <div className="rounded-lg bg-warning/15 px-3 py-2 text-sm text-warning">
              {divergentesCount} transação(ões) já lançada(s) nessas datas não aparecem no
              extrato — confira se o valor ou a data estão corretos.
            </div>
          )}

          <Field label="Conta (aplica a todas as transações abaixo)">
            <Select value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </Select>
          </Field>

          {rows.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Nenhuma transação nova encontrada — tudo o que estava no extrato já foi lançado.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-ink-muted">
                {rows.length} transação(ões) nova(s) encontrada(s):
              </p>
              {rows.map((row, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-lg bg-surface-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="grid flex-1 grid-cols-2 gap-2">
                      <Field label="Valor (R$)">
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={row.linha.valor}
                          onChange={(e) =>
                            updateRow(i, {
                              linha: { ...row.linha, valor: Number(e.target.value) },
                            })
                          }
                        />
                      </Field>
                      <Field label="Data">
                        <Input
                          type="date"
                          value={row.linha.data}
                          onChange={(e) =>
                            updateRow(i, { linha: { ...row.linha, data: e.target.value } })
                          }
                        />
                      </Field>
                      <div className="col-span-2">
                        <Field label="Descrição">
                          <Input
                            value={row.linha.descricao_sugerida}
                            onChange={(e) =>
                              updateRow(i, {
                                linha: { ...row.linha, descricao_sugerida: e.target.value },
                              })
                            }
                          />
                        </Field>
                      </div>
                      <div className="col-span-2">
                        <Field
                          label="Categoria"
                          hint={row.suggested ? <Badge tone="primary">Sugerido</Badge> : undefined}
                        >
                          <Select
                            value={row.categoryId}
                            onChange={(e) =>
                              updateRow(i, { categoryId: e.target.value, suggested: false })
                            }
                          >
                            {despesaCategories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nome}
                              </option>
                            ))}
                          </Select>
                        </Field>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="mt-6 shrink-0 rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface hover:text-negative"
                      aria-label="Remover"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-negative">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={handleCancelReview}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={stage === 'saving' || rows.length === 0 || !accountId}
            >
              {stage === 'saving' ? 'Salvando...' : `Adicionar ${rows.length} transação(ões)`}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
