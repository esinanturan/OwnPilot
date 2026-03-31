/**
 * LayoutConfigPage — interactive layout configuration with visual wireframe.
 *
 * Route: /settings/layout
 *
 * Top: clickable mini layout wireframe (header zones + body areas)
 * Middle: zone-specific settings panel (display mode, entries, add/remove)
 * Bottom: global settings (theme, reset)
 *
 * Pattern: Soybean Admin layout thumbnails + Shopify Preview Inspector
 * Changes apply instantly via Context state → live preview.
 */
import { useState } from 'react';
import { LayoutWireframe, type WireframeZone } from '../components/LayoutWireframe';
import { ZoneEditor } from '../components/ZoneEditor';
import { useLayoutConfig } from '../hooks/useLayoutConfig';
import { useTheme } from '../hooks/useTheme';
import { DEFAULT_LAYOUT_CONFIG } from '../types/layout-config';
import { RotateCcw, Sun, Moon, Monitor, Palette } from '../components/icons';

type ThemeOption = 'system' | 'light' | 'dark' | 'claude';

const THEME_OPTIONS: { value: ThemeOption; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'claude', label: 'Claude', icon: Palette },
];

export function LayoutConfigPage() {
  const [selectedZone, setSelectedZone] = useState<WireframeZone | null>(null);
  const { setConfig } = useLayoutConfig();
  const { theme, setTheme } = useTheme();

  const handleReset = () => {
    setConfig(DEFAULT_LAYOUT_CONFIG);
    setSelectedZone(null);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary">
          Layout Configuration
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-dark-text-secondary">
          Click a zone to configure it. Changes apply instantly.
        </p>
      </div>

      {/* Interactive wireframe */}
      <LayoutWireframe selectedZone={selectedZone} onZoneSelect={setSelectedZone} />

      {/* Zone editor (shown when a zone is selected) */}
      {selectedZone && <ZoneEditor zone={selectedZone} />}

      {/* Global settings */}
      <section className="space-y-4 pt-2">
        <h2 className="text-sm font-medium text-text-primary dark:text-dark-text-primary border-b border-border dark:border-dark-border pb-2">
          Global Settings
        </h2>

        {/* Theme selector */}
        <div className="space-y-2">
          <p className="text-xs text-text-muted dark:text-dark-text-muted">Theme</p>
          <div className="flex gap-1">
            {THEME_OPTIONS.map(({ value, label, icon: ThemeIcon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  theme === value
                    ? 'bg-primary text-white'
                    : 'bg-bg-tertiary dark:bg-dark-bg-tertiary text-text-secondary dark:text-dark-text-secondary hover:bg-primary/10 hover:text-primary'
                }`}
              >
                <ThemeIcon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Reset */}
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-text-muted dark:text-dark-text-muted hover:text-error hover:bg-error/10 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset Layout to Defaults
        </button>
      </section>

      {/* Info note */}
      <div className="text-xs text-text-muted dark:text-dark-text-muted bg-bg-tertiary dark:bg-dark-bg-tertiary rounded-lg px-4 py-3">
        Layout settings are saved to this device. Header zones are only visible on desktop.
      </div>
    </div>
  );
}
