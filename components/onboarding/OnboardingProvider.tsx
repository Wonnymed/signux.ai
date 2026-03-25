'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useOnboarding } from '@/lib/hooks/useOnboarding';
import ContextualTip from './ContextualTip';
import MilestoneToast from './MilestoneToast';
import type { MilestoneId, TipId } from '@/lib/onboarding/milestones';

interface OnboardingContextValue {
  milestonesCompleted: Set<MilestoneId>;
  activeTip: TipId | null;
  dismissTip: (tipId: TipId) => void;
  isNewUser: boolean;
  conversationsCount: number;
  simulationsCount: number;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboardingContext() {
  return useContext(OnboardingContext);
}

interface OnboardingProviderProps {
  userId: string | undefined;
  children: ReactNode;
}

export default function OnboardingProvider({ userId, children }: OnboardingProviderProps) {
  const onboarding = useOnboarding(userId);

  return (
    <OnboardingContext.Provider value={{
      milestonesCompleted: onboarding.milestonesCompleted,
      activeTip: onboarding.activeTip,
      dismissTip: onboarding.dismissTip,
      isNewUser: onboarding.isNewUser,
      conversationsCount: onboarding.conversationsCount,
      simulationsCount: onboarding.simulationsCount,
    }}>
      {children}

      {/* Global tip overlay (bottom-center and top-right positions) */}
      <ContextualTip
        tipId={onboarding.activeTip}
        onDismiss={onboarding.dismissTip}
      />

      {/* Milestone celebration toast */}
      <MilestoneToast milestoneId={onboarding.activeMilestone} />
    </OnboardingContext.Provider>
  );
}
