#!/usr/bin/env node
/**
 * Usage: node scripts/invite.js <event_id> <email> [expires_at]
 *
 * Requires .env.local:
 *   SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *
 * expires_at: ISO 8601 date string, e.g. "2026-12-31T23:59:59Z"
 *             Omit for a permanent key.
 */

const fs = require('fs')
const path = require('path')

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const [k, ...v] = line.split('=')
    if (k && v.length) process.env[k.trim()] = v.join('=').trim()
  })
}

const [,, event_id, email, expires_at] = process.argv

if (!event_id || !email) {
  console.error('Usage: node scripts/invite.js <event_id> <email> [expires_at]')
  process.exit(1)
}

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

async function main() {
  const body = { event_id, email }
  if (expires_at) body.expires_at = expires_at

  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    console.error('Error:', res.status, await res.text())
    process.exit(1)
  }

  const { key, url } = await res.json()
  console.log(`✓ Invite sent to ${email}`)
  console.log(`  Key:  ${key}`)
  console.log(`  URL:  ${url}`)
}

main().catch(err => { console.error(err); process.exit(1) })
