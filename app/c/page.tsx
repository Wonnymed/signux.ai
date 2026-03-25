'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import EntityVisual from '@/components/chat/EntityVisual';
import ChatInput from '@/components/chat/ChatInput';

export default function NewConversationPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSend = async (message: string, options?: { tier?: string; simulate?: boolean }) => {
    setLoading(true);
    try {
      const res = await fetch('/api/c', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstMessage: message }),
      });
      const data = await res.json();
      const id = data.id || data.conversation?.id;
      if (!id) throw new Error('No conversation created');

      // Send first message
      await fetch(`/api/c/${id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          action: options?.simulate ? 'simulate' : 'chat',
          tier: options?.tier || 'ink',
        }),
      });

      router.push(`/c/${id}`);
    } catch (err) {
      console.error('Failed to create conversation:', err);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Center: Entity + wordmark */}
      <div className="flex-1 flex items-center justify-center">
        <EntityVisual state="idle" />
      </div>

      {/* Bottom: input */}
      <ChatInput onSend={handleSend} loading={loading} />
    </div>
  );
}
