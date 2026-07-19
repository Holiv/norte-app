import { supabase } from '../../lib/supabaseClient'
import type { ExtractedReceiptData, Receipt, ReceiptTipo } from './types'

export async function uploadReceipt(file: File, tipo: ReceiptTipo): Promise<Receipt> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('Usuário não autenticado')

  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
  const path = `${userData.user.id}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('comprovantes')
    .upload(path, file, { contentType: file.type })
  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('receipts')
    .insert({ user_id: userData.user.id, arquivo: path, tipo, status: 'processando' })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function extractReceipt(receiptId: string): Promise<ExtractedReceiptData> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  const token = sessionData.session?.access_token
  if (!token) throw new Error('Sessão inválida — faça login novamente.')

  const res = await fetch('/api/extract-receipt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ receiptId }),
  })

  const body = await res.json()
  if (!res.ok) {
    throw new Error(body.error ?? 'Falha ao extrair dados do comprovante')
  }
  return body.data as ExtractedReceiptData
}

export async function deleteReceipt(id: string): Promise<void> {
  const { error } = await supabase.from('receipts').delete().eq('id', id)
  if (error) throw error
}
