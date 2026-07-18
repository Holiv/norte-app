import { supabase } from '../../lib/supabaseClient'
import type { Account } from './types'

export async function listAccounts(): Promise<Account[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function createAccount(input: { nome: string; tipo: string }): Promise<Account> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('Usuário não autenticado')

  const { data, error } = await supabase
    .from('accounts')
    .insert({ nome: input.nome, tipo: input.tipo, user_id: userData.user.id })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateAccount(
  id: string,
  input: { nome: string; tipo: string },
): Promise<Account> {
  const { data, error } = await supabase
    .from('accounts')
    .update({ nome: input.nome, tipo: input.tipo })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteAccount(id: string): Promise<void> {
  const { error } = await supabase.from('accounts').delete().eq('id', id)
  if (error) {
    if (error.code === '23503') {
      throw new Error(
        'Não é possível excluir: existem transações vinculadas a essa conta.',
      )
    }
    throw error
  }
}
