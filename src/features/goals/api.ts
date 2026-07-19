import { supabase } from '../../lib/supabaseClient'
import type { Goal, GoalContribution, GoalContributionTipo, GoalModo } from './types'

export interface GoalInput {
  nome: string
  valor_alvo: number
  modo: GoalModo
  prazo_meses: number | null
  aporte_mensal: number | null
  taxa_retorno_anual: number
}

export async function listGoals(): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function createGoal(input: GoalInput): Promise<Goal> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('Usuário não autenticado')

  const { data, error } = await supabase
    .from('goals')
    .insert({ ...input, user_id: userData.user.id })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateGoal(id: string, input: GoalInput): Promise<Goal> {
  const { data, error } = await supabase.from('goals').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from('goals').delete().eq('id', id)
  if (error) throw error
}

export async function listAllGoalContributions(): Promise<GoalContribution[]> {
  const { data, error } = await supabase
    .from('goal_contributions')
    .select('*')
    .order('data', { ascending: false })

  if (error) throw error
  return data
}

export async function createGoalContribution(input: {
  goal_id: string
  data: string
  valor: number
  tipo: GoalContributionTipo
}): Promise<GoalContribution> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('Usuário não autenticado')

  const { data, error } = await supabase
    .from('goal_contributions')
    .insert({ ...input, user_id: userData.user.id })
    .select()
    .single()

  if (error) throw error
  return data
}
