export type Direction = 'entrada' | 'saida'
export type Origem = 'manual' | 'comprovante_pix' | 'extrato'

export interface Category {
  id: string
  user_id: string | null
  nome: string
  tipo: 'receita' | 'despesa'
  is_default: boolean
}

export interface Transaction {
  id: string
  user_id: string
  account_id: string
  category_id: string
  income_source_id: string | null
  fixed_expense_id: string | null
  valor: number
  direcao: Direction
  data: string
  origem: Origem
  descricao: string | null
  created_at: string
  accounts?: { nome: string } | null
  categories?: { nome: string } | null
  income_sources?: { nome: string } | null
  fixed_expenses?: { nome: string } | null
}
