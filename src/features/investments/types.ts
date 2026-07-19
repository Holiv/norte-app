export type InvestmentTipo = 'previdencia' | 'bruto'
export type InvestmentContributionTipo = 'proprio' | 'contrapartida_empresa'

export interface Investment {
  id: string
  user_id: string
  nome: string
  tipo: InvestmentTipo
  salario_bruto_mensal: number | null
  percentual_proprio: number | null // fração decimal (0.08 = 8%)
  percentual_match: number | null // fração decimal sobre o aporte próprio (1.0 = 100%)
  teto_match_mensal: number | null
  aporte_mensal_planejado: number | null
  taxa_retorno_anual: number
  created_at: string
}

export interface InvestmentContribution {
  id: string
  user_id: string
  investment_id: string
  data: string
  valor: number
  tipo: InvestmentContributionTipo
  created_at: string
}
