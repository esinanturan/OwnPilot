/**
 * Claws API endpoints
 */

import { apiClient } from '../client';

// =============================================================================
// Types
// =============================================================================

export type ClawMode = 'continuous' | 'interval' | 'event' | 'single-shot';

export type ClawState =
  | 'starting'
  | 'running'
  | 'paused'
  | 'waiting'
  | 'completed'
  | 'failed'
  | 'stopped'
  | 'escalation_pending';

export type ClawSandboxMode = 'docker' | 'local' | 'auto';

export interface ClawLimits {
  maxTurnsPerCycle: number;
  maxToolCallsPerCycle: number;
  maxCyclesPerHour: number;
  cycleTimeoutMs: number;
  totalBudgetUsd?: number;
}

export interface ClawEscalation {
  id: string;
  type: string;
  reason: string;
  details?: Record<string, unknown>;
  requestedAt: string;
}

export interface ClawSession {
  state: ClawState;
  cyclesCompleted: number;
  totalToolCalls: number;
  totalCostUsd: number;
  lastCycleAt: string | null;
  lastCycleDurationMs: number | null;
  lastCycleError: string | null;
  startedAt: string;
  stoppedAt: string | null;
  artifacts: string[];
  pendingEscalation: ClawEscalation | null;
}

export interface ClawConfig {
  id: string;
  userId: string;
  name: string;
  mission: string;
  mode: ClawMode;
  allowedTools: string[];
  limits: ClawLimits;
  intervalMs?: number;
  eventFilters?: string[];
  autoStart: boolean;
  stopCondition?: string;
  provider?: string;
  model?: string;
  workspaceId?: string;
  soulId?: string;
  parentClawId?: string;
  depth: number;
  sandbox: ClawSandboxMode;
  codingAgentProvider?: string;
  skills?: string[];
  createdBy: 'user' | 'ai' | 'claw';
  createdAt: string;
  updatedAt: string;
  session: ClawSession | null;
}

export interface ClawToolCall {
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
  success: boolean;
  durationMs: number;
}

export interface ClawHistoryEntry {
  id: string;
  clawId: string;
  cycleNumber: number;
  entryType: 'cycle' | 'escalation';
  success: boolean;
  toolCalls: ClawToolCall[];
  outputMessage: string;
  tokensUsed?: { prompt: number; completion: number };
  costUsd?: number;
  durationMs: number;
  error?: string;
  executedAt: string;
}

export interface CreateClawInput {
  name: string;
  mission: string;
  mode?: ClawMode;
  allowed_tools?: string[];
  limits?: Partial<ClawLimits>;
  interval_ms?: number;
  event_filters?: string[];
  auto_start?: boolean;
  stop_condition?: string;
  provider?: string;
  model?: string;
  soul_id?: string;
  sandbox?: ClawSandboxMode;
  coding_agent_provider?: string;
  skills?: string[];
}

// =============================================================================
// API
// =============================================================================

export const clawsApi = {
  list: () => apiClient.get<ClawConfig[]>('/claws'),

  get: (id: string) => apiClient.get<ClawConfig>(`/claws/${id}`),

  create: (input: CreateClawInput) => apiClient.post<ClawConfig>('/claws', input),

  update: (id: string, input: Partial<CreateClawInput>) =>
    apiClient.put<ClawConfig>(`/claws/${id}`, input),

  delete: (id: string) => apiClient.delete(`/claws/${id}`),

  start: (id: string) => apiClient.post<{ state: string }>(`/claws/${id}/start`),

  pause: (id: string) => apiClient.post<{ paused: boolean }>(`/claws/${id}/pause`),

  resume: (id: string) => apiClient.post<{ resumed: boolean }>(`/claws/${id}/resume`),

  stop: (id: string) => apiClient.post<{ stopped: boolean }>(`/claws/${id}/stop`),

  execute: (id: string) => apiClient.post<Record<string, unknown>>(`/claws/${id}/execute`),

  sendMessage: (id: string, message: string) =>
    apiClient.post<{ sent: boolean }>(`/claws/${id}/message`, { message }),

  getHistory: (id: string, limit = 20, offset = 0) =>
    apiClient.get<{ entries: ClawHistoryEntry[]; total: number }>(
      `/claws/${id}/history?limit=${limit}&offset=${offset}`
    ),

  getAuditLog: (id: string, limit = 50, offset = 0, category?: string) =>
    apiClient.get<{
      entries: Array<{
        id: string;
        clawId: string;
        cycleNumber: number;
        toolName: string;
        toolArgs: Record<string, unknown>;
        toolResult: string;
        success: boolean;
        durationMs: number;
        category: string;
        executedAt: string;
      }>;
      total: number;
    }>(
      `/claws/${id}/audit?limit=${limit}&offset=${offset}${category ? `&category=${encodeURIComponent(category)}` : ''}`
    ),

  stats: () =>
    apiClient.get<{
      total: number;
      running: number;
      totalCost: number;
      totalCycles: number;
      totalToolCalls: number;
      byMode: Record<string, number>;
      byState: Record<string, number>;
    }>('/claws/stats'),

  approveEscalation: (id: string) =>
    apiClient.post<{ approved: boolean }>(`/claws/${id}/approve-escalation`),

  denyEscalation: (id: string, reason?: string) =>
    apiClient.post<{ denied: boolean }>(`/claws/${id}/deny-escalation`, reason ? { reason } : {}),
};
