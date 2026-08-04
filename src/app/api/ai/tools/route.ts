import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { executeAiTool } from '@/ai/executeTool'

// Single relay endpoint for every OpenAI Realtime function call. The browser
// never talks to Supabase directly — it only knows a conversationId, and this
// route resolves conversationId -> business_id server-side (admin client)
// before touching any tenant data, so a caller can't spoof another business.
// Actual tool behavior lives in src/ai/executeTool.ts, shared with the
// WhatsApp text-mode agent so booking/lead logic never diverges by channel.
export async function POST(request: Request) {
  const { conversationId, name, arguments: args } = await request.json()
  const supabase = createAdminClient()

  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single()
  if (error || !conversation) {
    return NextResponse.json({ error: 'Unknown conversation' }, { status: 404 })
  }

  try {
    const result = await executeAiTool(
      supabase,
      { conversationId, businessId: conversation.business_id, clientSource: 'ai_call' },
      name,
      args
    )
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Tool execution failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
