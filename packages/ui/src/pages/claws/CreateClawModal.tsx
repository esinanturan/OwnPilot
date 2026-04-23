import { useState, useEffect } from 'react';
import { useToast } from '../../components/ToastProvider';
import { clawsApi } from '../../api/endpoints/claws';
import { X, ChevronDown, ChevronRight } from '../../components/icons';

const CLAW_TEMPLATES: Array<{
  name: string;
  icon: string;
  mission: string;
  mode: 'continuous' | 'interval' | 'event' | 'single-shot';
  sandbox: 'auto' | 'docker' | 'local';
  codingAgent?: string;
  description: string;
}> = [
  {
    name: 'Research Agent',
    icon: '🔍',
    mission:
      'Research the given topic thoroughly using web search, browse relevant pages, extract key information, and compile a comprehensive report with sources.',
    mode: 'single-shot',
    sandbox: 'auto',
    description: 'Web research with final report',
  },
  {
    name: 'Code Reviewer',
    icon: '🔎',
    mission:
      'Review the codebase for quality issues, security vulnerabilities, performance problems, and best practice violations. Use CLI tools (eslint, tsc) and coding agents to analyze. Produce a detailed review report.',
    mode: 'single-shot',
    sandbox: 'local',
    codingAgent: 'claude-code',
    description: 'Deep code review with CLI tools',
  },
  {
    name: 'Data Analyst',
    icon: '📊',
    mission:
      'Analyze the provided data using Python scripts. Install necessary packages (pandas, matplotlib), process data, generate charts as artifacts, and write an analysis report.',
    mode: 'single-shot',
    sandbox: 'docker',
    description: 'Python-powered data analysis',
  },
  {
    name: 'Monitor & Alert',
    icon: '🔔',
    mission:
      'Periodically check the specified URLs/APIs for availability, response time, and content changes. Send alerts via claw_send_output when issues are detected.',
    mode: 'interval',
    sandbox: 'auto',
    description: 'Periodic health checks with alerts',
  },
  {
    name: 'Content Creator',
    icon: '✍️',
    mission:
      'Create high-quality content based on the brief. Research the topic, write drafts, refine, and publish final content as artifacts. Support HTML, Markdown, and SVG formats.',
    mode: 'single-shot',
    sandbox: 'auto',
    description: 'Write and publish content',
  },
  {
    name: 'Event Reactor',
    icon: '⚡',
    mission:
      'Listen for system events and react intelligently. Process incoming data, make decisions, update goals, and coordinate with other claws via messaging.',
    mode: 'event',
    sandbox: 'auto',
    description: 'Event-driven reactive automation',
  },
];

