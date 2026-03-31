/**
 * Layout configuration types.
 *
 * Controls visual presentation of header zones, sidebar, and general layout.
 * Persisted in localStorage via useLayoutConfig hook.
 * Version field enables forward-compatible migrations.
 *
 * Header has 5 zones:
 *   [Brand] | [Zone Left] [Zone Center] [Zone Right] | [Settings icon]
 * Brand and Settings are fixed. The 3 middle zones are user-configurable.
 */

export const LAYOUT_CONFIG_VERSION = 2;

/** How pinned header items render */
export type HeaderItemDisplayMode = 'icon' | 'icon-text' | 'text';

/** Identifies one of the 3 configurable header zones */
export type HeaderZoneId = 'left' | 'center' | 'right';

/** A single entry in a header zone — references useHeaderItems config by index or directly */
export type HeaderZoneEntry =
  | { type: 'item'; path: string }
  | { type: 'group'; id: string; label: string; items: string[] }
  | { type: 'widget'; widgetId: string };  // Future: pulse-slots, pomodoro, ws-status

export interface HeaderZoneConfig {
  entries: HeaderZoneEntry[];
  displayMode: HeaderItemDisplayMode;
}

export interface LayoutConfigHeader {
  /** Global fallback display mode (used when zone doesn't override) */
  itemDisplayMode: HeaderItemDisplayMode;
  /** Per-zone configuration */
  zones: Record<HeaderZoneId, HeaderZoneConfig>;
}

export interface LayoutConfigSidebar {
  // Future:
  // width: 'narrow' | 'default' | 'wide';
  // collapsedByDefault: boolean;
  // density: 'compact' | 'default' | 'comfortable';
}

export interface LayoutConfig {
  version: number;
  header: LayoutConfigHeader;
  sidebar: LayoutConfigSidebar;
}

const EMPTY_ZONE: HeaderZoneConfig = { entries: [], displayMode: 'icon' };

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  version: LAYOUT_CONFIG_VERSION,
  header: {
    itemDisplayMode: 'icon',
    zones: {
      left: { ...EMPTY_ZONE },
      center: { ...EMPTY_ZONE },
      right: { ...EMPTY_ZONE },
    },
  },
  sidebar: {},
};
