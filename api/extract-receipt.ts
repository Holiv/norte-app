import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { EXTRACTED_RECEIPT_JSON_SCHEMA } from '../src/features/receipts/extractionSchema'
import type { ExtractedReceiptData } from '../src/features/receipts/types'

const EXTRACTION_PROMPT = `Extraia os dados desse comprovante de Pix (transferência bancária).
Preencha todos os campos do schema; use null nos campos que não encontrar no documento.
"descricao_sugerida" deve ser curta, no formato "Pix para {para_nome}" (ou "Pix de {de_nome}" se fizer mais sentido).`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autenticação ausente' })
    return
  }
  const accessToken = authHeader.slice('Bearer '.length)

  const { receiptId } = req.body as { receiptId?: string }
  if (!receiptId) {
    res.status(400).json({ error: 'receiptId obrigatório' })
    return
  }

  const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })

  const { data: receipt, error: receiptError } = await supabase
    .from('receipts')
    .select('*')
    .eq('id', receiptId)
    .single()

  if (receiptError || !receipt) {
    res.status(404).json({ error: 'Comprovante não encontrado' })
    return
  }

  try {
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('comprovantes')
      .download(receipt.arquivo)

    if (downloadError || !fileData) {
      throw new Error(downloadError?.message ?? 'Falha ao baixar arquivo do storage')
    }

    const buffer = Buffer.from(await fileData.arrayBuffer())
    const base64 = buffer.toString('base64')
    const mimeType = fileData.type || 'application/octet-stream'
    const isPdf = mimeType === 'application/pdf'

    if (!isPdf && !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mimeType)) {
      throw new Error(`Tipo de arquivo não suportado: ${mimeType}`)
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      thinking: { type: 'adaptive' },
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: EXTRACTED_RECEIPT_JSON_SCHEMA },
      },
      messages: [
        {
          role: 'user',
          content: [
            isPdf
              ? {
                  type: 'document',
                  source: { type: 'base64', media_type: 'application/pdf', data: base64 },
                }
              : {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
                    data: base64,
                  },
                },
            { type: 'text', text: EXTRACTION_PROMPT },
          ],
        },
      ],
    })

    const textBlock = message.content.find((block) => block.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('Resposta do modelo sem bloco de texto')
    }

    const extracted = JSON.parse(textBlock.text) as ExtractedReceiptData

    await supabase
      .from('receipts')
      .update({ status: 'concluido', dados_extraidos: extracted })
      .eq('id', receiptId)

    res.status(200).json({ data: extracted })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await supabase.from('receipts').update({ status: 'erro', erro_mensagem: message }).eq('id', receiptId)
    res.status(500).json({ error: message })
  }
}
