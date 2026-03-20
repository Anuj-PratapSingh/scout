import { NextResponse } from 'next/server'
import bot from '@/bots/telegram'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const body = await req.json()
  await bot.handleUpdate(body)
  return NextResponse.json({ ok: true })
}
