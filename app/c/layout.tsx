import ChatLayout from '@/components/chat/ChatLayout';
import { CommandProvider } from '@/components/command';
import ShortcutOverlay from '@/components/ui/ShortcutOverlay';
import ShortcutToast from '@/components/ui/ShortcutToast';
import OnboardingProvider from '@/components/onboarding/OnboardingProvider';
import { getAuthUserId } from '@/lib/auth/supabase-server';

export default async function ConversationLayout({ children }: { children: React.ReactNode }) {
  const userId = await getAuthUserId() ?? undefined;

  return (
    <OnboardingProvider userId={userId}>
      <CommandProvider>
        <ChatLayout>{children}</ChatLayout>
        <ShortcutOverlay />
        <ShortcutToast />
      </CommandProvider>
    </OnboardingProvider>
  );
}
