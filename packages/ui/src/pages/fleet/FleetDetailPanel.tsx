import { useState, useEffect, useCallback } from 'react';
import { useGateway } from '../../hooks/useWebSocket';
import { fleetApi } from '../../api/endpoints/fleet';
import type { FleetConfig, FleetTask, FleetWorkerResult } from '../../api/endpoints/fleet';
import {
  Play,
  Pause,
  Square,
  RefreshCw,
  Clock,
  Activity,
  Users,
  Send,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Layers,
  X,
  Gauge,
  Plus,
} from '../../components/icons';
import {
  getStateBadge,
  getWorkerTypeIcon,
  getWorkerTypeLabel,
  getWorkerTypeColor,
  getScheduleLabel,
  getTaskStatusColor,
  formatCost,
} from './utils';

export function FleetDetailPanel({
  fleet,
  onClose,
  onAction,
}: {
  fleet: FleetConfig;
  onClose: () => void;
  onAction: (action: string, fleet: FleetConfig) => void;
}) {
  const { subscribe } = useGateway();
  const [tasks, setTasks] = useState<FleetTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [taskFilter, setTaskFilter] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>('tasks');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [history, setHistory] = useState<FleetWorkerResult[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activityLog, setActivityLog] = useState<
    Array<{ time: string; text: string; type: 'info' | 'success' | 'error' }>
  >([]);

  const loadTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const result = await fleetApi.listTasks(fleet.id, taskFilter || undefined);
      setTasks(result);
    } catch {
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  }, [fleet.id, taskFilter]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const result = await fleetApi.getHistory(fleet.id, 20, 0);
      setHistory(result.entries);
      setHistoryTotal(result.total);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [fleet.id]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    const unsubs = [
      subscribe<{ fleetId: string; taskId: string; workerName: string; workerType: string }>(
        'fleet:worker:started',
        (data) => {
          if (data.fleetId !== fleet.id) return;
          setActivityLog((prev) => [
            {
              time: new Date().toLocaleTimeString(),
              text: `${data.workerName} (${data.workerType}) started task`,
              type: 'info',
            },
            ...prev.slice(0, 49),
          ]);
        }
      ),
      subscribe<{
        fleetId: string;
        taskId: string;
        workerName: string;
        success: boolean;
        output: string;
        durationMs: number;
        costUsd: number;
      }>('fleet:worker:completed', (data) => {
        if (data.fleetId !== fleet.id) return;
        setActivityLog((prev) => [
          {
            time: new Date().toLocaleTimeString(),
            text: `${data.workerName} ${data.success ? 'completed' : 'failed'} (${(data.durationMs / 1000).toFixed(1)}s)`,
            type: data.success ? 'success' : 'error',
          },
          ...prev.slice(0, 49),
        ]);
        loadTasks();
        loadHistory();
      }),
      subscribe<{ fleetId: string }>('fleet:cycle:end', (data) => {
        if (data.fleetId !== fleet.id) return;
        loadTasks();
        loadHistory();
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [subscribe, fleet.id, loadTasks, loadHistory]);

  const state = fleet.session?.state ?? null;

  const toggleSection = (section: string) =>
    setExpandedSection(expandedSection === section ? null : section);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="w-full max-w-lg h-full overflow-y-auto bg-bg-primary dark:bg-dark-bg-primary border-l border-border dark:border-dark-border shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-bg-primary dark:bg-dark-bg-primary border-b border-border dark:border-dark-border p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary truncate">
              {fleet.name}
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-bg-tertiary dark:hover:bg-dark-bg-tertiary rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary line-clamp-2">
            {fleet.mission}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${getStateBadge(state)}`}
            >
              {state === 'running' && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                </span>
              )}
              {state ?? 'idle'}
            </span>
            <span className="text-xs text-text-tertiary dark:text-dark-text-tertiary">
              {getScheduleLabel(fleet.scheduleType)}
            </span>
            <span className="text-xs text-text-tertiary dark:text-dark-text-tertiary">
              {fleet.workers.length} worker(s)
            </span>
          </div>

          <div className="flex items-center gap-1.5 mt-3">
            {state !== 'running' && state !== 'paused' && (
              <button
                onClick={() => onAction('start', fleet)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-success/10 text-success hover:bg-success/20 transition-colors"
              >
                <Play className="w-3 h-3" /> Start
              </button>
            )}
            {state === 'running' && (
              <>
                <button
                  onClick={() => onAction('pause', fleet)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-warning/10 text-warning hover:bg-warning/20 transition-colors"
                >
                  <Pause className="w-3 h-3" /> Pause
                </button>
                <button
                  onClick={() => onAction('stop', fleet)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-error/10 text-error hover:bg-error/20 transition-colors"
                >
                  <Square className="w-3 h-3" /> Stop
                </button>
              </>
            )}
            {state === 'paused' && (
              <>
                <button
                  onClick={() => onAction('resume', fleet)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-success/10 text-success hover:bg-success/20 transition-colors"
                >
                  <Play className="w-3 h-3" /> Resume
                </button>
                <button
                  onClick={() => onAction('stop', fleet)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-error/10 text-error hover:bg-error/20 transition-colors"
                >
                  <Square className="w-3 h-3" /> Stop
                </button>
              </>
            )}
            <button
              onClick={() => onAction('addTasks', fleet)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Plus className="w-3 h-3" /> Tasks
            </button>
            {state === 'running' && (
              <button
                onClick={() => onAction('broadcast', fleet)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-info/10 text-info hover:bg-info/20 transition-colors"
              >
                <Send className="w-3 h-3" /> Broadcast
              </button>
            )}
          </div>
        </div>

        {fleet.session && (
          <div className="grid grid-cols-4 gap-2 p-4 border-b border-border dark:border-dark-border">
            <div className="text-center">
              <div className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">
                {fleet.session.cyclesCompleted}
              </div>
              <div className="text-xs text-text-tertiary dark:text-dark-text-tertiary">Cycles</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-success">
                {fleet.session.tasksCompleted}
              </div>
              <div className="text-xs text-text-tertiary dark:text-dark-text-tertiary">Done</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-error">{fleet.session.tasksFailed}</div>
              <div className="text-xs text-text-tertiary dark:text-dark-text-tertiary">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">
                {formatCost(fleet.session.totalCostUsd)}
              </div>
              <div className="text-xs text-text-tertiary dark:text-dark-text-tertiary">Cost</div>
            </div>
          </div>
        )}

        {fleet.budget &&
          (fleet.budget.maxCostUsd ||
            fleet.budget.maxCyclesPerHour ||
            fleet.budget.maxTotalCycles) && (
            <div className="flex items-center gap-3 px-4 py-2 border-b border-border dark:border-dark-border text-xs text-text-tertiary dark:text-dark-text-tertiary">
              <Gauge className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Budget:</span>
              {fleet.budget.maxCostUsd != null && (
                <span>max ${fleet.budget.maxCostUsd.toFixed(2)}</span>
              )}
              {fleet.budget.maxCyclesPerHour != null && (
                <span>{fleet.budget.maxCyclesPerHour} cycles/hr</span>
              )}
              {fleet.budget.maxTotalCycles != null && (
                <span>{fleet.budget.maxTotalCycles} total cycles</span>
              )}
            </div>
          )}

        <div className="border-b border-border dark:border-dark-border">
          <button
            onClick={() => toggleSection('workers')}
            className="w-full flex items-center justify-between p-4 hover:bg-bg-secondary dark:hover:bg-dark-bg-secondary"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-text-primary dark:text-dark-text-primary">
              <Users className="w-4 h-4" />
              Workers ({fleet.workers.length})
            </span>
            {expandedSection === 'workers' ? (
              <ChevronDown className="w-4 h-4 text-text-tertiary" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-tertiary" />
            )}
          </button>
          {expandedSection === 'workers' && (
            <div className="px-4 pb-4 space-y-2">
              {fleet.workers.map((w, idx) => {
                const Icon = getWorkerTypeIcon(w.type);
                const colorClass = getWorkerTypeColor(w.type);
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-2 rounded-lg bg-bg-secondary dark:bg-dark-bg-secondary"
                  >
                    <div className={`p-1.5 rounded-md border ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary dark:text-dark-text-primary">
                        {w.name}
                      </div>
                      <div className="text-xs text-text-tertiary dark:text-dark-text-tertiary">
                        {getWorkerTypeLabel(w.type)}
                        {w.provider && ` · ${w.provider}`}
                        {w.model && ` · ${w.model}`}
                        {w.cwd && ` · ${w.cwd}`}
                        {w.cliProvider && w.cliProvider !== 'claude-code' && ` · ${w.cliProvider}`}
                      </div>
                      {w.description && (
                        <div className="text-xs text-text-secondary dark:text-dark-text-secondary mt-0.5">
                          {w.description}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-b border-border dark:border-dark-border">
          <button
            onClick={() => toggleSection('tasks')}
            className="w-full flex items-center justify-between p-4 hover:bg-bg-secondary dark:hover:bg-dark-bg-secondary"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-text-primary dark:text-dark-text-primary">
              <Layers className="w-4 h-4" />
              Tasks ({tasks.length})
            </span>
            {expandedSection === 'tasks' ? (
              <ChevronDown className="w-4 h-4 text-text-tertiary" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-tertiary" />
            )}
          </button>
          {expandedSection === 'tasks' && (
            <div className="px-4 pb-4">
              <div className="flex items-center gap-1 mb-3">
                {['', 'queued', 'running', 'completed', 'failed'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setTaskFilter(s)}
                    className={`px-2 py-1 text-xs rounded-md ${
                      taskFilter === s
                        ? 'bg-primary text-white'
                        : 'bg-bg-tertiary dark:bg-dark-bg-tertiary text-text-secondary dark:text-dark-text-secondary hover:bg-bg-secondary dark:hover:bg-dark-bg-secondary'
                    }`}
                  >
                    {s || 'All'}
                  </button>
                ))}
              </div>

              {tasksLoading ? (
                <div className="text-center py-4 text-sm text-text-tertiary dark:text-dark-text-tertiary">
                  Loading...
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-4 text-sm text-text-tertiary dark:text-dark-text-tertiary">
                  No tasks yet
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {tasks.map((task) => {
                    const isExpanded = expandedTaskId === task.id;
                    return (
                      <div
                        key={task.id}
                        className="rounded-lg bg-bg-secondary dark:bg-dark-bg-secondary"
                      >
                        <button
                          className="w-full p-2 text-left"
                          onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                        >
                          <div className="flex items-center gap-2">
                            {task.status === 'completed' && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
                            )}
                            {task.status === 'running' && (
                              <Activity className="w-3.5 h-3.5 text-info flex-shrink-0 animate-pulse" />
                            )}
                            {task.status === 'failed' && (
                              <XCircle className="w-3.5 h-3.5 text-error flex-shrink-0" />
                            )}
                            {task.status === 'queued' && (
                              <Clock className="w-3.5 h-3.5 text-warning flex-shrink-0" />
                            )}
                            {task.status === 'cancelled' && (
                              <X className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
                            )}
                            <span className="text-sm text-text-primary dark:text-dark-text-primary truncate flex-1">
                              {task.title}
                            </span>
                            <span className={`text-xs ${getTaskStatusColor(task.status)}`}>
                              {task.status}
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="w-3 h-3 text-text-tertiary" />
                            ) : (
                              <ChevronRight className="w-3 h-3 text-text-tertiary" />
                            )}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-2 pb-2 space-y-1.5 border-t border-border/50 dark:border-dark-border/50 pt-1.5">
                            {task.description && (
                              <p className="text-xs text-text-secondary dark:text-dark-text-secondary">
                                {task.description}
                              </p>
                            )}
                            {task.assignedWorker && (
                              <div className="text-xs text-text-tertiary dark:text-dark-text-tertiary">
                                Worker:{' '}
                                <span className="text-text-secondary dark:text-dark-text-secondary">
                                  {task.assignedWorker}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-3 text-xs text-text-tertiary dark:text-dark-text-tertiary">
                              {task.startedAt && (
                                <span>
                                  Started: {new Date(task.startedAt).toLocaleTimeString()}
                                </span>
                              )}
                              {task.completedAt && (
                                <span>Done: {new Date(task.completedAt).toLocaleTimeString()}</span>
                              )}
                              {task.startedAt && task.completedAt && (
                                <span>
                                  {(
                                    (new Date(task.completedAt).getTime() -
                                      new Date(task.startedAt).getTime()) /
                                    1000
                                  ).toFixed(1)}
                                  s
                                </span>
                              )}
                              <span>
                                Retries: {task.retries}/{task.maxRetries}
                              </span>
                            </div>
                            {task.output && (
                              <div>
                                <div className="text-xs font-medium text-text-secondary dark:text-dark-text-secondary mb-0.5">
                                  Output:
                                </div>
                                <pre className="text-xs text-text-primary dark:text-dark-text-primary bg-bg-tertiary dark:bg-dark-bg-tertiary rounded p-2 max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono">
                                  {task.output}
                                </pre>
                              </div>
                            )}
                            {task.error && (
                              <div>
                                <div className="text-xs font-medium text-error mb-0.5">Error:</div>
                                <pre className="text-xs text-error bg-error/5 rounded p-2 max-h-20 overflow-auto whitespace-pre-wrap break-words font-mono">
                                  {task.error}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-b border-border dark:border-dark-border">
          <button
            onClick={() => toggleSection('history')}
            className="w-full flex items-center justify-between p-4 hover:bg-bg-secondary dark:hover:bg-dark-bg-secondary"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-text-primary dark:text-dark-text-primary">
              <RefreshCw className="w-4 h-4" />
              Execution History ({historyTotal})
            </span>
            {expandedSection === 'history' ? (
              <ChevronDown className="w-4 h-4 text-text-tertiary" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-tertiary" />
            )}
          </button>
          {expandedSection === 'history' && (
            <div className="px-4 pb-4">
              {historyLoading ? (
                <div className="text-center py-4 text-sm text-text-tertiary dark:text-dark-text-tertiary">
                  Loading...
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-4 text-sm text-text-tertiary dark:text-dark-text-tertiary">
                  No execution history yet
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {history.map((entry, idx) => {
                    const Icon = getWorkerTypeIcon(entry.workerType);
                    return (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-bg-secondary dark:bg-dark-bg-secondary"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {entry.success ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-error flex-shrink-0" />
                          )}
                          <Icon className="w-3 h-3 text-text-tertiary" />
                          <span className="text-sm font-medium text-text-primary dark:text-dark-text-primary truncate flex-1">
                            {entry.workerName}
                          </span>
                          <span className="text-xs text-text-tertiary dark:text-dark-text-tertiary">
                            {(entry.durationMs / 1000).toFixed(1)}s
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-text-tertiary dark:text-dark-text-tertiary ml-5">
                          <span>{entry.workerType}</span>
                          {entry.costUsd != null && entry.costUsd > 0 && (
                            <span>{formatCost(entry.costUsd)}</span>
                          )}
                          {entry.tokensUsed && (
                            <span>{entry.tokensUsed.prompt + entry.tokensUsed.completion} tok</span>
                          )}
                          <span>{new Date(entry.executedAt).toLocaleTimeString()}</span>
                        </div>
                        {entry.output && (
                          <pre className="text-xs text-text-secondary dark:text-dark-text-secondary bg-bg-tertiary dark:bg-dark-bg-tertiary rounded p-1.5 mt-1.5 ml-5 max-h-24 overflow-auto whitespace-pre-wrap break-words font-mono line-clamp-4">
                            {entry.output.slice(0, 500)}
                          </pre>
                        )}
                        {entry.error && (
                          <p className="text-xs text-error mt-1 ml-5 truncate">{entry.error}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {activityLog.length > 0 && (
          <div className="border-b border-border dark:border-dark-border">
            <button
              onClick={() => toggleSection('activity')}
              className="w-full flex items-center justify-between p-4 hover:bg-bg-secondary dark:hover:bg-dark-bg-secondary"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-text-primary dark:text-dark-text-primary">
                <Activity className="w-4 h-4" />
                Live Activity ({activityLog.length})
              </span>
              {expandedSection === 'activity' ? (
                <ChevronDown className="w-4 h-4 text-text-tertiary" />
              ) : (
                <ChevronRight className="w-4 h-4 text-text-tertiary" />
              )}
            </button>
            {expandedSection === 'activity' && (
              <div className="px-4 pb-4 max-h-48 overflow-y-auto">
                <div className="space-y-1">
                  {activityLog.map((entry, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs">
                      <span className="text-text-tertiary dark:text-dark-text-tertiary whitespace-nowrap font-mono">
                        {entry.time}
                      </span>
                      <span
                        className={
                          entry.type === 'success'
                            ? 'text-success'
                            : entry.type === 'error'
                              ? 'text-error'
                              : 'text-text-secondary dark:text-dark-text-secondary'
                        }
                      >
                        {entry.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="p-4">
          <div className="flex items-center gap-2 text-xs text-text-tertiary dark:text-dark-text-tertiary">
            <Clock className="w-3 h-3" />
            Created {new Date(fleet.createdAt).toLocaleDateString()}
            {fleet.session?.startedAt && (
              <>
                {' / Started '}
                {new Date(fleet.session.startedAt).toLocaleString()}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
