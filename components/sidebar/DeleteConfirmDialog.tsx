'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
}

export default function DeleteConfirmDialog({ open, onClose, onConfirm, title }: DeleteConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-surface-overlay/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
        className="relative z-10 w-full max-w-sm mx-4 bg-surface-raised border border-border-subtle rounded-xl shadow-xl p-5"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-verdict-abandon/10 flex items-center justify-center shrink-0">
            <AlertTriangle size={16} className="text-verdict-abandon" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-txt-primary mb-1">Delete this simulation?</h3>
            <p className="text-xs text-txt-tertiary mb-1">
              &ldquo;<span className="text-txt-secondary">{title}</span>&rdquo;
            </p>
            <p className="text-micro text-txt-disabled">
              This will permanently delete this simulation and its messages. This cannot be undone.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded text-txt-disabled hover:text-txt-tertiary">
            <X size={14} />
          </button>
        </div>

        <div className="flex gap-2 mt-5 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs text-txt-secondary bg-surface-2 hover:bg-surface-2/80 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-verdict-abandon hover:bg-verdict-abandon/90 transition-colors"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}
