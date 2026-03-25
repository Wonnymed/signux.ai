import ChatLayout from '@/components/chat/ChatLayout';
import { CommandProvider } from '@/components/command';

export default function ConversationLayout({ children }: { children: React.ReactNode }) {
  return (
    <CommandProvider>
      <ChatLayout>{children}</ChatLayout>
    </CommandProvider>
  );
}
