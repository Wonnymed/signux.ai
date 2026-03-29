'use client';

import { useSimulationStore } from '@/lib/store/simulation';
import SpecialistChatDrawer from './SpecialistChatDrawer';

/** Mount once in the conversation shell; drawer opens when the store says so. */
export default function SpecialistChatHost() {
  const open = useSimulationStore((s) => s.specialistChatOpen);
  if (!open) return null;
  return <SpecialistChatDrawer />;
}
