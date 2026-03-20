import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { encryptKey, maskKey } from '@/lib/crypto'

async function getUser(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user
}

// GET /api/preferences
export async function GET(req: Request) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: prefs } = await supabaseAdmin
    .from('preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: keys } = await supabaseAdmin
    .from('user_keys')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  // Mask key values before returning
  const maskedKeys = keys ? Object.fromEntries(
    Object.entries(keys).map(([k, v]) =>
      typeof v === 'string' && v.includes(':') ? [k, maskKey(v)] : [k, v]
    )
  ) : null

  return NextResponse.json({ preferences: prefs, keys: maskedKeys })
}

// PUT /api/preferences
export async function PUT(req: Request) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { categories, custom_criteria, compulsory_criteria, match_threshold, keys } = body

  // Upsert preferences
  if (categories !== undefined || custom_criteria !== undefined) {
    await supabaseAdmin.from('preferences').upsert({
      user_id: user.id,
      ...(categories !== undefined && { categories }),
      ...(custom_criteria !== undefined && { custom_criteria }),
      ...(compulsory_criteria !== undefined && { compulsory_criteria }),
      ...(match_threshold !== undefined && { match_threshold }),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  }

  // Upsert BYOK keys (encrypt each)
  if (keys) {
    const encrypted: Record<string, string> = { user_id: user.id }
    const keyFields = ['reddit_client_id', 'reddit_client_secret', 'google_cse_key', 'google_cse_id', 'resend_api_key', 'ai_api_key']
    for (const field of keyFields) {
      if (keys[field]) encrypted[field] = encryptKey(keys[field])
    }
    if (keys.ai_provider) encrypted.ai_provider = keys.ai_provider
    if (Object.keys(encrypted).length > 1) {
      await supabaseAdmin.from('user_keys').upsert(encrypted, { onConflict: 'user_id' })
    }
  }

  return NextResponse.json({ ok: true })
}
