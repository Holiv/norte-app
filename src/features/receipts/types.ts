export type ReceiptTipo = 'comprovante_pix' | 'extrato'
export type ReceiptStatus = 'processando' | 'concluido' | 'erro'

export interface Receipt {
  id: string
  user_id: string
  arquivo: string
  tipo: ReceiptTipo
  status: ReceiptStatus
  dados_extraidos: ExtractedReceiptData | ExtractedStatementData | null
  erro_mensagem: string | null
  created_at: string
}

export interface ExtractedReceiptData {
  valor: number
  data: string // 'YYYY-MM-DD'
  de_nome: string | null
  para_nome: string | null
  instituicao_de: string | null
  instituicao_para: string | null
  chave_pix: string | null
  autenticacao: string | null
  id_transacao: string | null
  descricao_sugerida: string
}

export interface ExtractedStatementLine {
  valor: number
  data: string // 'YYYY-MM-DD'
  favorecido: string | null
  descricao_sugerida: string
}

export interface ExtractedStatementData {
  linhas: ExtractedStatementLine[]
}
