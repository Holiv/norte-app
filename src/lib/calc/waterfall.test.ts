import { describe, expect, it } from 'vitest'
import { calcularWaterfall } from './waterfall'

describe('calcularWaterfall', () => {
  it('sem livre do mês, não sugere nada', () => {
    const result = calcularWaterfall({
      livreDoMes: 0,
      taxaRetornoInvestimentoBruto: 0.1,
      dividas: [{ id: 'd1', nome: 'Cartão', taxaJurosAnual: 0.5, saldoDevedor: 1000 }],
    })
    expect(result.quitacaoExtraSugerida).toHaveLength(0)
    expect(result.investimentoBrutoSugerido).toBe(0)
  })

  it('sem dívidas caras nem investimento bruto configurado, tudo fica não alocado', () => {
    const result = calcularWaterfall({
      livreDoMes: 1000,
      taxaRetornoInvestimentoBruto: null,
      dividas: [],
    })
    expect(result.restanteNaoAlocado).toBe(1000)
    expect(result.investimentoBrutoSugerido).toBe(0)
  })

  it('sem dívida cara o suficiente, tudo sugerido pro investimento bruto', () => {
    const result = calcularWaterfall({
      livreDoMes: 1000,
      taxaRetornoInvestimentoBruto: 0.1,
      dividas: [{ id: 'd1', nome: 'Financiamento', taxaJurosAnual: 0.05, saldoDevedor: 5000 }],
    })
    expect(result.quitacaoExtraSugerida).toHaveLength(0)
    expect(result.investimentoBrutoSugerido).toBe(1000)
  })

  it('quita dívida cara rankeada por taxa antes de sobrar pro investimento', () => {
    const result = calcularWaterfall({
      livreDoMes: 1000,
      taxaRetornoInvestimentoBruto: 0.1,
      dividas: [
        { id: 'cartao', nome: 'Cartão', taxaJurosAnual: 0.5, saldoDevedor: 300 },
        { id: 'cheque', nome: 'Cheque especial', taxaJurosAnual: 0.3, saldoDevedor: 400 },
        { id: 'financiamento', nome: 'Financiamento', taxaJurosAnual: 0.05, saldoDevedor: 5000 },
      ],
    })
    expect(result.quitacaoExtraSugerida).toEqual([
      { id: 'cartao', nome: 'Cartão', taxaJurosAnual: 0.5, valorSugerido: 300 },
      { id: 'cheque', nome: 'Cheque especial', taxaJurosAnual: 0.3, valorSugerido: 400 },
    ])
    // financiamento fica de fora (taxa abaixo do investimento bruto)
    expect(result.investimentoBrutoSugerido).toBe(300)
  })

  it('quando a sobra acaba no meio das dívidas caras, não sugere a próxima', () => {
    const result = calcularWaterfall({
      livreDoMes: 200,
      taxaRetornoInvestimentoBruto: 0.1,
      dividas: [
        { id: 'cartao', nome: 'Cartão', taxaJurosAnual: 0.5, saldoDevedor: 300 },
        { id: 'cheque', nome: 'Cheque especial', taxaJurosAnual: 0.3, saldoDevedor: 400 },
      ],
    })
    expect(result.quitacaoExtraSugerida).toEqual([
      { id: 'cartao', nome: 'Cartão', taxaJurosAnual: 0.5, valorSugerido: 200 },
    ])
    expect(result.investimentoBrutoSugerido).toBe(0)
  })
})
