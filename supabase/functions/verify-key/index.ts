import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.mammamind.se',
  'Access-Control-Allow-Headers': 'content-type',
  'Content-Type': 'application/json',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { key } = await req.json()
  if (!key) {
    return new Response(JSON.stringify({ valid: false, reason: 'missing_key' }), {
      headers: corsHeaders, status: 400,
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data, error } = await supabase
    .from('access_keys')
    .select('expires_at, events(title, description, content_url)')
    .eq('key', key)
    .single()

  if (error || !data) {
    return new Response(JSON.stringify({ valid: false, reason: 'not_found' }), {
      headers: corsHeaders,
    })
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return new Response(JSON.stringify({ valid: false, reason: 'expired' }), {
      headers: corsHeaders,
    })
  }

  return new Response(JSON.stringify({ valid: true, event: data.events }), {
    headers: corsHeaders,
  })
})
