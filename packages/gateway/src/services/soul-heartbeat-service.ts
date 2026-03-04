/**
 * Soul Heartbeat Service
 *
 * Bridges the core HeartbeatRunner with gateway repositories and services.
 * Registers a 'run_heartbeat' action handler with the Trigger Engine.
 */

import { HeartbeatRunner, AgentCommunicationBus, BudgetTracker, getEventSystem } from '@ownpilot/core';
import type {
  IHeartbeatAgentEngine,
  IHeartbeatEventBus,
  ISoulRepository,
  IHeartbeatLogRepository,
} from '@ownpilot/core';
import { getAdapterSync } from '../db/adapters/index.js';
import { getSoulsRepository } from '../db/repositories/souls.js';
import { getHeartbeatLogRepository } from '../db/repositories/heartbeat-log.js';
import { getAgentMessagesRepository } from '../db/repositories/agent-messages.js';
import { getLog } from '@ownpilot/core';

const log = getLog('SoulHeartbeatService');

// ============================================================
// Gateway Soul Repository Adapter (implements ISoulRepository)
// ============================================================

function createSoulRepoAdapter(): ISoulRepository {
  const repo = getSoulsRepository();
  return {
    getByAgentId: (agentId) => repo.getByAgentId(agentId),
    update: (soul) => repo.update(soul),
    createVersion: (soul, changeReason, changedBy) =>
      repo.createVersion(soul, changeReason, changedBy),
    setHeartbeatEnabled: (agentId, enabled) => repo.setHeartbeatEnabled(agentId, enabled),
    updateTaskStatus: (agentId, taskId, status) => repo.updateTaskStatus(agentId, taskId, status),
    updateHeartbeatChecklist: (agentId, checklist) => repo.updateHeartbeatChecklist(agentId, checklist),
  };
}

// ============================================================
// Gateway Heartbeat Log Repository Adapter
// ============================================================

function createHeartbeatLogRepoAdapter(): IHeartbeatLogRepository {
  const repo = getHeartbeatLogRepository();
  return {
    getRecent: (agentId, limit) => repo.getRecent(agentId, limit),
    getLatest: (agentId) => repo.getLatest(agentId),
    create: (entry) => repo.create(entry),
  };
}

// ============================================================
// Minimal Agent Engine (sends heartbeat prompt to the agent)
// ============================================================

function createHeartbeatAgentEngine(): IHeartbeatAgentEngine {
  return {
    async processMessage(request) {
      // Dynamic import to avoid circular dependencies
      const { getOrCreateChatAgent } = await import('../routes/agents.js');
      const { resolveForProcess } = await import('./model-routing.js');
      const resolved = await resolveForProcess('pulse');
      const provider = resolved.provider ?? 'anthropic';
      // TODO(L2): replace with AGENT_DEFAULT_MODEL constant once added to config/defaults.ts
      const model = resolved.model ?? 'claude-sonnet-4-5-20250514';
      const fallback =
        resolved.fallbackProvider && resolved.fallbackModel
          ? { provider: resolved.fallbackProvider, model: resolved.fallbackModel }
          : undefined;

      const agent = await getOrCreateChatAgent(provider, model, fallback);

      // H2: Enforce allowedTools restriction via onBeforeToolCall filter
      const allowedTools = request.context?.allowedTools as string[] | undefined;
      const result = await agent.chat(request.message, {
        onBeforeToolCall: allowedTools?.length
          ? async (toolCall) => {
              const allowed = allowedTools.some(
                (t) => toolCall.name === t || toolCall.name.endsWith(`.${t}`)
              );
              return allowed
                ? { approved: true }
                : { approved: false, reason: `Tool ${toolCall.name} not in task allowedTools` };
            }
          : undefined,
      });
      if (!result.ok) {
        throw result.error;
      }

      return {
        content: result.value.content,
        tokenUsage: result.value.usage
          ? { input: result.value.usage.promptTokens, output: result.value.usage.completionTokens }
          : undefined,
        cost: undefined,
      };
    },

    async saveMemory(agentId, content, source) {
      try {
        const { getServiceRegistry, Services } = await import('@ownpilot/core');
        const registry = getServiceRegistry();
        const memorySvc = registry.get(Services.Memory);
        await memorySvc.createMemory(agentId, {
          content,
          source,
          type: 'fact',
        });
      } catch (err) {
        log.warn('Failed to save heartbeat memory', { agentId, error: String(err) });
      }
    },

    // H4: Implemented — was missing, causing silent output loss for note-type tasks
    async createNote(note) {
      try {
        const { getServiceRegistry, Services } = await import('@ownpilot/core');
        const registry = getServiceRegistry();
        const memorySvc = registry.get(Services.Memory);
        await memorySvc.createMemory('system', {
          content: note.content,
          source: note.source,
          type: 'fact',
          tags: [note.category],
        });
      } catch (err) {
        log.warn('Failed to create heartbeat note', { category: note.category, error: String(err) });
      }
    },

    // M8: Use chatId when provided, not always 'default'
    async sendToChannel(channel, message, chatId) {
      try {
        const { sendTelegramMessage } = await import('../tools/notification-tools.js');
        if (channel === 'telegram') {
          await sendTelegramMessage(chatId ?? 'default', message);
        } else {
          log.debug(`Channel ${channel} not supported for heartbeat output`);
        }
      } catch (err) {
        log.warn('Failed to send heartbeat output to channel', { channel, error: String(err) });
      }
    },
  };
}

