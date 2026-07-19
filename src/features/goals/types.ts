export type GoalModo = 'prazo' | 'aporte'
export type GoalContributionTipo = 'fixo' | 'extra'

export interface Goal {
  id: string
  user_id: string
  nome: string
  valor_alvo: number
  modo: GoalModo
  prazo_meses: number | null
  aporte_mensal: number | null
  taxa_retorno_anual: number
  created_at: string
}

export interface GoalContribution {
  id: string
  user_id: string
  goal_id: string
  data: string
  valor: number
  tipo: GoalContributionTipo
  created_at: string
}
