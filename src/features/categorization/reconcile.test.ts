import { describe, expect, it } from 'vitest'
import { reconcileStatement } from './reconcile'
import type { ExtractedStatementLine } from '../receipts/types'
import type { Transaction } from '../transactions/types'

function linha(valor: number, data: string, descricao_sugerida = ''): ExtractedStatementLine {
  return { valor, data, favorecido: null, descricao_sugerida }
}

function tx(valor: number, data: string): Transaction {
  return {
    id: crypto.randomUUID(),
    user_id: 'u1',
    account_id: 'a1',
    category_id: 'c1',
    income_source_id: null,
    fixed_expense_id: null,
    valor,
    direcao: 'saida',
    data,
    origem: 'manual',
    descricao: null,
    created_at: new Date().toISOString(),
  }
}

describe('reconcileStatement', () => {
  it('casa linha com transação de mesmo valor e data e não a considera nova', () => {
    const { novas, divergentes } = reconcileStatement(
      [linha(50, '2026-07-10')],
      [tx(50, '2026-07-10')],
    )
    expect(novas).toHaveLength(0)
    expect(divergentes).toHaveLength(0)
  })

  it('linha sem transação correspondente vira nova', () => {
    const { novas, divergentes } = reconcileStatement([linha(50, '2026-07-10')], [])
    expect(novas).toHaveLength(1)
    expect(divergentes).toHaveLength(0)
  })

  it('transação registrada sem linha correspondente vira divergente', () => {
    const { novas, divergentes } = reconcileStatement([], [tx(50, '2026-07-10')])
    expect(novas).toHaveLength(0)
    expect(divergentes).toHaveLength(1)
  })

  it('trata multiplicidade: 2 linhas iguais no extrato e 1 registrada casam só 1', () => {
    const { novas, divergentes } = reconcileStatement(
      [linha(15, '2026-07-10'), linha(15, '2026-07-10')],
      [tx(15, '2026-07-10')],
    )
    expect(novas).toHaveLength(1)
    expect(divergentes).toHaveLength(0)
  })

  it('não casa valores iguais em datas diferentes', () => {
    const { novas, divergentes } = reconcileStatement(
      [linha(50, '2026-07-11')],
      [tx(50, '2026-07-10')],
    )
    expect(novas).toHaveLength(1)
    expect(divergentes).toHaveLength(1)
  })

  it('tolera diferença de centavos por arredondamento', () => {
    const { novas, divergentes } = reconcileStatement(
      [linha(50.001, '2026-07-10')],
      [tx(50, '2026-07-10')],
    )
    expect(novas).toHaveLength(0)
    expect(divergentes).toHaveLength(0)
  })
})
