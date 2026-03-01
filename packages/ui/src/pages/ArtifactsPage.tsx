/**
 * ArtifactsPage
 *
 * Management page for AI-generated artifacts with filter tabs,
 * grid layout, and WS-driven refresh.
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArtifactCard } from '../components/ArtifactCard';
import { EmptyState } from '../components/EmptyState';
import { SkeletonCard } from '../components/Skeleton';
import {
  LayoutTemplate,
  Code2,
  PenTool,
  FileText,
  FormInput,
  BarChart3,
  Pin,
  Search,
  RefreshCw,
} from '../components/icons';
import { artifactsApi } from '../api/endpoints/artifacts';
import type { Artifact, ArtifactType } from '../api/endpoints/artifacts';
import { useGateway } from '../hooks/useWebSocket';

// =============================================================================
// Filter tabs
// =============================================================================

interface FilterTab {
  key: string;
  label: string;
  icon: typeof Code2;
  filter: { type?: ArtifactType; pinned?: boolean };
}

const FILTER_TABS: FilterTab[] = [
  { key: 'all', label: 'All', icon: LayoutTemplate, filter: {} },
  { key: 'html', label: 'HTML', icon: Code2, filter: { type: 'html' } },
  { key: 'svg', label: 'SVG', icon: PenTool, filter: { type: 'svg' } },
  { key: 'markdown', label: 'Markdown', icon: FileText, filter: { type: 'markdown' } },
  { key: 'form', label: 'Form', icon: FormInput, filter: { type: 'form' } },
  { key: 'chart', label: 'Chart', icon: BarChart3, filter: { type: 'chart' } },
  { key: 'pinned', label: 'Pinned', icon: Pin, filter: { pinned: true } },
];

// =============================================================================
// Component
// =============================================================================

export function ArtifactsPage() {
  const queryClient = useQueryClient();
  const { subscribe } = useGateway();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const currentFilter = FILTER_TABS.find((t) => t.key === activeTab)?.filter ?? {};

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['artifacts', activeTab, searchQuery],
    queryFn: () =>
      artifactsApi.list({
        ...currentFilter,
        search: searchQuery || undefined,
        limit: 50,
      }),
  });

  // WS-driven refresh
  useEffect(() => {
    const unsub = subscribe<{ entity: string }>('data:changed', (payload) => {
      if (payload.entity === 'artifact') {
        queryClient.invalidateQueries({ queryKey: ['artifacts'] });
      }
    });
    return () => { unsub(); };
  }, [subscribe, queryClient]);

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleDelete = useCallback(
    (id: string) => {
      queryClient.setQueryData<{ artifacts: Artifact[]; total: number }>(
        ['artifacts', activeTab, searchQuery],
        (old) => {
          if (!old) return old;
          return {
            artifacts: old.artifacts.filter((a) => a.id !== id),
            total: old.total - 1,
          };
        }
      );
    },
    [queryClient, activeTab, searchQuery]
  );

  const handleUpdate = useCallback(
    (updated: Artifact) => {
      queryClient.setQueryData<{ artifacts: Artifact[]; total: number }>(
        ['artifacts', activeTab, searchQuery],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            artifacts: old.artifacts.map((a) => (a.id === updated.id ? updated : a)),
          };
        }
      );
    },
    [queryClient, activeTab, searchQuery]
  );

  const artifacts = data?.artifacts ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-dark-border">
        <div>
          <h2 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">
            Artifacts
          </h2>
          <p className="text-sm text-text-muted dark:text-dark-text-muted">
            AI-generated interactive content ({total} total)
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 rounded-lg hover:bg-bg-tertiary dark:hover:bg-dark-bg-tertiary transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-text-muted" />
        </button>
      </header>

      {/* Filter tabs + search */}
      <div className="px-6 py-3 border-b border-border dark:border-dark-border flex flex-wrap items-center gap-3">
        <div className="flex gap-1 flex-wrap">
          {FILTER_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-text-secondary dark:text-dark-text-secondary hover:bg-bg-tertiary dark:hover:bg-dark-bg-tertiary'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <input
            type="text"
            placeholder="Search artifacts..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs border border-border dark:border-dark-border rounded-lg bg-bg-primary dark:bg-dark-bg-primary text-text-primary dark:text-dark-text-primary w-48 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            <SkeletonCard count={6} />
          </div>
        ) : artifacts.length === 0 ? (
          <EmptyState
            icon={LayoutTemplate}
            title="No artifacts yet"
            description={
              searchQuery
                ? 'No artifacts match your search'
                : 'Ask the AI to create charts, dashboards, forms, or visual content'
            }
          />
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {artifacts.map((artifact) => (
              <ArtifactCard
                key={artifact.id}
                artifact={artifact}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
