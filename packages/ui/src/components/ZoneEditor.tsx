/**
 * ZoneEditor — settings panel for a selected wireframe zone.
 *
 * Shows display mode selector, entry list with remove buttons,
 * and add item/group controls for header zones.
 * Shows "coming soon" placeholder for non-header zones.
 */
import { useState } from 'react';
import { useLayoutConfig } from '../hooks/useLayoutConfig';
import { ALL_NAV_ITEMS, NAV_ITEM_MAP, navGroups } from '../constants/nav-items';
import { LayoutDashboard, AlignLeft, Type, X, Plus, ChevronDown } from './icons';
import type { WireframeZone } from './LayoutWireframe';
import type { HeaderZoneId, HeaderItemDisplayMode, HeaderZoneEntry } from '../types/layout-config';

const ZONE_LABELS: Record<WireframeZone, string> = {
  'header-brand': 'Header — Brand',
  'header-left': 'Header — Left Zone',
  'header-center': 'Header — Center Zone',
  'header-right': 'Header — Right Zone',
  'header-settings': 'Header — Settings',
  sidebar: 'Sidebar',
  content: 'Content Area',
  'stats-panel': 'Stats Panel',
};

const HEADER_ZONE_MAP: Record<string, HeaderZoneId> = {
  'header-left': 'left',
  'header-center': 'center',
  'header-right': 'right',
};

const DISPLAY_MODES: { mode: HeaderItemDisplayMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { mode: 'icon', label: 'Icon', icon: LayoutDashboard },
  { mode: 'icon-text', label: 'Icon+Text', icon: AlignLeft },
  { mode: 'text', label: 'Text', icon: Type },
];

function isEditableHeaderZone(zone: WireframeZone): zone is 'header-left' | 'header-center' | 'header-right' {
  return zone in HEADER_ZONE_MAP;
}

