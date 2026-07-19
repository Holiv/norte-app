// JSON Schema usado no output_config.format da chamada de visão (api/extract-receipt.ts).
// Mantido separado do types.ts porque é consumido pela função serverless (Node), não só pelo frontend.
export const EXTRACTED_RECEIPT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    valor: { type: 'number', description: 'Valor da transação em reais, ex: 150.00' },
    data: { type: 'string', description: "Data no formato YYYY-MM-DD" },
    de_nome: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    para_nome: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    instituicao_de: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    instituicao_para: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    chave_pix: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    autenticacao: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    id_transacao: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    descricao_sugerida: {
      type: 'string',
      description: 'Descrição curta sugerida, ex: "Pix para Fulano"',
    },
  },
  required: [
    'valor',
    'data',
    'de_nome',
    'para_nome',
    'instituicao_de',
    'instituicao_para',
    'chave_pix',
    'autenticacao',
    'id_transacao',
    'descricao_sugerida',
  ],
  additionalProperties: false,
} as const
