'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { FolderKanban, Plus, Search, ChevronDown, LogIn } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useProjects, type Project } from '@/app/lib/useProjects';
import { cn } from '@/lib/design/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/shadcn/dropdown-menu';

type SortKey = 'created' | 'updated';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'created', label: 'Recently Created' },
  { key: 'updated', label: 'Recently Updated' },
];

function sortProjects(list: Project[], sortKey: SortKey): Project[] {
  const copy = [...list];
  const field = sortKey === 'created' ? 'created_at' : 'updated_at';
  copy.sort((a, b) => new Date(b[field]).getTime() - new Date(a[field]).getTime());
  return copy;
}

export default function ProjectsPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { projects, loading, activeProjectId, selectProject, createProject } = useProjects(isAuthenticated);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created');

  const sortLabel = SORT_OPTIONS.find((o) => o.key === sortKey)?.label ?? 'Recently Created';

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = projects;
    if (q) {
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return sortProjects(list, sortKey);
  }, [projects, search, sortKey]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createProject(name.trim());
      setName('');
    } finally {
      setCreating(false);
    }
  }

  const openLogin = () =>
    window.dispatchEvent(new CustomEvent('octux:show-auth', { detail: { mode: 'login' } }));

  return (
    <div className="w-full max-w-[1100px] px-4 pb-20 pt-6 text-left sm:px-6 lg:px-10 lg:pt-8">
      <h1 className="text-2xl font-semibold tracking-tight text-txt-primary sm:text-[26px]">Projects</h1>

      <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center sm:gap-4">
        <div
          className={cn(
            'relative min-h-10 min-w-0 flex-1 rounded-lg border border-border-default bg-surface-0',
            !isAuthenticated && 'pointer-events-none opacity-50',
          )}
        >
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-txt-disabled"
            strokeWidth={1.75}
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your projects..."
            disabled={!isAuthenticated}
            className="h-10 w-full rounded-lg bg-transparent py-2 pl-10 pr-3 text-[14px] text-txt-primary outline-none placeholder:text-txt-disabled focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={!isAuthenticated}>
            <button
              type="button"
              className={cn(
                'inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-border-default bg-surface-0 px-3 text-[13px] font-medium text-txt-primary transition-colors',
                'hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0',
                !isAuthenticated && 'pointer-events-none opacity-50',
              )}
            >
              {sortLabel}
              <ChevronDown className="h-4 w-4 text-txt-tertiary" strokeWidth={1.75} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[200px] rounded-xl border border-border-default bg-surface-raised p-1 shadow-lg">
            {SORT_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.key}
                onClick={() => setSortKey(opt.key)}
                className={cn(
                  'cursor-pointer rounded-lg px-3 py-2 text-[13px] focus:bg-surface-2',
                  sortKey === opt.key && 'bg-surface-2/80 font-medium',
                )}
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {!isAuthenticated ? (
        <div className="mt-14 max-w-md sm:mt-16">
          <FolderKanban
            className="mb-6 h-16 w-16 text-txt-disabled sm:h-[72px] sm:w-[72px]"
            strokeWidth={1}
            aria-hidden
          />
          <h2 className="text-lg font-semibold tracking-tight text-txt-primary sm:text-xl">Sign in to use Projects</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-txt-secondary sm:text-[15px]">
            Log in to create projects, upload materials, and organize your conversations in one space.
          </p>
          <button
            type="button"
            onClick={openLogin}
            className="mt-8 inline-flex h-10 items-center gap-2 rounded-lg border border-border-default bg-surface-0 px-4 text-[13px] font-medium text-txt-primary transition-colors hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0"
          >
            <LogIn className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Log in to continue
          </button>
        </div>
      ) : (
        <>
          <form
            onSubmit={onCreate}
            className="mt-8 flex max-w-2xl flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
          >
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New project name"
              className="min-h-10 min-w-0 flex-1 rounded-lg border border-border-default bg-surface-0 px-3 py-2 text-[14px] text-txt-primary outline-none placeholder:text-txt-disabled focus-visible:ring-2 focus-visible:ring-focus-ring"
              maxLength={100}
            />
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-[13px] font-medium text-white transition-opacity disabled:opacity-50"
            >
              <Plus size={16} strokeWidth={2} aria-hidden />
              Create
            </button>
          </form>

          <div className="mt-8">
            {loading ? (
              <p className="text-[14px] text-txt-tertiary">Loading projects…</p>
            ) : filteredSorted.length === 0 ? (
              <p className="text-[14px] text-txt-secondary">
                {projects.length === 0
                  ? 'No projects yet. Create one above.'
                  : 'No projects match your search.'}
              </p>
            ) : (
              <ul className="max-w-2xl space-y-1">
                {filteredSorted.map((p) => {
                  const active = p.id === activeProjectId;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => {
                          selectProject(p.id);
                          router.push('/');
                        }}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[14px] font-medium transition-colors',
                          active
                            ? 'bg-surface-2 text-txt-primary'
                            : 'text-txt-primary hover:bg-surface-2/80',
                        )}
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: p.color || '#D4AF37' }}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate">{p.name}</span>
                        {p.conversation_count > 0 && (
                          <span className="shrink-0 tabular-nums text-[12px] text-txt-tertiary">
                            {p.conversation_count}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