export function ZoneEditor({ zone }: { zone: WireframeZone }) {
  const { getZone, setZoneDisplayMode, addZoneEntry, removeZoneEntry } = useLayoutConfig();
  const [addMenuOpen, setAddMenuOpen] = useState<'item' | 'group' | null>(null);

  const label = ZONE_LABELS[zone];

  // Non-editable zones
  if (!isEditableHeaderZone(zone)) {
    return (
      <div className="rounded-lg border border-border dark:border-dark-border p-4">
        <h3 className="text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2">{label}</h3>
        {zone === 'header-brand' && (
          <p className="text-xs text-text-muted dark:text-dark-text-muted">
            Displays the application name. Brand customization coming soon.
          </p>
        )}
        {zone === 'header-settings' && (
          <p className="text-xs text-text-muted dark:text-dark-text-muted">
            Fixed zone — shows connection status and settings icon. Not configurable.
          </p>
        )}
        {(zone === 'sidebar' || zone === 'content' || zone === 'stats-panel') && (
          <p className="text-xs text-text-muted dark:text-dark-text-muted italic">
            {label} customization options coming soon — width, density, visibility.
          </p>
        )}
      </div>
    );
  }

  // Editable header zone
  const zoneId = HEADER_ZONE_MAP[zone]!;
  const zoneConfig = getZone(zoneId);
  const currentMode = zoneConfig.displayMode;

  // Items already in this zone (for filtering add menus)
  const usedPaths = new Set(zoneConfig.entries.filter((e) => e.type === 'item').map((e) => (e as { path: string }).path));
  const usedGroupIds = new Set(zoneConfig.entries.filter((e) => e.type === 'group').map((e) => (e as { id: string }).id));

  const availableItems = ALL_NAV_ITEMS.filter((item) => !usedPaths.has(item.to));
  const availableGroups = navGroups.filter((g) => !usedGroupIds.has(g.id));

  const handleAddItem = (path: string) => {
    addZoneEntry(zoneId, { type: 'item', path });
    setAddMenuOpen(null);
  };

  const handleAddGroup = (group: typeof navGroups[number]) => {
    addZoneEntry(zoneId, { type: 'group', id: group.id, label: group.label, items: group.items.map((i) => i.to) });
    setAddMenuOpen(null);
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 dark:bg-primary/5 p-4 space-y-4">
      {/* Zone title */}
      <h3 className="text-sm font-medium text-primary">{label}</h3>

      {/* Display mode */}
      <div className="space-y-2">
        <p className="text-xs text-text-muted dark:text-dark-text-muted">Display Mode</p>
        <div className="flex gap-1">
          {DISPLAY_MODES.map(({ mode, label: modeLabel, icon: ModeIcon }) => (
            <button
              key={mode}
              onClick={() => setZoneDisplayMode(zoneId, mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                currentMode === mode
                  ? 'bg-primary text-white'
                  : 'bg-bg-tertiary dark:bg-dark-bg-tertiary text-text-secondary dark:text-dark-text-secondary hover:bg-primary/10 hover:text-primary'
              }`}
            >
              <ModeIcon className="w-3 h-3" />
              {modeLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Entries list */}
      <div className="space-y-2">
        <p className="text-xs text-text-muted dark:text-dark-text-muted">
          Entries ({zoneConfig.entries.length})
        </p>

        {zoneConfig.entries.length === 0 ? (
          <p className="text-xs text-text-muted dark:text-dark-text-muted italic py-2">
            No entries yet — add items or groups below.
          </p>
        ) : (
          <div className="space-y-1">
            {zoneConfig.entries.map((entry, i) => {
              let entryLabel = '';
              let EntryIcon: React.ComponentType<{ className?: string }> | null = null;

              if (entry.type === 'item') {
                const navItem = NAV_ITEM_MAP.get(entry.path);
                entryLabel = navItem?.label ?? entry.path;
                EntryIcon = navItem?.icon ?? null;
              } else if (entry.type === 'group') {
                entryLabel = `${entry.label} (${entry.items.length} items)`;
              }

              return (
                <div
                  key={entry.type === 'item' ? entry.path : entry.type === 'group' ? entry.id : `widget-${i}`}
                  className="flex items-center gap-2 px-2 py-1 rounded bg-bg-secondary dark:bg-dark-bg-secondary text-xs"
                >
                  {EntryIcon && <EntryIcon className="w-3.5 h-3.5 shrink-0 text-text-secondary dark:text-dark-text-secondary" />}
                  {entry.type === 'group' && <ChevronDown className="w-3 h-3 shrink-0 text-text-muted dark:text-dark-text-muted" />}
                  <span className="flex-1 truncate text-text-primary dark:text-dark-text-primary">{entryLabel}</span>
                  <span className="text-[9px] text-text-muted dark:text-dark-text-muted uppercase">{entry.type}</span>
                  <button
                    onClick={() => removeZoneEntry(zoneId, i)}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-error/10 hover:text-error transition-colors text-text-muted dark:text-dark-text-muted"
                    title="Remove"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add buttons */}
      <div className="flex gap-2 relative">
        <div className="relative">
          <button
            onClick={() => setAddMenuOpen(addMenuOpen === 'item' ? null : 'item')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-bg-tertiary dark:bg-dark-bg-tertiary text-text-secondary dark:text-dark-text-secondary hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <Plus className="w-3 h-3" /> Add Item
          </button>
          {addMenuOpen === 'item' && (
            <div className="absolute top-full left-0 mt-1 min-w-[200px] max-h-[200px] overflow-y-auto py-1 rounded-lg border border-border dark:border-dark-border bg-bg-secondary dark:bg-dark-bg-secondary shadow-lg z-50">
              {availableItems.length === 0 ? (
                <p className="px-3 py-2 text-xs text-text-muted dark:text-dark-text-muted italic">All items already added</p>
              ) : (
                availableItems.slice(0, 20).map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.to}
                      onClick={() => handleAddItem(item.to)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary dark:text-dark-text-primary hover:bg-bg-tertiary dark:hover:bg-dark-bg-tertiary transition-colors"
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setAddMenuOpen(addMenuOpen === 'group' ? null : 'group')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-bg-tertiary dark:bg-dark-bg-tertiary text-text-secondary dark:text-dark-text-secondary hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <Plus className="w-3 h-3" /> Add Group
          </button>
          {addMenuOpen === 'group' && (
            <div className="absolute top-full left-0 mt-1 min-w-[200px] max-h-[200px] overflow-y-auto py-1 rounded-lg border border-border dark:border-dark-border bg-bg-secondary dark:bg-dark-bg-secondary shadow-lg z-50">
              {availableGroups.length === 0 ? (
                <p className="px-3 py-2 text-xs text-text-muted dark:text-dark-text-muted italic">All groups already added</p>
              ) : (
                availableGroups.map((group) => {
                  const GIcon = group.icon;
                  return (
                    <button
                      key={group.id}
                      onClick={() => handleAddGroup(group)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-primary dark:text-dark-text-primary hover:bg-bg-tertiary dark:hover:bg-dark-bg-tertiary transition-colors"
                    >
                      <GIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{group.label}</span>
                      <span className="ml-auto text-[9px] text-text-muted dark:text-dark-text-muted">{group.items.length}</span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
