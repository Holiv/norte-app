export interface Account {
  id: string
  user_id: string
  nome: string
  tipo: string
  created_at: string
}

export const ACCOUNT_TYPES = ['Conta corrente', 'Poupança', 'Carteira', 'Investimento', 'Outro'] as const
