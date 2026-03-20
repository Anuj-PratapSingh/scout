import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALG = 'aes-256-gcm'

function getKey(): Buffer {
  const hex = process.env.BYOK_ENCRYPTION_KEY!
  if (!hex || hex.length !== 64) throw new Error('BYOK_ENCRYPTION_KEY must be 64 hex chars (32 bytes)')
  return Buffer.from(hex, 'hex')
}

export function encryptKey(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALG, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv, tag, encrypted].map(b => b.toString('hex')).join(':')
}

export function decryptKey(stored: string): string {
  const parts = stored.split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted key format')
  const [iv, tag, encrypted] = parts.map(s => Buffer.from(s, 'hex'))
  const decipher = createDecipheriv(ALG, getKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

export function maskKey(stored: string): string {
  try {
    const plain = decryptKey(stored)
    return '••••••••' + plain.slice(-4)
  } catch {
    return '••••••••'
  }
}
