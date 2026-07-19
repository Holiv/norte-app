import { describe, expect, it } from 'vitest'
import { calcularSugestaoDeGastos } from './spendingSuggestion'

const REF = new Date('2026-07-18T12:00:00Z')
const CATEGORIES = [
  { id: 'alimentacao', nome: 'Alimentação' },
  { id: 'lazer', nome: 'Lazer' },
]

describe('calcularSugestaoDeGastos', () => {
  it('sem histórico, não sugere nada', () => {
    const result = calcularSugestaoDeGastos({
      transactions: [],
      categories: CATEGORIES,
      livreDoMes: 1000,
      referenceDate: REF,
    })
    expect(result.categorias).toHaveLength(0)
  })

  it('sem livre do mês, não sugere nada mesmo com histórico', () => {
    const result = calcularSugestaoDeGastos({
      transactions: [
        { categoryId: 'alimentacao', valor: 900, data: '2026-06-10', fixedExpenseId: null },
      ],
      categories: CATEGORIES,
      livreDoMes: 0,
      referenceDate: REF,
    })
    expect(result.categorias).toHaveLength(0)
  })

  it('ignora transações vinculadas a conta fixa', () => {
    const result = calcularSugestaoDeGastos({
      transactions: [
        { categoryId: 'alimentacao', valor: 900, data: '2026-06-10', fixedExpenseId: 'aluguel' },
      ],
      categories: CATEGORIES,
      livreDoMes: 1000,
      referenceDate: REF,
    })
    expect(result.categorias).toHaveLength(0)
  })

  it('ignora transações fora da janela de meses', () => {
    const result = calcularSugestaoDeGastos({
      transactions: [
        { categoryId: 'alimentacao', valor: 900, data: '2026-01-10', fixedExpenseId: null },
      ],
      categories: CATEGORIES,
      livreDoMes: 1000,
      monthsWindow: 3,
      referenceDate: REF,
    })
    expect(result.categorias).toHaveLength(0)
  })

  it('distribui o livre do mês proporcionalmente à média histórica de cada categoria', () => {
    const result = calcularSugestaoDeGastos({
      transactions: [
        // alimentação: 900 em 3 meses -> média 300
        { categoryId: 'alimentacao', valor: 300, data: '2026-04-05', fixedExpenseId: null },
        { categoryId: 'alimentacao', valor: 300, data: '2026-05-05', fixedExpenseId: null },
        { categoryId: 'alimentacao', valor: 300, data: '2026-06-05', fixedExpenseId: null },
        // lazer: 300 em 3 meses -> média 100
        { categoryId: 'lazer', valor: 300, data: '2026-06-15', fixedExpenseId: null },
      ],
      categories: CATEGORIES,
      livreDoMes: 800,
      monthsWindow: 3,
      referenceDate: REF,
    })
    // proporção: alimentação 300/(300+100)=75%, lazer 100/400=25%
    const alimentacao = result.categorias.find((c) => c.categoryId === 'alimentacao')
    const lazer = result.categorias.find((c) => c.categoryId === 'lazer')
    expect(alimentacao?.sugestao).toBeCloseTo(600, 2)
    expect(lazer?.sugestao).toBeCloseTo(200, 2)
  })

  it('ordena categorias por sugestão decrescente', () => {
    const result = calcularSugestaoDeGastos({
      transactions: [
        { categoryId: 'lazer', valor: 900, data: '2026-06-05', fixedExpenseId: null },
        { categoryId: 'alimentacao', valor: 300, data: '2026-06-05', fixedExpenseId: null },
      ],
      categories: CATEGORIES,
      livreDoMes: 1000,
      referenceDate: REF,
    })
    expect(result.categorias[0].categoryId).toBe('lazer')
    expect(result.categorias[1].categoryId).toBe('alimentacao')
  })
})
