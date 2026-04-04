/**
 * Sidebar Data Section Registry — declarative configuration for all data sections.
 *
 * Each entry defines how a sidebar section fetches, renders, and navigates.
 * Used by SidebarDataSection component for generic accordion/flat rendering.
 * Recents is NOT in this registry — it has custom UI (search, filters, date groups).
 *
 * Adding a new data section:
 * 1. Add entry here with fetchItems, icon, route, group
 * 2. Add section ID to SidebarSectionId union in layout-config.ts
 * 3. Add to DEFAULT_SIDEBAR_SECTIONS + SIDEBAR_SECTION_LABELS
 * 4. Section auto-renders in sidebar via registry lookup
 */
import type { ComponentType, SVGProps } from 'react';
import { FolderOpen, GitBranch } from '../components/icons';
import { fileWorkspacesApi, workflowsApi } from '../api';

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

/** Generic sidebar item shape — all registry items normalize to this */
export interface SidebarItem {
  id: string;
  label: string;
  route: string;
}

/** Section group for visual grouping in ZoneEditor */
export type SidebarSectionGroup = 'core' | 'data' | 'ai' | 'tools' | 'personal' | 'system';

export interface SidebarDataSectionDef {
  id: string;
  icon: IconComponent;
  route: string;
  group: SidebarSectionGroup;
  maxItems: number;
  /** Fetch items from API — returns normalized SidebarItem[] */
  fetchItems: () => Promise<SidebarItem[]>;
  /** Whether to show the + button in accordion header (navigates to route) */
  showPlus: boolean;
}

/** Registry of all data sections — keyed by section ID */
export const SIDEBAR_DATA_SECTIONS: Record<string, SidebarDataSectionDef> = {
  workspaces: {
    id: 'workspaces',
    icon: FolderOpen,
    route: '/workspaces',
    group: 'data',
    maxItems: 5,
    showPlus: true,
    fetchItems: () =>
      fileWorkspacesApi.list().then((res) =>
        (res.workspaces ?? []).slice(0, 5).map((p) => ({
          id: p.id,
          label: p.name,
          route: `/workspaces?id=${p.id}`,
        }))
      ),
  },
  workflows: {
    id: 'workflows',
    icon: GitBranch,
    route: '/workflows',
    group: 'data',
    maxItems: 5,
    showPlus: true,
    fetchItems: () =>
      workflowsApi.list({ limit: '5' }).then((res) =>
        (res.workflows ?? []).map((wf) => ({
          id: wf.id,
          label: wf.name,
          route: `/workflows/${wf.id}`,
        }))
      ),
  },
};

/** Group labels for ZoneEditor visual grouping */
export const SECTION_GROUP_LABELS: Record<SidebarSectionGroup, string> = {
  core: 'Core',
  data: 'Data',
  ai: 'AI & Automation',
  tools: 'Tools & Extensions',
  personal: 'Personal',
  system: 'System',
};

/** Which group each built-in static section belongs to */
export const STATIC_SECTION_GROUPS: Record<string, SidebarSectionGroup> = {
  pinned: 'core',
  search: 'core',
  scheduled: 'core',
  customize: 'core',
  recents: 'data',
};

/** Check if a section ID is a registry-backed data section */
export function isDataSection(sectionId: string): boolean {
  return sectionId in SIDEBAR_DATA_SECTIONS;
}

/** Get the group for any section (static or data) */
export function getSectionGroup(sectionId: string): SidebarSectionGroup {
  if (sectionId in STATIC_SECTION_GROUPS) return STATIC_SECTION_GROUPS[sectionId]!;
  const def = SIDEBAR_DATA_SECTIONS[sectionId];
  if (def) return def.group;
  return 'system'; // fallback for unknown sections
}
