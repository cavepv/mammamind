import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13?target=deno'

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing stripe-signature', { status: 400 })
  }

  const body = await req.text()
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  })

  let event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
    )
  } catch (err) {
    console.error('Webhook signature verification failed', err)
    return new Response('Invalid signature', { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return new Response('Ignored', { status: 200 })
  }

  const session = event.data.object
  const email = session.customer_details?.email ?? session.customer_email
  const event_id = session.metadata?.event_id

  if (!email || !event_id) {
    console.error('Missing email or event_id in session', session.id)
    return new Response('Missing data', { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Idempotent: find or create purchase
  let purchase
  const { data: existing } = await supabase
    .from('purchases')
    .select('id')
    .eq('stripe_payment_intent_id', session.payment_intent as string)
    .maybeSingle()

  if (existing) {
    purchase = existing
  } else {
    const { data: inserted, error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        stripe_payment_intent_id: session.payment_intent as string,
        event_id,
        email,
        amount: session.amount_total ?? 0,
        status: 'completed',
      })
      .select('id')
      .single()

    if (purchaseError) {
      console.error('Failed to insert purchase', purchaseError)
      return new Response('DB error', { status: 500 })
    }
    purchase = inserted
  }

  // Idempotent: only create key if one doesn't exist for this purchase
  const { data: existingKey } = await supabase
    .from('access_keys')
    .select('key')
    .eq('purchase_id', purchase.id)
    .maybeSingle()

  if (existingKey) {
    return new Response('OK (already processed)', { status: 200 })
  }

  // Call create-key function internally
  const createKeyRes = await fetch(
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/create-key`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({ event_id, email, purchase_id: purchase.id }),
    },
  )

  if (!createKeyRes.ok) {
    console.error('create-key failed', await createKeyRes.text())
    return new Response('Key creation failed', { status: 500 })
  }

  return new Response('OK', { status: 200 })
})
