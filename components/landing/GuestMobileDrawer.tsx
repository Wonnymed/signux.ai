'use client';

import Link from 'next/link';
import SukgoLogo from '@/components/brand/SukgoLogo';
import { X } from 'lucide-react';

export default function GuestMobileDrawer({ onClose }: { onClose: () => void }) {
  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 left-0 z-[110] flex w-[min(288px,92vw)] max-w-full flex-col border-r border-white/10 bg-[#121214] pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] shadow-xl animate-slide-in-left"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <Link href="/" onClick={onClose} className="flex items-center text-white/90">
            <SukgoLogo variant="dark" size="md" showWordmark />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white/50 hover:bg-white/5 hover:text-white/80"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex flex-col gap-2 p-4">
          <button
            type="button"
            onClick={() => {
              onClose();
              window.dispatchEvent(new CustomEvent('sukgo:show-auth', { detail: { mode: 'login' } }));
            }}
            className="rounded-lg border border-white/15 py-3 text-center text-[14px] font-medium text-white/85 hover:bg-white/[0.04]"
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              window.dispatchEvent(new CustomEvent('sukgo:show-auth', { detail: { mode: 'signup' } }));
            }}
            className="rounded-lg bg-[#e8593c] py-3 text-center text-[14px] font-semibold text-white hover:bg-[#d64d32]"
          >
            Get started
          </button>
        </div>
      </aside>
    </>
  );
}
