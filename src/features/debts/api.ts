import { supabase } from '../../lib/supabaseClient'
import type { Debt } from './types'

export interface DebtInput {
  nome: string
  valor_principal: number
  taxa_juros_anual: number
  valor_parcela: number
  saldo_devedor: number
  prazo_meses: number
  data_vencimento: string
}

export async function listDebts(): Promise<Debt[]> {
  const { data, error } = await supabase
    .from('debts')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function createDebt(input: DebtInput): Promise<Debt> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('Usuário não autenticado')

  const { data, error } = await supabase
    .from('debts')
    .insert({ ...input, user_id: userData.user.id })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateDebt(id: string, input: DebtInput): Promise<Debt> {
  const { data, error } = await supabase
    .from('debts')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteDebt(id: string): Promise<void> {
  const { error } = await supabase.from('debts').delete().eq('id', id)
  if (error) throw error
}
