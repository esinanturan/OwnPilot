import type {
  FleetScheduleType,
  FleetSessionState,
  FleetWorkerType,
} from '../../api/endpoints/fleet';
import { Bot, Terminal, Globe, Server, Brain } from '../../components/icons';

export function getStateBadge(state: FleetSessionState | null): string {
  switch (state) {
    case 'running':
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    case 'paused':
      return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
    case 'error':
      return 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30';
    case 'stopped':
      return 'bg-zinc-500/15 text-zinc-500 dark:text-zinc-400 border-zinc-500/30';
    case 'completed':
      return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';
    default:
      return 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20';
  }
}

export function getWorkerTypeIcon(type: FleetWorkerType) {
  switch (type) {
    case 'ai-chat':
      return Bot;
    case 'coding-cli':
      return Terminal;
    case 'api-call':
      return Globe;
    case 'mcp-bridge':
      return Server;
    case 'claw':
      return Brain;
  }
}

export function getWorkerTypeLabel(type: FleetWorkerType): string {
  switch (type) {
    case 'ai-chat':
      return 'AI Chat';
    case 'coding-cli':
      return 'Coding CLI';
    case 'api-call':
      return 'API Call';
    case 'mcp-bridge':
      return 'MCP Bridge';
    case 'claw':
      return 'Claw Agent';
  }
}

export function getWorkerTypeColor(type: FleetWorkerType): string {
  switch (type) {
    case 'ai-chat':
      return 'text-violet-500 bg-violet-500/10 border-violet-500/20';
    case 'coding-cli':
      return 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20';
    case 'api-call':
      return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    case 'mcp-bridge':
      return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
    case 'claw':
      return 'text-teal-500 bg-teal-500/10 border-teal-500/20';
  }
}

export function getScheduleLabel(type: FleetScheduleType): string {
  switch (type) {
    case 'continuous':
      return 'Continuous';
    case 'interval':
      return 'Interval';
    case 'cron':
      return 'Cron';
    case 'event':
      return 'Event-driven';
    case 'on-demand':
      return 'On-demand';
  }
}

export function getTaskStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'text-success';
    case 'running':
      return 'text-info';
    case 'failed':
      return 'text-error';
    case 'cancelled':
      return 'text-text-tertiary dark:text-dark-text-tertiary';
    default:
      return 'text-warning';
  }
}

export function formatCost(cost: number): string {
  return cost < 0.01 ? `$${cost.toFixed(4)}` : `$${cost.toFixed(2)}`;
}
