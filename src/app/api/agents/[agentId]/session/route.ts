import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { startConversation } from '@/services/conversations'
import { listAiVisibleListings } from '@/services/listings'
import { buildSystemPrompt, REALTIME_TOOLS } from '@/ai/tools'
import { OPENAI_REALTIME_MODEL } from '@/constants'
import { Redis } from '@upstash/redis'

const redisClient = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

// Public endpoint — hit by the embeddable widget with no Supabase session, so
// it uses the admin client and only ever returns an OpenAI *ephemeral* secret,
// never OPENAI_API_KEY or SUPABASE_SERVICE_ROLE_KEY itself.
export async function POST(request: Request, { params }: { params: { agentId: string } }) {
  const { listingId, sessionToken } = await request.json().catch(() => ({ listingId: undefined, sessionToken: undefined }))
  const supabase = createAdminClient()

  // Rate limiting per agentId + IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  const rlKey = `ratelimit:${params.agentId}:${ip}`
  const count = await redisClient.incr(rlKey)
  if (count === 1) await redisClient.expire(rlKey, 60) // 1 minute window
  if (count > 5) {
    return NextResponse.json({ error: 'Rate limit exceeded. Max 5 calls per minute.' }, { status: 429 })
  }

  // Validate session token (short-lived token issued by widget)
  if (!sessionToken) {
    return NextResponse.json({ error: 'Missing session token' }, { status: 401 })
  }
  const tokenKey = `session:${sessionToken}`
  const tokenValid = await redisClient.get(tokenKey)
  if (!tokenValid) {
    return NextResponse.json({ error: 'Invalid or expired session token' }, { status: 403 })
  }
  // Token is valid, consume it (one-time use)
  await redisClient.del(tokenKey)

  const { data: agent, error: agentError } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('id', params.agentId)
    .eq('status', 'live')
    .maybeSingle()
  if (agentError) return NextResponse.json({ error: agentError.message }, { status: 500 })
  if (!agent) return NextResponse.json({ error: 'Agent not found or not live' }, { status: 404 })

  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', agent.business_id)
    .single()
  if (businessError) return NextResponse.json({ error: businessError.message }, { status: 500 })

  const listings = await listAiVisibleListings(supabase, business.id)
  const conversation = await startConversation(supabase, business.id, {
    agentId: agent.id,
    listingId,
    channel: 'widget_voice',
  })

  const systemPrompt = buildSystemPrompt({ business, agent, listings })
  const turnDetection = {
    type: 'server_vad',
    threshold: Number(agent.sensitivity) || 0.5,
    prefix_padding_ms: 300,
    silence_duration_ms: 500,
  }

  // OpenAI retired /v1/realtime/sessions in favor of /v1/realtime/client_secrets,
  // which nests the session config under `session` and moves voice/turn_detection
  // under `session.audio.output`/`session.audio.input`.
  const openaiResponse = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session: {
        type: 'realtime',
        model: OPENAI_REALTIME_MODEL,
        instructions: systemPrompt,
        tools: REALTIME_TOOLS,
        audio: {
          output: { voice: agent.voice },
          input: { turn_detection: turnDetection },
        },
      },
    }),
  })

  if (!openaiResponse.ok) {
    const detail = await openaiResponse.text()
    return NextResponse.json({ error: `OpenAI Realtime error: ${detail}` }, { status: 502 })
  }

  const session = await openaiResponse.json()

  return NextResponse.json({
    conversationId: conversation.id,
    agentName: agent.name,
    voice: agent.voice,
    model: OPENAI_REALTIME_MODEL,
    systemPrompt,
    tools: REALTIME_TOOLS,
    turnDetection,
    clientSecret: session.value,
    expiresAt: session.expires_at,
  })
}
