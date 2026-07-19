import { describe, expect, it } from 'vitest'
import { calcularLivreDoMes } from './livreDoMes'

const REF = new Date('2026-07-18T12:00:00Z')

describe('calcularLivreDoMes', () => {
  it('conta só renda fixa quando não há mais nada', () => {
    const result = calcularLivreDoMes({
      incomeSources: [{ id: 'sal', tipo: 'fixa', valor_esperado: 6000 }],
      transactions: [],
      debts: [],
      fixedExpenses: [],
      reservaMinima: 0,
      referenceDate: REF,
    })
    expect(result.rendaFixa).toBe(6000)
    expect(result.rendaVariavelRecebida).toBe(0)
    expect(result.livre).toBe(6000)
  })

  it('soma renda variável recebida só quando vinculada a fonte variável, no mês corrente', () => {
    const result = calcularLivreDoMes({
      incomeSources: [{ id: 'freela', tipo: 'variavel', valor_esperado: null }],
      transactions: [
        {
          direcao: 'entrada',
          valor: 3500,
          data: '2026-07-10',
          income_source_id: 'freela',
          fixed_expense_id: null,
        },
        // fora do mês corrente, não deve contar
        {
          direcao: 'entrada',
          valor: 999,
          data: '2026-06-30',
          income_source_id: 'freela',
          fixed_expense_id: null,
        },
      ],
      debts: [],
      fixedExpenses: [],
      reservaMinima: 0,
      referenceDate: REF,
    })
    expect(result.rendaVariavelRecebida).toBe(3500)
    expect(result.livre).toBe(3500)
  })

  it('não conta 2x entrada vinculada a fonte fixa (já contada pelo valor_esperado)', () => {
    const result = calcularLivreDoMes({
      incomeSources: [{ id: 'sal', tipo: 'fixa', valor_esperado: 6000 }],
      transactions: [
        {
          direcao: 'entrada',
          valor: 6000,
          data: '2026-07-05',
          income_source_id: 'sal',
          fixed_expense_id: null,
        },
      ],
      debts: [],
      fixedExpenses: [],
      reservaMinima: 0,
      referenceDate: REF,
    })
    expect(result.rendaTotal).toBe(6000)
  })

  it('desconta dívida ativa (vencimento no futuro) e ignora dívida já quitada', () => {
    const result = calcularLivreDoMes({
      incomeSources: [],
      transactions: [],
      debts: [
        { valor_parcela: 1200, data_vencimento: '2030-01-01' }, // ativa
        { valor_parcela: 500, data_vencimento: '2020-01-01' }, // já quitada
      ],
      fixedExpenses: [],
      reservaMinima: 0,
      referenceDate: REF,
    })
    expect(result.dividasAtivas).toBe(1200)
    expect(result.livre).toBe(-1200)
  })

  it('usa valor esperado da conta fixa quando não há transação vinculada no mês', () => {
    const result = calcularLivreDoMes({
      incomeSources: [],
      transactions: [],
      debts: [],
      fixedExpenses: [{ id: 'aluguel', nome: 'Aluguel', valor_esperado: 1500 }],
      reservaMinima: 0,
      referenceDate: REF,
    })
    expect(result.contasFixas).toBe(1500)
    expect(result.detalheContasFixas[0]).toMatchObject({ esperado: 1500, real: null, usado: 1500 })
  })

  it('usa valor real da transação vinculada no lugar do esperado (reativo)', () => {
    const result = calcularLivreDoMes({
      incomeSources: [],
      transactions: [
        {
          direcao: 'saida',
          valor: 1450,
          data: '2026-07-05',
          income_source_id: null,
          fixed_expense_id: 'aluguel',
        },
      ],
      debts: [],
      fixedExpenses: [{ id: 'aluguel', nome: 'Aluguel', valor_esperado: 1500 }],
      reservaMinima: 0,
      referenceDate: REF,
    })
    expect(result.contasFixas).toBe(1450)
    expect(result.detalheContasFixas[0]).toMatchObject({ esperado: 1500, real: 1450, usado: 1450 })
  })

  it('desconta a guarda mínima', () => {
    const result = calcularLivreDoMes({
      incomeSources: [{ id: 'sal', tipo: 'fixa', valor_esperado: 6000 }],
      transactions: [],
      debts: [],
      fixedExpenses: [],
      reservaMinima: 800,
      referenceDate: REF,
    })
    expect(result.guardaMinima).toBe(800)
    expect(result.livre).toBe(5200)
  })

  it('cenário combinado completo', () => {
    const result = calcularLivreDoMes({
      incomeSources: [
        { id: 'sal', tipo: 'fixa', valor_esperado: 6000 },
        { id: 'freela', tipo: 'variavel', valor_esperado: null },
      ],
      transactions: [
        {
          direcao: 'entrada',
          valor: 3500,
          data: '2026-07-10',
          income_source_id: 'freela',
          fixed_expense_id: null,
        },
        {
          direcao: 'saida',
          valor: 1450,
          data: '2026-07-05',
          income_source_id: null,
          fixed_expense_id: 'aluguel',
        },
      ],
      debts: [{ valor_parcela: 1200, data_vencimento: '2030-01-01' }],
      fixedExpenses: [{ id: 'aluguel', nome: 'Aluguel', valor_esperado: 1500 }],
      reservaMinima: 800,
      referenceDate: REF,
    })
    // renda: 6000 + 3500 = 9500
    // - dívidas: 1200
    // - contas fixas: 1450 (real, não 1500)
    // - guarda mínima: 800
    // livre = 9500 - 1200 - 1450 - 800 = 6050
    expect(result.rendaTotal).toBe(9500)
    expect(result.livre).toBe(6050)
  })
})
