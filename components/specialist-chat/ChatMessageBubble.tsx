'use client';

import type { SpecialistChatMessage } from '@/lib/specialist-chat/types';

export default function ChatMessageBubble({
  msg,
  specialistName,
}: {
  msg: SpecialistChatMessage;
  specialistName: string;
}) {
  if (msg.role === 'user') {
    return (
      <div className="text-right">
        <div className="inline-block max-w-[85%] rounded-xl rounded-tr-sm bg-white/[0.06] px-3 py-2">
          <span className="text-[13px] text-white/70">{msg.text}</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-1 text-[10px] text-white/20">{specialistName}</div>
      <div className="max-w-[90%] rounded-xl rounded-tl-sm bg-white/[0.03] px-3 py-2">
        <span className="text-[13px] leading-relaxed text-white/60">{msg.text}</span>
        {msg.sources && msg.sources.length > 0 ? (
          <div className="mt-2 border-t border-white/[0.04] pt-2">
            {msg.sources.map((s, j) => (
              <a
                key={j}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-[10px] text-white/20 hover:text-white/40"
              >
                🔍 {s.title}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
