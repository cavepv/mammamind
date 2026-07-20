import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13?target=deno'

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

  const { event_id, success_url, cancel_url } = await req.json()
  if (!event_id || !success_url || !cancel_url) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      headers: corsHeaders, status: 400,
    })
  }

  const ALLOWED_ORIGIN = 'https://www.mammamind.se'
  if (!success_url.startsWith(ALLOWED_ORIGIN) || !cancel_url.startsWith(ALLOWED_ORIGIN)) {
    return new Response(JSON.stringify({ error: 'Invalid redirect URL' }), {
      headers: corsHeaders, status: 400,
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  )

  const { data: event, error } = await supabase
    .from('events')
    .select('stripe_price_id, title')
    .eq('id', event_id)
    .single()

  if (error || !event?.stripe_price_id) {
    return new Response(JSON.stringify({ error: 'Event not found' }), {
      headers: corsHeaders, status: 404,
    })
  }

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!.trim(), {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  })

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: event.stripe_price_id, quantity: 1 }],
      metadata: { event_id },
      success_url,
      cancel_url,
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: corsHeaders,
    })
  } catch (err) {
    console.error('Stripe checkout session creation failed', err)
    return new Response(JSON.stringify({ error: 'Checkout session creation failed' }), {
      headers: corsHeaders, status: 500,
    })
  }
})
