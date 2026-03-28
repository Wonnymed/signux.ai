import { NextRequest, NextResponse } from 'next/server';
import { getConversation, getConversationMessages, togglePin, updateTitle, deleteConversation } from '@/lib/conversation/manager';

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

// PATCH — update title or pin
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  if (body.action === 'pin') await togglePin(id, body.pinned);
  if (body.action === 'rename') await updateTitle(id, body.title);

  return NextResponse.json({ success: true });
}

// DELETE — delete conversation
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await deleteConversation(id);
  return NextResponse.json({ success: true });
}
