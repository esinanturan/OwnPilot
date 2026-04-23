import type { ClawConfig } from '../../api/endpoints/claws';
import { Plus, Activity, Zap, Brain, Bot, Terminal, Send } from '../../components/icons';

export function ClawHomeTab({
  claws,
  onCreateClaw,
  onViewClaws,
}: {
  claws: ClawConfig[];
  onCreateClaw: () => void;
  onViewClaws: () => void;
}) {
  const totalCycles = claws.reduce((s, c) => s + (c.session?.cyclesCompleted ?? 0), 0);
  const totalToolCalls = claws.reduce((s, c) => s + (c.session?.totalToolCalls ?? 0), 0);
  const totalCost = claws.reduce((s, c) => s + (c.session?.totalCostUsd ?? 0), 0);
  const runningCount = claws.filter(
    (c) => c.session?.state === 'running' || c.session?.state === 'starting'
  ).length;

  const CAPABILITIES = [
    {
      icon: Brain,
      color: 'text-blue-500 bg-blue-500/10',
      title: 'LLM Brain',
      items: [
        'Full LLM reasoning per cycle',
        'Memory injection from past cycles',
        'Soul identity for personality',
        'Provider/model per claw',
      ],
    },
    {
      icon: Terminal,
      color: 'text-emerald-500 bg-emerald-500/10',
      title: 'Code Execution',
      items: [
        'Python, JavaScript, Shell scripts',
        'Docker sandbox (256MB, isolated)',
        'Local fallback execution',
        'Install npm/pip packages on the fly',
      ],
    },
    {
      icon: Bot,
      color: 'text-purple-500 bg-purple-500/10',
      title: 'CLI & Coding Agents',
      items: [
        'Install & run ANY CLI tool',
        'Claude Code / Codex / Gemini CLI',
        'Multi-step orchestrated coding',
        'git, docker, curl, ffmpeg...',
      ],
    },
    {
      icon: Activity,
      color: 'text-cyan-500 bg-cyan-500/10',
      title: 'Browser Automation',
      items: [
        'Headless Chromium navigation',
        'Click, type, fill forms',
        'Screenshot capture',
        'Structured data extraction',
      ],
    },
    {
      icon: Zap,
      color: 'text-amber-500 bg-amber-500/10',
      title: 'Self-Provisioning',
      items: [
        'Create ephemeral tools at runtime',
        'Spawn sub-claws (3 levels deep)',
        'Publish artifacts (HTML/SVG/MD)',
        'Request escalation when needed',
      ],
    },
    {
      icon: Send,
      color: 'text-pink-500 bg-pink-500/10',
      title: 'Output Delivery',
      items: [
        'Telegram notifications',
        'Real-time WebSocket feed',
        'Conversation history storage',
        'Final report with artifact',
      ],
    },
  ];

  const MODES = [
    {
      name: 'Single-shot',
      desc: 'One execution, one result. Perfect for tasks with clear deliverables.',
      color: 'bg-blue-500',
    },
    {
      name: 'Continuous',
      desc: 'Adaptive loop — speeds up when active, slows when idle. For ongoing work.',
      color: 'bg-emerald-500',
    },
    {
      name: 'Interval',
      desc: 'Fixed interval between cycles (e.g., every 5 minutes). For periodic checks.',
      color: 'bg-amber-500',
    },
    {
      name: 'Event-driven',
      desc: 'Waits for system events, then executes. For reactive automation.',
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto animate-fade-in-up">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-purple-500/5 to-emerald-500/5 px-8 py-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Zap className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">
                Claw Agents
              </h2>
              <p className="text-sm text-text-muted dark:text-dark-text-muted">
                Autonomous agents with unlimited capabilities
              </p>
            </div>
          </div>
          <p className="text-text-secondary dark:text-dark-text-secondary mt-3 max-w-2xl leading-relaxed">
            Each Claw is a fully autonomous agent with its own workspace, 250+ tools, CLI access,
            browser automation, coding agents, and script execution. Give it a mission and let it
            work.
          </p>
          <div className="flex gap-3 mt-6">
            <button
              onClick={onCreateClaw}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Create Claw
            </button>
            {claws.length > 0 && (
              <button
                onClick={onViewClaws}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border dark:border-dark-border text-text-primary dark:text-dark-text-primary font-medium hover:bg-bg-secondary dark:hover:bg-dark-bg-secondary transition-colors"
              >
                <Activity className="w-4 h-4" /> View Claws ({claws.length})
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-6 space-y-8">
        {/* Live Stats */}
        {claws.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: 'Active Claws',
                value: runningCount,
                sub: `of ${claws.length} total`,
                color: 'text-green-500',
              },
              {
                label: 'Total Cycles',
                value: totalCycles.toLocaleString(),
                sub: 'executions',
                color: 'text-blue-500',
              },
              {
                label: 'Tool Calls',
                value: totalToolCalls.toLocaleString(),
                sub: 'across all claws',
                color: 'text-purple-500',
              },
              {
                label: 'Total Cost',
                value: `$${totalCost.toFixed(2)}`,
                sub: 'USD spent',
                color: 'text-amber-500',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-bg-secondary dark:bg-dark-bg-secondary border border-border dark:border-dark-border rounded-xl p-4"
              >
                <p className="text-xs text-text-muted dark:text-dark-text-muted uppercase tracking-wider">
                  {stat.label}
                </p>
                <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-text-muted dark:text-dark-text-muted mt-0.5">
                  {stat.sub}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Capabilities Grid */}
        <div>
          <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary mb-4">
            What Can a Claw Do?
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CAPABILITIES.map((cap) => (
              <div
                key={cap.title}
                className="bg-bg-primary dark:bg-dark-bg-primary border border-border dark:border-dark-border rounded-xl p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div
                    className={`w-8 h-8 rounded-lg ${cap.color} flex items-center justify-center`}
                  >
                    <cap.icon className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">
                    {cap.title}
                  </h4>
                </div>
                <ul className="space-y-1">
                  {cap.items.map((item) => (
                    <li
                      key={item}
                      className="text-xs text-text-secondary dark:text-dark-text-secondary flex items-start gap-1.5"
                    >
                      <span className="text-primary mt-0.5 shrink-0">-</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Execution Modes */}
        <div>
          <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary mb-4">
            Execution Modes
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {MODES.map((mode) => (
              <div
                key={mode.name}
                className="flex items-start gap-3 bg-bg-secondary dark:bg-dark-bg-secondary rounded-xl p-4 border border-border dark:border-dark-border"
              >
                <div className={`w-2 h-2 rounded-full ${mode.color} mt-1.5 shrink-0`} />
                <div>
                  <h4 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">
                    {mode.name}
                  </h4>
                  <p className="text-xs text-text-muted dark:text-dark-text-muted mt-0.5">
                    {mode.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div>
          <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary mb-4">
            How It Works
          </h3>
          <div className="relative">
            {[
              {
                step: '1',
                title: 'Define Mission & Configure',
                desc: 'Set a mission, pick a mode (single-shot, continuous, interval, event), assign skills, choose provider/model, and set limits.',
              },
              {
                step: '2',
                title: 'Claw Gets Its Environment',
                desc: 'An isolated workspace is created. All 250+ tools are registered. Skills are filtered. The claw gets a unique conversation context.',
              },
              {
                step: '3',
                title: 'Autonomous Execution',
                desc: 'The claw runs cycles autonomously — using tools, installing packages, browsing the web, running scripts, creating sub-claws. No hand-holding needed.',
              },
              {
                step: '4',
                title: 'Live Output & Final Report',
                desc: 'Progress is sent to you via Telegram and the live output feed. When done, a comprehensive report is published as an artifact.',
              },
            ].map((item, i) => (
              <div key={item.step} className="flex gap-4 mb-4 last:mb-0">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">
                    {item.step}
                  </div>
                  {i < 3 && <div className="w-px flex-1 bg-border dark:bg-dark-border mt-1" />}
                </div>
                <div className="pb-4">
                  <h4 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">
                    {item.title}
                  </h4>
                  <p className="text-xs text-text-muted dark:text-dark-text-muted mt-1 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
