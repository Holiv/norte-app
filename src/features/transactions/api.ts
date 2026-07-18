import { supabase } from '../../lib/supabaseClient'
import type { Category, Direction, Transaction } from './types'

export interface TransactionInput {
  account_id: string
  category_id: string
  income_source_id: string | null
  valor: number
  direcao: Direction
  data: string
  descricao: string | null
}

export async function listTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, accounts(nome), categories(nome), income_sources(nome)')
    .order('data', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createTransaction(input: TransactionInput): Promise<Transaction> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('Usuário não autenticado')

  const { data, error } = await supabase
    .from('transactions')
    .insert({ ...input, origem: 'manual', user_id: userData.user.id })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTransaction(
  id: string,
  input: TransactionInput,
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error
}

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*').order('nome')
  if (error) throw error
  return data
}
