import { supabase } from '../../lib/supabaseClient'
import type { Category, Direction, Origem, Transaction } from './types'

export interface TransactionInput {
  account_id: string
  category_id: string
  income_source_id: string | null
  fixed_expense_id: string | null
  valor: number
  direcao: Direction
  data: string
  descricao: string | null
  origem?: Origem
  receipt_id?: string | null
}

export async function listTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, accounts(nome), categories(nome), income_sources(nome), fixed_expenses(nome)')
    .order('data', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function listTransactionsByDates(dates: string[]): Promise<Transaction[]> {
  if (dates.length === 0) return []
  const { data, error } = await supabase
    .from('transactions')
    .select('*, accounts(nome), categories(nome), income_sources(nome), fixed_expenses(nome)')
    .in('data', dates)
    .eq('direcao', 'saida')

  if (error) throw error
  return data
}

export async function createTransaction(input: TransactionInput): Promise<Transaction> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('Usuário não autenticado')

  const { origem, receipt_id, ...rest } = input

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      ...rest,
      origem: origem ?? 'manual',
      receipt_id: receipt_id ?? null,
      user_id: userData.user.id,
    })
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
