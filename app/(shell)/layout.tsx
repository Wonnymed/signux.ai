import ChatLayout from '@/components/chat/ChatLayout';
import { CommandProvider } from '@/components/command';
import ShortcutOverlay from '@/components/ui/ShortcutOverlay';
import ShortcutToast from '@/components/ui/ShortcutToast';
import OnboardingProvider from '@/components/onboarding/OnboardingProvider';
import { getAuthUserId } from '@/lib/auth/supabase-server';

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  let userId: string | undefined;
  try {
    userId = (await getAuthUserId()) ?? undefined;
  } catch {
    userId = undefined;
  }

  // ALWAYS render the product shell — sidebar for everyone
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
