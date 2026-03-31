/**
 * usePinnedItems — manages the user's pinned sidebar navigation items and groups.
 *
 * Uses React Context so that all consumers (Sidebar, CustomizePage, etc.)
 * share the same state instance. PinnedItemsProvider must wrap the tree.
 *
 * Storage: localStorage[STORAGE_KEYS.SIDEBAR_PINNED] as SidebarPinnedConfig[].
 * Migrates from legacy string[] format automatically.
 */
import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { STORAGE_KEYS } from '../constants/storage-keys';

// --- Types ---

export type SidebarPinnedConfig =
  | { type: 'item'; path: string }
  | { type: 'group'; id: string; label: string; items: string[] };

export const MAX_PINNED_ITEMS = 15;

const DEFAULT_CONFIGS: SidebarPinnedConfig[] = [
  { type: 'item', path: '/' },
  { type: 'item', path: '/dashboard' },
];

// --- Storage helpers ---

function isValidConfig(v: unknown): v is SidebarPinnedConfig {
  if (!v || typeof v !== 'object') return false;
  const obj = v as Record<string, unknown>;
  if (obj.type === 'item') return typeof obj.path === 'string';
  if (obj.type === 'group') {
    return (
      typeof obj.id === 'string' &&
      typeof obj.label === 'string' &&
      Array.isArray(obj.items) &&
      obj.items.every((x: unknown) => typeof x === 'string')
    );
  }
  return false;
}

/** Migrate from legacy string[] → SidebarPinnedConfig[] */
function migrateFromStringArray(arr: string[]): SidebarPinnedConfig[] {
  return arr.map((path) => ({ type: 'item' as const, path }));
}

function runMigration(): void {
  try {
    const hasOldKey = localStorage.getItem(STORAGE_KEYS.NAV_GROUPS) !== null;
    const hasNewKey = localStorage.getItem(STORAGE_KEYS.SIDEBAR_PINNED) !== null;
    if (hasOldKey && !hasNewKey) {
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_PINNED, JSON.stringify(DEFAULT_CONFIGS));
      localStorage.removeItem(STORAGE_KEYS.NAV_GROUPS);
    }
  } catch {
    // localStorage may be unavailable
  }
}

function readPinnedConfigs(): SidebarPinnedConfig[] {
  runMigration();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SIDEBAR_PINNED);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Migration: old string[] format → new config format
        if (parsed.length > 0 && typeof parsed[0] === 'string') {
          const migrated = migrateFromStringArray(parsed as string[]);
          localStorage.setItem(STORAGE_KEYS.SIDEBAR_PINNED, JSON.stringify(migrated));
          return migrated;
        }
        // New format: validate each entry
        if (parsed.every(isValidConfig)) {
          return parsed;
        }
      }
    }
  } catch {
    // Malformed JSON — fall through to defaults
  }
  return DEFAULT_CONFIGS;
}

function persistConfigs(configs: SidebarPinnedConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_PINNED, JSON.stringify(configs));
  } catch {
    // Storage full or unavailable
  }
}

// --- Context ---

interface PinnedItemsValue {
  /** Full config array (items + groups) */
  pinnedConfigs: SidebarPinnedConfig[];
  /** Flat list of pinned item paths (backward compat for CustomizePage item checks) */
  pinnedItems: string[];
  setPinnedItems: (updater: string[] | ((prev: string[]) => string[])) => void;
  setPinnedConfigs: (updater: SidebarPinnedConfig[] | ((prev: SidebarPinnedConfig[]) => SidebarPinnedConfig[])) => void;
  addGroup: (id: string, label: string, items: string[]) => void;
  isGroupPinned: (groupId: string) => boolean;
  toggleGroup: (id: string, label: string, items: string[]) => void;
  MAX_PINNED_ITEMS: number;
}

const PinnedItemsContext = createContext<PinnedItemsValue | null>(null);

export function PinnedItemsProvider({ children }: { children: ReactNode }) {
  const [pinnedConfigs, setPinnedConfigsRaw] = useState<SidebarPinnedConfig[]>(() => readPinnedConfigs());

  const setPinnedConfigs = useCallback(
    (updater: SidebarPinnedConfig[] | ((prev: SidebarPinnedConfig[]) => SidebarPinnedConfig[])) => {
      setPinnedConfigsRaw((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        persistConfigs(next);
        return next;
      });
    },
    []
  );

  // Backward compat: flat list of item paths (excludes groups)
  const pinnedItems = useMemo(
    () => pinnedConfigs.filter((c): c is Extract<SidebarPinnedConfig, { type: 'item' }> => c.type === 'item').map((c) => c.path),
    [pinnedConfigs]
  );

  // Backward compat: setPinnedItems operates only on item-type configs
  const setPinnedItems = useCallback(
    (updater: string[] | ((prev: string[]) => string[])) => {
      setPinnedConfigs((prevConfigs) => {
        const prevPaths = prevConfigs.filter((c) => c.type === 'item').map((c) => (c as Extract<SidebarPinnedConfig, { type: 'item' }>).path);
        const nextPaths = typeof updater === 'function' ? updater(prevPaths) : updater;
        // Rebuild: keep groups in place, replace items
        const groups = prevConfigs.filter((c) => c.type === 'group');
        const items: SidebarPinnedConfig[] = nextPaths.map((path) => ({ type: 'item', path }));
        return [...items, ...groups];
      });
    },
    [setPinnedConfigs]
  );

  const isGroupPinned = useCallback(
    (groupId: string) => pinnedConfigs.some((c) => c.type === 'group' && c.id === groupId),
    [pinnedConfigs]
  );

  const addGroup = useCallback(
    (id: string, label: string, items: string[]) => {
      setPinnedConfigs((prev) => {
        if (prev.length >= MAX_PINNED_ITEMS) return prev;
        if (prev.some((c) => c.type === 'group' && c.id === id)) return prev;
        return [...prev, { type: 'group', id, label, items }];
      });
    },
    [setPinnedConfigs]
  );

  const toggleGroup = useCallback(
    (id: string, label: string, items: string[]) => {
      setPinnedConfigs((prev) => {
        const idx = prev.findIndex((c) => c.type === 'group' && c.id === id);
        if (idx >= 0) return prev.filter((_, i) => i !== idx);
        if (prev.length >= MAX_PINNED_ITEMS) return prev;
        return [...prev, { type: 'group', id, label, items }];
      });
    },
    [setPinnedConfigs]
  );

  return (
    <PinnedItemsContext.Provider
      value={{ pinnedConfigs, pinnedItems, setPinnedItems, setPinnedConfigs, addGroup, isGroupPinned, toggleGroup, MAX_PINNED_ITEMS }}
    >
      {children}
    </PinnedItemsContext.Provider>
  );
}

export function usePinnedItems() {
  const ctx = useContext(PinnedItemsContext);
  if (!ctx) {
    throw new Error('usePinnedItems must be used within a PinnedItemsProvider');
  }
  return ctx;
}