// ============================================================
// Event Bus Adapter
// ============================================================

// H5: Wire to real EventBus so soul.heartbeat.* events reach UI/WS subscribers
function createEventBusAdapter(): IHeartbeatEventBus {
  return {
    emit(event, payload) {
      try {
        getEventSystem().emit(event as never, 'soul-heartbeat', payload as never);
      } catch {
        // EventSystem may not be initialized in tests — fall through to log
      }
      log.debug(`[HeartbeatEvent] ${event}`, payload as Record<string, unknown>);
    },
  };
}

// ============================================================
// Service Singleton
// ============================================================

let runner: HeartbeatRunner | null = null;
let communicationBusInstance: AgentCommunicationBus | null = null;

/**
 * M5: Reset the singleton — disposes the AgentCommunicationBus timer.
 * Call in server shutdown hooks and test teardown.
 */
export function resetHeartbeatRunner(): void {
  communicationBusInstance?.dispose();
  communicationBusInstance = null;
  runner = null;
}

export function getHeartbeatRunner(): HeartbeatRunner {
  if (!runner) {
    const soulRepo = createSoulRepoAdapter();
    const hbLogRepo = createHeartbeatLogRepoAdapter();
    const msgRepo = getAgentMessagesRepository();
    const db = getAdapterSync();

    communicationBusInstance = new AgentCommunicationBus(msgRepo, createEventBusAdapter());
    const budgetTracker = new BudgetTracker(db);
    const agentEngine = createHeartbeatAgentEngine();

    runner = new HeartbeatRunner(
      agentEngine,
      soulRepo,
      communicationBusInstance,
      hbLogRepo,
      budgetTracker,
      createEventBusAdapter()
    );
  }
  return runner;
}

/**
 * Run a heartbeat cycle for a specific agent.
 * Called by the trigger engine's 'run_heartbeat' action handler.
 */
export async function runAgentHeartbeat(
  agentId: string,
  force = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const hbRunner = getHeartbeatRunner();
    const result = await hbRunner.runHeartbeat(agentId, force);
    if (result.ok) {
      log.info(`Heartbeat completed for agent ${agentId}`, {
        tasksRun: result.value.tasks.length,
        cost: result.value.totalCost,
        durationMs: result.value.durationMs,
      });
      return { success: true };
    } else {
      log.warn(`Heartbeat failed for agent ${agentId}: ${result.error.message}`);
      return { success: false, error: result.error.message };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`Heartbeat error for agent ${agentId}: ${msg}`);
    return { success: false, error: msg };
  }
}
