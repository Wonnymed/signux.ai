'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { TRANSITIONS } from '@/lib/design/transitions';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={TRANSITIONS.page}
        className="flex min-h-0 w-full flex-1 flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
