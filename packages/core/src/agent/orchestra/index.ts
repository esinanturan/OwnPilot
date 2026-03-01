/**
 * Agent Orchestra Module
 *
 * Multi-agent collaboration: named delegation, DAG-based plans,
 * per-agent provider routing. Built on top of the subagent system.
 */

export type {
  OrchestraStrategy,
  OrchestraState,
  AgentTask,
  OrchestraPlan,
  OrchestraTaskResult,
  OrchestraExecution,
  IOrchestraService,
  DelegateToAgentInput,
  DelegationResult,
} from './types.js';

export { DEFAULT_ORCHESTRA_LIMITS } from './types.js';
