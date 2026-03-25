'use client';

import { useCommandPalette } from '@/lib/hooks/useCommandPalette';
import CommandPalette from './CommandPalette';

export default function CommandProvider({ children }: { children: React.ReactNode }) {
  const {
    open, setOpen,
    query, setQuery,
    results, recentCommands,
    selectedIndex, setSelectedIndex,
    executeCommand,
    loading,
  } = useCommandPalette();

  return (
    <>
      {children}
      <CommandPalette
        open={open}
        onClose={() => { setOpen(false); setQuery(''); }}
        query={query}
        onQueryChange={setQuery}
        results={results}
        recentCommands={recentCommands}
        selectedIndex={selectedIndex}
        onSelectedIndexChange={setSelectedIndex}
        onExecute={executeCommand}
        loading={loading}
      />
    </>
  );
}
