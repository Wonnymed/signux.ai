'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { FolderKanban, Search, ChevronDown, LogIn } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useProjects, type Project } from '@/app/lib/useProjects';
import { cn } from '@/lib/design/cn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/shadcn/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/shadcn/dialog';

type SortKey = 'created' | 'updated';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'updated', label: 'Activity' },
  { key: 'created', label: 'Date created' },
];

function sortProjects(list: Project[], sortKey: SortKey): Project[] {
  const copy = [...list];
  const field = sortKey === 'created' ? 'created_at' : 'updated_at';
  copy.sort((a, b) => new Date(b[field]).getTime() - new Date(a[field]).getTime());
  return copy;
}

function formatUpdated(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days < 0) return 'Updated just now';
  if (days === 0) return 'Updated today';
  if (days === 1) return 'Updated yesterday';
  return `Updated ${days} days ago`;
}

function cardDescription(p: Project): string {
  const raw = (p.description || p.summary || '').trim();
  return raw || 'No description yet.';
}

export default function ProjectsPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { projects, loading, activeProjectId, selectProject, createProject } = useProjects(isAuthenticated);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updated');
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const sortLabel = SORT_OPTIONS.find((o) => o.key === sortKey)?.label ?? 'Activity';

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = projects;
    if (q) {
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return sortProjects(list, sortKey);
  }, [projects, search, sortKey]);

  async function onCreateProject(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createProject(newName.trim());
      setNewName('');
      setModalOpen(false);
    } finally {
      setCreating(false);
    }
  }

  const openLogin = () =>
    window.dispatchEvent(new CustomEvent('octux:show-auth', { detail: { mode: 'login' } }));

  function openNewProject() {
    if (!isAuthenticated) {
      openLogin();
      return;
    }
    setNewName('');
    setModalOpen(true);
  }

  return (
    <div className="w-full max-w-[1100px] px-4 pb-20 pt-6 text-left sm:px-6 lg:px-10 lg:pt-8">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[28px] font-bold tracking-tight text-[#1A1A1A] dark:text-txt-primary">
          Projects
        </h1>
        <button
          type="button"
          onClick={openNewProject}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#1A1A1A] px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#2a2a2a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
        >
          + New project
        </button>
      </div>

      {/* Search */}
      <div
        className={cn(
          'relative mt-6 w-full sm:mt-6',
          !isAuthenticated && 'pointer-events-none opacity-50',
        )}
      >
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#9B9590]"
          strokeWidth={1.75}
          aria-hidden
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects..."
          disabled={!isAuthenticated}
          className={cn(
            'h-auto w-full rounded-xl border border-[#D9D0C4] bg-surface-0 py-3 pl-11 pr-4 text-[15px] text-txt-primary outline-none transition-shadow placeholder:text-[#9B9590]',
            'hover:border-[#c4bbb0] focus:border-[#a89e92] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] focus:ring-0 dark:border-border-default dark:bg-surface-1',
          )}
        />
      </div>

      {/* Sort by */}
      <div className="mt-4 flex justify-end">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-[#9B9590]">Sort by</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={!isAuthenticated}>
              <button
                type="button"
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md border border-[#D9D0C4] bg-surface-0 px-3 py-1.5 text-[13px] font-medium text-txt-primary transition-colors',
                  'hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring dark:border-border-default',
                  !isAuthenticated && 'pointer-events-none opacity-50',
                )}
              >
                {sortLabel}
                <ChevronDown className="h-3.5 w-3.5 text-txt-tertiary" strokeWidth={1.75} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px] rounded-lg border border-border-default bg-surface-raised p-1 shadow-lg">
              {SORT_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.key}
                  onClick={() => setSortKey(opt.key)}
                  className={cn(
                    'cursor-pointer rounded-md px-3 py-2 text-[13px] focus:bg-surface-2',
                    sortKey === opt.key && 'bg-surface-2/80 font-medium',
                  )}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
      ) : loading ? (
        <p className="mt-6 text-[15px] text-txt-tertiary">Loading projects…</p>
      ) : filteredSorted.length === 0 ? (
        <div className="mt-12 py-6 text-center sm:mt-12">
          <p className="text-[15px] text-[#9B9590]">
            {projects.length === 0 ? 'No projects yet' : 'No projects match your search'}
          </p>
          {projects.length === 0 && (
            <p className="mt-2 text-[13px] text-[#9B9590]">Create your first project to get started</p>
          )}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredSorted.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                selectProject(p.id);
                router.push('/');
              }}
              className={cn(
                'flex min-h-[160px] flex-col justify-between rounded-xl border border-[#E8E0D4] bg-surface-0 p-6 text-left transition-all duration-200',
                'cursor-pointer hover:border-[#D0C8BC] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring',
                p.id === activeProjectId && 'ring-1 ring-border-strong',
              )}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline">
                  <span className="text-[16px] font-semibold text-[#1A1A1A] dark:text-txt-primary">{p.name}</span>
                  {p.name.toLowerCase().includes('example') && (
                    <span className="ml-2 inline rounded px-2 py-0.5 text-[12px] font-medium text-[#6B6560] bg-[#F0EBE3] dark:bg-surface-2 dark:text-txt-secondary">
                      Example project
                    </span>
                  )}
                </div>
                <p className="mt-2 line-clamp-3 text-[14px] leading-[1.5] text-[#6B6560] dark:text-txt-secondary">
                  {cardDescription(p)}
                </p>
              </div>
              <p className="mt-auto pt-4 text-[13px] text-[#9B9590]">{formatUpdated(p.updated_at)}</p>
            </button>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <form onSubmit={onCreateProject}>
            <DialogHeader>
              <DialogTitle>New project</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <label htmlFor="project-name" className="sr-only">
                Project name
              </label>
              <input
                id="project-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Project name"
                maxLength={100}
                className="w-full rounded-lg border border-border-default bg-surface-0 px-3 py-2.5 text-[15px] text-txt-primary outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                autoFocus
              />
            </div>
            <DialogFooter className="border-0 pt-2 sm:justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg px-4 py-2 text-[13px] font-medium text-txt-secondary hover:bg-surface-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className="rounded-lg bg-[#1A1A1A] px-4 py-2 text-[13px] font-medium text-white transition-opacity disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
