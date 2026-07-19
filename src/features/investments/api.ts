import { supabase } from '../../lib/supabaseClient'
import type { Investment, InvestmentContribution, InvestmentTipo } from './types'

export interface InvestmentInput {
  nome: string
  tipo: InvestmentTipo
  salario_bruto_mensal: number | null
  percentual_proprio: number | null
  percentual_match: number | null
  teto_match_mensal: number | null
  aporte_mensal_planejado: number | null
  taxa_retorno_anual: number
}

export async function listInvestments(): Promise<Investment[]> {
  const { data, error } = await supabase
    .from('investments')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function createInvestment(input: InvestmentInput): Promise<Investment> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('Usuário não autenticado')

  const { data, error } = await supabase
    .from('investments')
    .insert({ ...input, user_id: userData.user.id })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateInvestment(id: string, input: InvestmentInput): Promise<Investment> {
  const { data, error } = await supabase
    .from('investments')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteInvestment(id: string): Promise<void> {
  const { error } = await supabase.from('investments').delete().eq('id', id)
  if (error) throw error
}

export async function listInvestmentContributions(
  investmentId: string,
): Promise<InvestmentContribution[]> {
  const { data, error } = await supabase
    .from('investment_contributions')
    .select('*')
    .eq('investment_id', investmentId)
    .order('data', { ascending: false })

  if (error) throw error
  return data
}

export async function listAllInvestmentContributions(): Promise<InvestmentContribution[]> {
  const { data, error } = await supabase
    .from('investment_contributions')
    .select('*')
    .order('data', { ascending: false })

  if (error) throw error
  return data
}

export async function createInvestmentContribution(input: {
  investment_id: string
  data: string
  valor: number
}): Promise<InvestmentContribution> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('Usuário não autenticado')

  const { data, error } = await supabase
    .from('investment_contributions')
    .insert({ ...input, tipo: 'proprio', user_id: userData.user.id })
    .select()
    .single()

  if (error) throw error
  return data
}

function firstDayOfCurrentMonth(): string {
  return `${new Date().toISOString().slice(0, 7)}-01`
}

/**
 * Previdência é automática (descontada do salário bruto, não é uma escolha
 * mensal do usuário). Se ainda não existe registro do mês corrente, calcula
 * (salário bruto × percentuais) e lança sozinho, sem pedir confirmação.
 */
export async function ensurePrevidenciaContribuicaoDoMes(investment: Investment): Promise<void> {
  if (investment.tipo !== 'previdencia') return
  if (!investment.salario_bruto_mensal || !investment.percentual_proprio) return

  const primeiroDiaDoMes = firstDayOfCurrentMonth()

  const { data: existentes, error } = await supabase
    .from('investment_contributions')
    .select('id')
    .eq('investment_id', investment.id)
    .gte('data', primeiroDiaDoMes)

  if (error) throw error
  if (existentes.length > 0) return

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) return

  const aporteProprio = investment.salario_bruto_mensal * investment.percentual_proprio
  const rows: {
    user_id: string
    investment_id: string
    data: string
    valor: number
    tipo: 'proprio' | 'contrapartida_empresa'
  }[] = [
    {
      user_id: userData.user.id,
      investment_id: investment.id,
      data: primeiroDiaDoMes,
      valor: aporteProprio,
      tipo: 'proprio',
    },
  ]

  if (investment.percentual_match) {
    let aporteEmpresa = aporteProprio * investment.percentual_match
    if (investment.teto_match_mensal != null) {
      aporteEmpresa = Math.min(aporteEmpresa, investment.teto_match_mensal)
    }
    if (aporteEmpresa > 0) {
      rows.push({
        user_id: userData.user.id,
        investment_id: investment.id,
        data: primeiroDiaDoMes,
        valor: aporteEmpresa,
        tipo: 'contrapartida_empresa' as const,
      })
    }
  }

  const { error: insertError } = await supabase.from('investment_contributions').insert(rows)
  if (insertError) throw insertError
}
