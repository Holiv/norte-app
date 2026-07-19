import { describe, expect, it } from 'vitest'
import { calcularReprojecaoMeta } from './metaReprojection'

describe('calcularReprojecaoMeta', () => {
  it('modo prazo: calcula aporte necessário sem nada acumulado ainda', () => {
    const result = calcularReprojecaoMeta({
      valorAlvo: 12000,
      taxaRetornoAnual: 0,
      valorAcumulado: 0,
      modo: 'prazo',
      prazoMeses: 12,
    })
    expect(result.aporteNecessario).toBeCloseTo(1000, 2)
  })

  it('modo prazo: com retorno, aporte necessário é menor que a divisão linear', () => {
    const semJuros = calcularReprojecaoMeta({
      valorAlvo: 12000,
      taxaRetornoAnual: 0,
      valorAcumulado: 0,
      modo: 'prazo',
      prazoMeses: 12,
    })
    const comJuros = calcularReprojecaoMeta({
      valorAlvo: 12000,
      taxaRetornoAnual: 0.06,
      valorAcumulado: 0,
      modo: 'prazo',
      prazoMeses: 12,
    })
    expect(comJuros.aporteNecessario!).toBeLessThan(semJuros.aporteNecessario!)
  })

  it('modo prazo: valor já acumulado reduz o aporte necessário', () => {
    const result = calcularReprojecaoMeta({
      valorAlvo: 12000,
      taxaRetornoAnual: 0,
      valorAcumulado: 6000,
      modo: 'prazo',
      prazoMeses: 12,
    })
    expect(result.aporteNecessario).toBeCloseTo(500, 2)
  })

  it('modo aporte: sem juros, prazo é divisão linear do que falta', () => {
    const result = calcularReprojecaoMeta({
      valorAlvo: 12000,
      taxaRetornoAnual: 0,
      valorAcumulado: 0,
      modo: 'aporte',
      aporteMensal: 1000,
    })
    expect(result.prazoNecessarioMeses).toBeCloseTo(12, 2)
  })

  it('modo aporte: com retorno, prazo necessário é menor que a divisão linear', () => {
    const result = calcularReprojecaoMeta({
      valorAlvo: 12000,
      taxaRetornoAnual: 0.06,
      valorAcumulado: 0,
      modo: 'aporte',
      aporteMensal: 1000,
    })
    expect(result.prazoNecessarioMeses!).toBeLessThan(12)
    expect(result.prazoNecessarioMeses!).toBeGreaterThan(11)
  })

  it('modo aporte: lump sum extra (valorAcumulado maior) antecipa o prazo sem mudar o aporte', () => {
    const semExtra = calcularReprojecaoMeta({
      valorAlvo: 12000,
      taxaRetornoAnual: 0.06,
      valorAcumulado: 2000,
      modo: 'aporte',
      aporteMensal: 1000,
    })
    const comExtra = calcularReprojecaoMeta({
      valorAlvo: 12000,
      taxaRetornoAnual: 0.06,
      valorAcumulado: 5000, // 2000 fixo + 3000 de lump sum
      modo: 'aporte',
      aporteMensal: 1000, // ritmo continua o mesmo, não é acelerado pela sobra
    })
    expect(comExtra.prazoNecessarioMeses!).toBeLessThan(semExtra.prazoNecessarioMeses!)
  })

  it('modo aporte: meta já batida retorna prazo zero', () => {
    const result = calcularReprojecaoMeta({
      valorAlvo: 5000,
      taxaRetornoAnual: 0.05,
      valorAcumulado: 6000,
      modo: 'aporte',
      aporteMensal: 100,
    })
    expect(result.prazoNecessarioMeses).toBe(0)
  })
})
