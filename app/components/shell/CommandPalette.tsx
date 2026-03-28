'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  FlaskConical,
  Zap,
  Hammer,
  TrendingUp,
  User,
  Shield,
  Swords,
  Home,
  Circle,
  CircleDot,
} from 'lucide-react';

type CommandItem = {
  id: string;
  label: string;
  sublabel?: string;
  section: 'recent' | 'action' | 'engine' | 'navigate';
  icon: ReactNode;
  action: () => void;
  keywords?: string[];
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const ENGINE_COLORS: Record<string, string> = {
  simulate: '#1A1815',
  build: '#10B981',
  grow: '#F59E0B',
  hire: '#06B6D4',
  protect: '#C9970D',
  compete: '#F97316',
};

const ICON_BOX = {
  width: '24px',
  height: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '6px',
} as const;

function verdictIcon(rec: string | undefined): ReactNode {
  if (rec === 'proceed') {
    return <Circle size={14} fill="currentColor" className="text-emerald-600" strokeWidth={0} />;
  }
  if (rec === 'delay') {
    return <CircleDot size={14} className="text-amber-500" strokeWidth={2} />;
  }
  return <Circle size={14} className="text-neutral-400" strokeWidth={2} />;
}

function buildStaticItems(router: ReturnType<typeof useRouter>, onClose: () => void): CommandItem[] {
  return [
    {
      id: 'new-sim',
      label: 'New simulation',
      sublabel: 'Start a new decision analysis',
      section: 'action',
      icon: <Plus size={14} strokeWidth={2} />,
      action: () => {
        onClose();
        router.push('/');
        setTimeout(() => document.querySelector<HTMLInputElement>('input[type="text"]')?.focus(), 100);
      },
      keywords: ['create', 'start', 'question', 'ask'],
    },
    {
      id: 'calibration',
      label: 'Calibration Lab',
      sublabel: 'Agent performance + accuracy',
      section: 'action',
      icon: <FlaskConical size={14} strokeWidth={2} />,
      action: () => {
        onClose();
        router.push('/calibration');
      },
      keywords: ['dashboard', 'performance', 'accuracy', 'brier', 'agents', 'scores'],
    },
    {
      id: 'engine-simulate',
      label: 'Simulate',
      sublabel: 'Decision simulation engine',
      section: 'engine',
      icon: <Zap size={14} strokeWidth={2} />,
      action: () => {
        onClose();
        router.push('/?engine=simulate');
      },
      keywords: ['decision', 'analyze', 'debate'],
    },
    {
      id: 'engine-build',
      label: 'Build',
      sublabel: 'Product & tech decisions',
      section: 'engine',
      icon: <Hammer size={14} strokeWidth={2} />,
      action: () => {
        onClose();
        router.push('/?engine=build');
      },
      keywords: ['product', 'technology', 'mvp', 'development'],
    },
    {
      id: 'engine-grow',
      label: 'Grow',
      sublabel: 'Growth & marketing decisions',
      section: 'engine',
      icon: <TrendingUp size={14} strokeWidth={2} />,
      action: () => {
        onClose();
        router.push('/?engine=grow');
      },
      keywords: ['marketing', 'growth', 'acquisition', 'revenue'],
    },
    {
      id: 'engine-hire',
      label: 'Hire',
      sublabel: 'Team & hiring decisions',
      section: 'engine',
      icon: <User size={14} strokeWidth={2} />,
      action: () => {
        onClose();
        router.push('/?engine=hire');
      },
      keywords: ['team', 'hiring', 'talent', 'recruit', 'people'],
    },
    {
      id: 'engine-protect',
      label: 'Protect',
      sublabel: 'Risk & compliance decisions',
      section: 'engine',
      icon: <Shield size={14} strokeWidth={2} />,
      action: () => {
        onClose();
        router.push('/?engine=protect');
      },
      keywords: ['risk', 'compliance', 'legal', 'insurance'],
    },
    {
      id: 'engine-compete',
      label: 'Compete',
      sublabel: 'Competitive strategy decisions',
      section: 'engine',
      icon: <Swords size={14} strokeWidth={2} />,
      action: () => {
        onClose();
        router.push('/?engine=compete');
      },
      keywords: ['competition', 'strategy', 'market', 'positioning'],
    },
    {
      id: 'nav-home',
      label: 'Go to Home',
      section: 'navigate',
      icon: <Home size={14} strokeWidth={2} />,
      action: () => {
        onClose();
        router.push('/');
      },
      keywords: ['home', 'main'],
    },
  ];
}

function fuzzyMatch(query: string, item: CommandItem): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const searchable = [item.label, item.sublabel || '', ...(item.keywords || [])].join(' ').toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  return words.every((word) => searchable.includes(word));
}

