import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Service role only — no CORS headers (never called from browser directly)
  const authHeader = req.headers.get('Authorization') ?? ''
  if (authHeader !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { event_id, email, expires_at, purchase_id } = await req.json()
  if (!event_id || !email) {
    return new Response('Missing event_id or email', { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: keyRow, error } = await supabase
    .from('access_keys')
    .insert({ event_id, email, expires_at: expires_at ?? null, purchase_id: purchase_id ?? null })
    .select('key')
    .single()

  if (error || !keyRow) {
    console.error('insert error', error)
    return new Response('Failed to create key', { status: 500 })
  }

  const { data: event } = await supabase
    .from('events')
    .select('title')
    .eq('id', event_id)
    .single()

  const keyUrl = `https://www.mammamind.se/content/?key=${keyRow.key}`

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'MammaMind <info@mammamind.se>',
      to: email,
      subject: `Din plats på ${event?.title ?? 'MammaMind'} – här är din länk 🌸`,
      html: `
        <p>Hej,</p>
        <p>Välkommen till <strong>${event?.title ?? 'MammaMind'}</strong>!</p>
        <p>Klicka på länken nedan för att komma åt ditt innehåll:</p>
        <p><a href="${keyUrl}">${keyUrl}</a></p>
        <p><em>Spara länken – du behöver den varje gång du vill komma åt kursmaterialet.</em></p>
        <p>Varma hälsningar,<br>Tara – MammaMind</p>
      `,
    }),
  })

  if (!emailRes.ok) {
    const errBody = await emailRes.text()
    console.error('Resend email failed', emailRes.status, errBody)
    return new Response('Email delivery failed', { status: 500 })
  }

  return new Response(JSON.stringify({ key: keyRow.key, url: keyUrl }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
