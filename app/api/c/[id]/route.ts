import { NextRequest, NextResponse } from 'next/server';
import { getConversation, getConversationMessages, togglePin, updateTitle, deleteConversation } from '@/lib/conversation/manager';
import { getUserIdFromRequest } from '@/lib/auth/supabase-server';

// GET — load conversation + messages
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const conversation = await getConversation(id);
  if (!conversation) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const messages = await getConversationMessages(id);
  return NextResponse.json({ conversation, messages });
}

async function assertOwnsConversation(req: NextRequest, conversationId: string): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const { userId, isAuthenticated } = await getUserIdFromRequest(req);
  if (!isAuthenticated) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const conv = await getConversation(conversationId);
  if (!conv || conv.user_id !== userId) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { ok: true, userId };
}

// PATCH — update title or pin
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await assertOwnsConversation(req, id);
  if (!gate.ok) return gate.response;

  const body = await req.json().catch(() => ({}));

  if (body.action === 'pin' && typeof body.pinned === 'boolean') {
    await togglePin(id, body.pinned);
  }
  if (body.action === 'rename' && typeof body.title === 'string') {
    const t = body.title.trim().slice(0, 200);
    if (t) await updateTitle(id, t);
  }

  return NextResponse.json({ success: true });
}

// DELETE — delete conversation
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gate = await assertOwnsConversation(req, id);
  if (!gate.ok) return gate.response;

  await deleteConversation(id);
  return NextResponse.json({ success: true });
}
