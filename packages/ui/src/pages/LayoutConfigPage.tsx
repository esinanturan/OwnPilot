/**
 * LayoutConfigPage — visual layout configuration for header and sidebar.
 *
 * Route: /settings/layout
 * Live preview: changes apply instantly via useLayoutConfig Context.
 */
import { useLayoutConfig } from '../hooks/useLayoutConfig';
import type { HeaderItemDisplayMode } from '../types/layout-config';
import { LayoutDashboard, Type, AlignLeft } from '../components/icons';

const DISPLAY_MODES: { mode: HeaderItemDisplayMode; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { mode: 'icon', label: 'Icon', icon: LayoutDashboard, description: 'Compact — icons only' },
  { mode: 'icon-text', label: 'Icon + Text', icon: AlignLeft, description: 'Icons with labels' },
  { mode: 'text', label: 'Text', icon: Type, description: 'Labels only, no icons' },
];

export function LayoutConfigPage() {
  const { config, setHeaderDisplayMode } = useLayoutConfig();
  const currentMode = config.header.itemDisplayMode;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary dark:text-dark-text-primary">
          Layout Configuration
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-dark-text-secondary">
          Customize how your header and sidebar look. Changes apply instantly.
        </p>
      </div>

      {/* Header section */}
      <section className="space-y-4">
        <h2 className="text-base font-medium text-text-primary dark:text-dark-text-primary border-b border-border dark:border-dark-border pb-2">
          Header
        </h2>

        {/* Display mode */}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium text-text-primary dark:text-dark-text-primary">
              Item Display Mode
            </h3>
            <p className="text-xs text-text-muted dark:text-dark-text-muted mt-0.5">
              How pinned items appear in the header bar
            </p>
          </div>

          <div className="flex gap-2">
            {DISPLAY_MODES.map(({ mode, label, icon: ModeIcon, description }) => (
              <button
                key={mode}
                onClick={() => setHeaderDisplayMode(mode)}
                className={`flex-1 flex flex-col items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  currentMode === mode
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border dark:border-dark-border text-text-secondary dark:text-dark-text-secondary hover:border-primary/50 hover:bg-bg-tertiary dark:hover:bg-dark-bg-tertiary'
                }`}
              >
                <ModeIcon className="w-5 h-5" />
                <span className="text-sm font-medium">{label}</span>
                <span className="text-[10px] opacity-60">{description}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Sidebar section (placeholder) */}
      <section className="space-y-4">
        <h2 className="text-base font-medium text-text-primary dark:text-dark-text-primary border-b border-border dark:border-dark-border pb-2">
          Sidebar
        </h2>
        <p className="text-sm text-text-muted dark:text-dark-text-muted italic">
          Sidebar customization options coming soon — width, density, and default collapse state.
        </p>
      </section>

      {/* Info note */}
      <div className="text-xs text-text-muted dark:text-dark-text-muted bg-bg-tertiary dark:bg-dark-bg-tertiary rounded-lg px-4 py-3">
        Layout settings are saved to this device. Header items are only visible on desktop.
      </div>
    </div>
  );
}
