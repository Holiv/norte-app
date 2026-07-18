import { supabase } from '../../lib/supabaseClient'
import type { IncomeSource, IncomeType } from './types'

export interface IncomeSourceInput {
  nome: string
  tipo: IncomeType
  periodicidade: string | null
  valor_esperado: number | null
}

export async function listIncomeSources(): Promise<IncomeSource[]> {
  const { data, error } = await supabase
    .from('income_sources')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function createIncomeSource(input: IncomeSourceInput): Promise<IncomeSource> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('Usuário não autenticado')

  const { data, error } = await supabase
    .from('income_sources')
    .insert({ ...input, user_id: userData.user.id })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateIncomeSource(
  id: string,
  input: IncomeSourceInput,
): Promise<IncomeSource> {
  const { data, error } = await supabase
    .from('income_sources')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteIncomeSource(id: string): Promise<void> {
  const { error } = await supabase.from('income_sources').delete().eq('id', id)
  if (error) throw error
}
