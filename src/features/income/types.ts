export type IncomeType = 'fixa' | 'variavel'

export interface IncomeSource {
  id: string
  user_id: string
  nome: string
  tipo: IncomeType
  periodicidade: string | null
  valor_esperado: number | null
  created_at: string
}

export const PERIODICIDADE_OPTIONS = [
  'Mensal',
  'Quinzenal',
  'Semanal',
  'Anual',
  'Irregular',
] as const
