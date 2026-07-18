export interface Debt {
  id: string
  user_id: string
  nome: string
  valor_principal: number
  taxa_juros_anual: number // fração decimal (0.129 = 12,9% a.a.)
  valor_parcela: number
  saldo_devedor: number
  prazo_meses: number
  data_vencimento: string // data prevista de quitação final
  created_at: string
}
