import type { ReactNode } from 'react';

/**
 * Passthrough provider — renders children without wrapping.
 */
export const PassthroughProvider = ({ children }: { children: ReactNode }) => <>{children}</>;

/**
 * Null component — renders nothing.
 */
export const NullComponent = () => null;