export default function CommandPalette({ isOpen, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSims, setRecentSims] = useState<CommandItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return;

    setQuery('');
    setSelectedIndex(0);
    setTimeout(() => inputRef.current?.focus(), 50);

    fetch('/api/command-palette/recent')
      .then((r) => r.json())
      .then((data) => {
        if (data.sims) {
          setRecentSims(
            data.sims.map(
              (s: {
                id: string;
                question?: string;
                verdict_recommendation?: string;
                verdict_probability?: number;
                created_at: string;
              }) => ({
                id: `sim-${s.id}`,
                label:
                  (s.question || '').substring(0, 60) + ((s.question || '').length > 60 ? '...' : ''),
                sublabel: `${(s.verdict_recommendation || '?').toUpperCase()} (${s.verdict_probability || 0}%) — ${new Date(s.created_at).toLocaleDateString()}`,
                section: 'recent' as const,
                icon: verdictIcon(s.verdict_recommendation),
                action: () => {
                  onClose();
                  router.push(`/c/${s.id}`);
                },
                keywords: [s.verdict_recommendation || '', 'recent', 'simulation', 'past'],
              }),
            ),
          );
        }
      })
      .catch(() => {});
  }, [isOpen, onClose, router]);

  const staticItems = buildStaticItems(router, onClose);
  const allItems = [...recentSims, ...staticItems];
  const filtered = allItems.filter((item) => fuzzyMatch(query, item));

  const sections: { key: string; label: string; items: CommandItem[] }[] = [];
  const recentFiltered = filtered.filter((i) => i.section === 'recent');
  const actionFiltered = filtered.filter((i) => i.section === 'action');
  const engineFiltered = filtered.filter((i) => i.section === 'engine');
  const navFiltered = filtered.filter((i) => i.section === 'navigate');

  if (recentFiltered.length > 0) sections.push({ key: 'recent', label: 'Recent simulations', items: recentFiltered });
  if (actionFiltered.length > 0) sections.push({ key: 'action', label: 'Actions', items: actionFiltered });
  if (engineFiltered.length > 0) sections.push({ key: 'engine', label: 'Engines', items: engineFiltered });
  if (navFiltered.length > 0) sections.push({ key: 'navigate', label: 'Navigation', items: navFiltered });

  const flatItems = sections.flatMap((s) => s.items);

  useEffect(() => {
    if (selectedIndex >= flatItems.length) setSelectedIndex(Math.max(0, flatItems.length - 1));
  }, [flatItems.length, selectedIndex]);

  function handleKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatItems[selectedIndex]) flatItems[selectedIndex].action();
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isOpen) return null;

  let flatIndex = -1;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
        backgroundColor: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--surface-0, #fff)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
        }}
        onKeyDown={handleKeyDown}
      >
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle, rgba(0,0,0,0.06))' }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search..."
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              fontSize: '15px',
              background: 'transparent',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <div ref={listRef} style={{ maxHeight: '400px', overflowY: 'auto', padding: '8px 0' }}>
          {sections.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: '13px', color: 'var(--text-tertiary)' }}>
              No results for &quot;{query}&quot;
            </div>
          )}

          {sections.map((section) => (
            <div key={section.key}>
              <div
                style={{
                  padding: '8px 16px 4px',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {section.label}
              </div>
              {section.items.map((item) => {
                flatIndex++;
                const isSelected = flatIndex === selectedIndex;
                const currentIndex = flatIndex;
                const engineKey = item.id.replace('engine-', '');
                const engineColor = ENGINE_COLORS[engineKey] || '#1A1815';

                return (
                  <div
                    key={item.id}
                    data-index={currentIndex}
                    onClick={() => item.action()}
                    onMouseEnter={() => setSelectedIndex(currentIndex)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--surface-2, #f2f2ef)' : 'transparent',
                      transition: 'background 60ms',
                    }}
                  >
                    <span
                      style={{
                        ...ICON_BOX,
                        flexShrink: 0,
                        color: item.section === 'engine' ? engineColor : 'var(--text-secondary)',
                        background:
                          item.section === 'engine' ? engineColor + '18' : 'var(--surface-2, #f2f2ef)',
                      }}
                    >
                      {item.icon}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '14px',
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.label}
                      </div>
                      {item.sublabel && (
                        <div
                          style={{
                            fontSize: '12px',
                            color: 'var(--text-tertiary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.sublabel}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div
          style={{
            padding: '8px 16px',
            borderTop: '1px solid var(--border-subtle, rgba(0,0,0,0.06))',
            display: 'flex',
            gap: '16px',
            fontSize: '11px',
            color: 'var(--text-tertiary)',
          }}
        >
          <span>↑↓ navigate</span>
          <span>enter select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
