import type { ExtractedStatementLine } from '../receipts/types'
import type { Transaction } from '../transactions/types'

export interface ReconciliationResult {
  novas: ExtractedStatementLine[]
  divergentes: Transaction[]
}

const CENTAVO = 0.005

/**
 * Casa cada linha do extrato com uma transação de saída já registrada na
 * mesma data e valor. Trata multiplicidade: cada transação registrada só
 * pode "consumir" uma linha do extrato (2 linhas de R$15 no extrato e 1
 * registrada casam só 1, a outra vira "nova").
 */
export function reconcileStatement(
  linhas: ExtractedStatementLine[],
  registradas: Transaction[],
): ReconciliationResult {
  const usadas = new Set<number>()
  const novas: ExtractedStatementLine[] = []

  for (const linha of linhas) {
    const idx = registradas.findIndex(
      (t, i) => !usadas.has(i) && t.data === linha.data && Math.abs(t.valor - linha.valor) < CENTAVO,
    )
    if (idx === -1) {
      novas.push(linha)
    } else {
      usadas.add(idx)
    }
  }

  const divergentes = registradas.filter((_, i) => !usadas.has(i))
  return { novas, divergentes }
}
