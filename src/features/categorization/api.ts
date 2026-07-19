import { supabase } from '../../lib/supabaseClient'

export function normalizeFavorecido(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

export async function suggestCategoryForFavorecido(favorecido: string): Promise<string | null> {
  const normalized = normalizeFavorecido(favorecido)
  if (!normalized) return null

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return null

  const { data, error } = await supabase
    .from('payee_category_memory')
    .select('category_id')
    .eq('user_id', userData.user.id)
    .eq('favorecido_normalizado', normalized)
    .maybeSingle()

  if (error || !data) return null
  return data.category_id
}

export async function rememberFavorecidoCategory(favorecido: string, categoryId: string): Promise<void> {
  const normalized = normalizeFavorecido(favorecido)
  if (!normalized) return

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return

  await supabase.from('payee_category_memory').upsert(
    {
      user_id: userData.user.id,
      favorecido_normalizado: normalized,
      category_id: categoryId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,favorecido_normalizado' },
  )
}