export function CreateClawModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [mission, setMission] = useState('');
  const [mode, setMode] = useState<'continuous' | 'interval' | 'event' | 'single-shot'>(
    'single-shot'
  );
  const [sandbox, setSandbox] = useState<'auto' | 'docker' | 'local'>('auto');
  const [eventFilters, setEventFilters] = useState('');
  const [codingAgent, setCodingAgent] = useState('');
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [availableSkills, setAvailableSkills] = useState<
    Array<{ id: string; name: string; description?: string; toolCount: number }>
  >([]);
  const [createModels, setCreateModels] = useState<
    Array<{ id: string; name: string; provider: string; recommended?: boolean }>
  >([]);
  const [createProviders, setCreateProviders] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    import('../../api/endpoints/models')
      .then(({ modelsApi }) =>
        modelsApi.list().then((data) => {
          setCreateModels(data.models);
          setCreateProviders(data.configuredProviders);
        })
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const { extensionsApi } = await import('../../api/endpoints/extensions');
        const exts = await extensionsApi.list({ status: 'enabled' });
        setAvailableSkills(
          exts.map((e) => ({
            id: e.id,
            name: e.name,
            description: e.description,
            toolCount: e.toolCount,
          }))
        );
      } catch {
        // Skills may not be available
      }
    };
    load();
  }, []);

  const toggleSkill = (id: string) => {
    setSelectedSkills((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const handleSubmit = async () => {
    if (!name.trim() || !mission.trim()) {
      toast.error('Name and mission are required');
      return;
    }
    setIsSubmitting(true);
    try {
      await clawsApi.create({
        name: name.trim(),
        mission: mission.trim(),
        mode,
        sandbox,
        provider: provider || undefined,
        model: model || undefined,
        coding_agent_provider: codingAgent || undefined,
        skills: selectedSkills.length > 0 ? selectedSkills : undefined,
        event_filters:
          mode === 'event' && eventFilters.trim()
            ? eventFilters
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : undefined,
      });
      toast.success('Claw created');
      onCreated();
    } catch {
      toast.error('Failed to create claw');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 text-sm rounded-lg border border-border dark:border-dark-border bg-bg-secondary dark:bg-dark-bg-secondary text-text-primary dark:text-dark-text-primary';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
      <div className="bg-bg-primary dark:bg-dark-bg-primary rounded-xl shadow-xl border border-border dark:border-dark-border w-full max-w-xl mx-4 p-6 animate-fade-in-up max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">
            Create Claw
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-bg-tertiary dark:hover:bg-dark-bg-tertiary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Templates */}
          <div>
            <label className="block text-sm font-medium text-text-secondary dark:text-dark-text-secondary mb-2">
              Start from template
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CLAW_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.name}
                  type="button"
                  onClick={() => {
                    setName(tpl.name);
                    setMission(tpl.mission);
                    setMode(tpl.mode);
                    setSandbox(tpl.sandbox);
                    if (tpl.codingAgent) setCodingAgent(tpl.codingAgent);
                  }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all text-center ${
                    name === tpl.name
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border dark:border-dark-border hover:border-primary/40 hover:bg-bg-secondary dark:hover:bg-dark-bg-secondary'
                  }`}
                >
                  <span className="text-xl">{tpl.icon}</span>
                  <span className="text-xs font-medium text-text-primary dark:text-dark-text-primary">
                    {tpl.name}
                  </span>
                  <span className="text-[10px] text-text-muted dark:text-dark-text-muted leading-tight">
                    {tpl.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-border dark:border-dark-border" />
            <span className="text-xs text-text-muted dark:text-dark-text-muted">or customize</span>
            <div className="flex-1 border-t border-border dark:border-dark-border" />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-text-secondary dark:text-dark-text-secondary mb-1">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Market Research Agent"
              className={inputClass}
            />
          </div>

          {/* Mission */}
          <div>
            <label className="block text-sm font-medium text-text-secondary dark:text-dark-text-secondary mb-1">
              Mission
            </label>
            <textarea
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              placeholder="Describe what this claw should accomplish..."
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Mode + Sandbox */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary dark:text-dark-text-secondary mb-1">
                Mode
              </label>
              <select
                value={mode}
                onChange={(e) =>
                  setMode(e.target.value as 'continuous' | 'interval' | 'event' | 'single-shot')
                }
                className={inputClass}
              >
                <option value="single-shot">Single-shot</option>
                <option value="continuous">Continuous</option>
                <option value="interval">Interval</option>
                <option value="event">Event-driven</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary dark:text-dark-text-secondary mb-1">
                Sandbox
              </label>
              <select
                value={sandbox}
                onChange={(e) => setSandbox(e.target.value as 'auto' | 'docker' | 'local')}
                className={inputClass}
              >
                <option value="auto">Auto</option>
                <option value="docker">Docker</option>
                <option value="local">Local</option>
              </select>
            </div>
          </div>

          {/* Mode description */}
          <p className="text-xs text-text-muted dark:text-dark-text-muted -mt-2">
            {mode === 'single-shot' && 'Runs once, completes, and stops.'}
            {mode === 'continuous' &&
              'Fast adaptive loop — speeds up when active, slows when idle.'}
            {mode === 'interval' && 'Fixed interval between cycles (default 5 min).'}
            {mode === 'event' && 'Waits for events, then runs a cycle. Requires event filters.'}
          </p>

          {/* Event Filters (only for event mode) */}
          {mode === 'event' && (
            <div>
              <label className="block text-sm font-medium text-text-secondary dark:text-dark-text-secondary mb-1">
                Event Filters
              </label>
              <input
                value={eventFilters}
                onChange={(e) => setEventFilters(e.target.value)}
                placeholder="e.g., user.message, webhook.received, data:changed"
                className={inputClass}
              />
              <p className="text-xs text-text-muted dark:text-dark-text-muted mt-1">
                Comma-separated EventBus event types that trigger a cycle
              </p>
            </div>
          )}

          {/* Skills Picker */}
          {availableSkills.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-text-secondary dark:text-dark-text-secondary mb-1">
                Skills
                <span className="text-xs text-text-muted dark:text-dark-text-muted ml-1">
                  ({selectedSkills.length} selected)
                </span>
              </label>
              <div className="max-h-36 overflow-y-auto border border-border dark:border-dark-border rounded-lg p-2 space-y-1 bg-bg-secondary dark:bg-dark-bg-secondary">
                {availableSkills.map((skill) => (
                  <label
                    key={skill.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                      selectedSkills.includes(skill.id)
                        ? 'bg-primary/10 border border-primary/20'
                        : 'hover:bg-bg-tertiary dark:hover:bg-dark-bg-tertiary border border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSkills.includes(skill.id)}
                      onChange={() => toggleSkill(skill.id)}
                      className="w-3.5 h-3.5 rounded border-border accent-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-text-primary dark:text-dark-text-primary">
                        {skill.name}
                      </span>
                      <span className="text-xs text-text-muted dark:text-dark-text-muted ml-1">
                        ({skill.toolCount} tools)
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Advanced Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-xs text-text-muted dark:text-dark-text-muted hover:text-primary transition-colors"
          >
            {showAdvanced ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            Advanced Options
          </button>

          {/* Advanced options */}
          {showAdvanced && (
            <div className="space-y-4 pl-3 border-l-2 border-border dark:border-dark-border">
              {/* Provider / Model */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-secondary dark:text-dark-text-secondary mb-1">
                    AI Provider
                  </label>
                  <select
                    value={provider}
                    onChange={(e) => {
                      setProvider(e.target.value);
                      setModel('');
                    }}
                    className={inputClass}
                  >
                    <option value="">System Default</option>
                    {createProviders.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary dark:text-dark-text-secondary mb-1">
                    AI Model
                  </label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">System Default</option>
                    {createModels
                      .filter((m) => !provider || m.provider === provider)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                          {m.recommended ? ' *' : ''}
                          {provider ? '' : ` (${m.provider})`}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Coding Agent */}
              <div>
                <label className="block text-sm font-medium text-text-secondary dark:text-dark-text-secondary mb-1">
                  Coding Agent
                </label>
                <select
                  value={codingAgent}
                  onChange={(e) => setCodingAgent(e.target.value)}
                  className={inputClass}
                >
                  <option value="">None</option>
                  <option value="claude-code">Claude Code</option>
                  <option value="codex">Codex CLI</option>
                  <option value="gemini-cli">Gemini CLI</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-border dark:border-dark-border text-text-secondary dark:text-dark-text-secondary hover:bg-bg-tertiary dark:hover:bg-dark-bg-tertiary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
