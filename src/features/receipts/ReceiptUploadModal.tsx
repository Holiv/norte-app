import { useState } from 'react'
import { deleteReceipt, extractReceipt, uploadReceipt } from './api'
import type { ExtractedReceiptData } from './types'
import { createTransaction } from '../transactions/api'
import type { Category, Direction } from '../transactions/types'
import type { Account } from '../accounts/types'
import type { IncomeSource } from '../income/types'
import type { FixedExpense } from '../fixedExpenses/types'
import { rememberFavorecidoCategory, suggestCategoryForFavorecido } from '../categorization/api'
import { Badge, Button, Field, Input, Modal, Select } from '../../components/ui'

function favorecidoFor(extracted: ExtractedReceiptData | null, direcao: Direction): string | null {
  if (!extracted) return null
  return direcao === 'entrada' ? extracted.de_nome : extracted.para_nome
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  accounts: Account[]
  categories: Category[]
  incomeSources: IncomeSource[]
  fixedExpenses: FixedExpense[]
}

type Stage = 'pick' | 'processing' | 'review' | 'saving'

export function ReceiptUploadModal({
  open,
  onClose,
  onSaved,
  accounts,
  categories,
  incomeSources,
  fixedExpenses,
}: Props) {
  const [stage, setStage] = useState<Stage>('pick')
  const [error, setError] = useState<string | null>(null)
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const [extractedData, setExtractedData] = useState<ExtractedReceiptData | null>(null)

  const [direcao, setDirecaoState] = useState<Direction>('saida')
  const [valor, setValor] = useState('')
  const [data, setData] = useState('')
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [categorySuggested, setCategorySuggested] = useState(false)
  const [incomeSourceId, setIncomeSourceId] = useState('')
  const [fixedExpenseId, setFixedExpenseId] = useState('')
  const [descricao, setDescricao] = useState('')

  function reset() {
    setStage('pick')
    setError(null)
    setReceiptId(null)
    setExtractedData(null)
    setDirecaoState('saida')
    setValor('')
    setData('')
    setAccountId('')
    setCategoryId('')
    setCategorySuggested(false)
    setIncomeSourceId('')
    setFixedExpenseId('')
    setDescricao('')
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
      const receipt = await uploadReceipt(file, 'comprovante_pix')
      setReceiptId(receipt.id)
      const extracted = await extractReceipt(receipt.id)
      setExtractedData(extracted)
      setValor(extracted.valor != null ? String(extracted.valor) : '')
      setData(extracted.data ?? '')
      setDescricao(extracted.descricao_sugerida ?? '')
      setAccountId(accounts[0]?.id ?? '')
      await applyCategoryForFavorecido(extracted, 'saida')
      setStage('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStage('pick')
    }
  }

  async function applyCategoryForFavorecido(extracted: ExtractedReceiptData | null, dir: Direction) {
    const favorecido = favorecidoFor(extracted, dir)
    if (favorecido) {
      const suggested = await suggestCategoryForFavorecido(favorecido)
      if (suggested && categories.some((c) => c.id === suggested)) {
        setCategoryId(suggested)
        setCategorySuggested(true)
        return
      }
    }
    const tipo = dir === 'entrada' ? 'receita' : 'despesa'
    const firstMatch = categories.find((c) => c.tipo === tipo)
    setCategoryId(firstMatch?.id ?? '')
    setCategorySuggested(false)
  }

  function setDirecao(next: Direction) {
    setDirecaoState(next)
    setIncomeSourceId(next === 'entrada' ? (incomeSources[0]?.id ?? '') : '')
    setFixedExpenseId('')
    applyCategoryForFavorecido(extractedData, next)
  }

  async function handleSave() {
    setError(null)
    if (direcao === 'entrada' && !incomeSourceId) {
      setError('Selecione a fonte de renda dessa entrada.')
      return
    }
    setStage('saving')
    try {
      await createTransaction({
        account_id: accountId,
        category_id: categoryId,
        income_source_id: direcao === 'entrada' ? incomeSourceId : null,
        fixed_expense_id: direcao === 'saida' ? fixedExpenseId || null : null,
        valor: Number(valor),
        direcao,
        data,
        descricao: descricao || null,
      })
      const favorecido = favorecidoFor(extractedData, direcao)
      if (favorecido) {
        await rememberFavorecidoCategory(favorecido, categoryId)
      }
      onSaved()
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStage('review')
    }
  }

  const categoriesForDirection = categories.filter(
    (c) => c.tipo === (direcao === 'entrada' ? 'receita' : 'despesa'),
  )

  return (
    <Modal open={open} onClose={handleClose} title="Importar comprovante">
      {stage === 'pick' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">
            Selecione a foto ou PDF do comprovante Pix. Os dados são extraídos automaticamente
            — você confirma antes de salvar.
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
          <p>Extraindo dados do comprovante...</p>
        </div>
      )}

      {(stage === 'review' || stage === 'saving') && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDirecao('saida')}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                direcao === 'saida'
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
                direcao === 'entrada'
                  ? 'bg-primary-muted text-primary'
                  : 'bg-surface-2 text-ink-muted hover:text-ink'
              }`}
            >
              Entrada
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Valor (R$)">
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                required
              />
            </Field>
            <Field label="Data">
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
            </Field>
            <Field label="Conta">
              <Select value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Categoria"
              hint={
                categorySuggested ? (
                  <Badge tone="primary">Sugerido com base em lançamentos anteriores</Badge>
                ) : undefined
              }
            >
              <Select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value)
                  setCategorySuggested(false)
                }}
                required
              >
                {categoriesForDirection.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Select>
            </Field>

            {direcao === 'entrada' &&
              (incomeSources.length === 0 ? (
                <p className="col-span-2 text-sm text-negative">
                  Cadastre uma fonte de renda antes de lançar uma entrada.
                </p>
              ) : (
                <Field label="Fonte de renda">
                  <Select
                    value={incomeSourceId}
                    onChange={(e) => setIncomeSourceId(e.target.value)}
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

            {direcao === 'saida' && fixedExpenses.length > 0 && (
              <Field label="Conta fixa (opcional)">
                <Select
                  value={fixedExpenseId}
                  onChange={(e) => setFixedExpenseId(e.target.value)}
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

            <div className="col-span-2">
              <Field label="Descrição">
                <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
              </Field>
            </div>
          </div>

          {error && <p className="text-sm text-negative">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={handleCancelReview}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={stage === 'saving' || (direcao === 'entrada' && incomeSources.length === 0)}
            >
              {stage === 'saving' ? 'Salvando...' : 'Salvar transação'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
