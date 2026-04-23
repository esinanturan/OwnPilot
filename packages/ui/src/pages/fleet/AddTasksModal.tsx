import { useState } from 'react';
import { useToast } from '../../components/ToastProvider';
import { fleetApi } from '../../api/endpoints/fleet';
import type { FleetConfig, CreateFleetTaskInput } from '../../api/endpoints/fleet';
import { X, Plus } from '../../components/icons';
import { getWorkerTypeLabel } from './utils';

export function AddTasksModal({
  fleet,
  onClose,
  onAdded,
}: {
  fleet: FleetConfig;
  onClose: () => void;
  onAdded: () => void;
}) {
  const toast = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [tasks, setTasks] = useState<
    Array<{ title: string; description: string; priority: string; assignedWorker: string }>
  >([{ title: '', description: '', priority: 'normal', assignedWorker: '' }]);

  const addTask = () => {
    setTasks((prev) => [
      ...prev,
      { title: '', description: '', priority: 'normal', assignedWorker: '' },
    ]);
  };

  const removeTask = (index: number) => {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTask = (index: number, field: string, value: string) => {
    setTasks((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  const handleAdd = async () => {
    const validTasks = tasks.filter((t) => t.title.trim() && t.description.trim());
    if (validTasks.length === 0) {
      toast.error('At least one task with title and description is required');
      return;
    }

    setIsAdding(true);
    try {
      const taskInputs: CreateFleetTaskInput[] = validTasks.map((t) => ({
        title: t.title.trim(),
        description: t.description.trim(),
        priority: t.priority as 'low' | 'normal' | 'high' | 'critical',
        assigned_worker: t.assignedWorker || undefined,
      }));
      await fleetApi.addTasks(fleet.id, taskInputs);
      toast.success(`Added ${validTasks.length} task(s) to "${fleet.name}"`);
      onAdded();
      onClose();
    } catch (err) {
      toast.error(`Failed to add tasks: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl max-h-[80vh] overflow-y-auto rounded-xl bg-bg-primary dark:bg-dark-bg-primary border border-border dark:border-dark-border shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border dark:border-dark-border bg-bg-primary dark:bg-dark-bg-primary p-4 rounded-t-xl">
          <h2 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">
            Add Tasks to {fleet.name}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-bg-tertiary dark:hover:bg-dark-bg-tertiary rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {tasks.map((task, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg border border-border dark:border-dark-border bg-bg-secondary dark:bg-dark-bg-secondary space-y-2"
            >
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={task.title}
                  onChange={(e) => updateTask(idx, 'title', e.target.value)}
                  placeholder="Task title"
                  className="flex-1 px-2 py-1.5 text-sm rounded border border-border dark:border-dark-border bg-bg-primary dark:bg-dark-bg-primary text-text-primary dark:text-dark-text-primary placeholder:text-text-tertiary"
                />
                <select
                  value={task.priority}
                  onChange={(e) => updateTask(idx, 'priority', e.target.value)}
                  className="px-2 py-1.5 text-sm rounded border border-border dark:border-dark-border bg-bg-primary dark:bg-dark-bg-primary text-text-primary dark:text-dark-text-primary"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                {tasks.length > 1 && (
                  <button
                    onClick={() => removeTask(idx)}
                    className="p-1 text-error hover:text-error/80"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {fleet.workers.length > 0 && (
                <select
                  value={task.assignedWorker}
                  onChange={(e) => updateTask(idx, 'assignedWorker', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm rounded border border-border dark:border-dark-border bg-bg-primary dark:bg-dark-bg-primary text-text-primary dark:text-dark-text-primary"
                >
                  <option value="">Auto-assign worker</option>
                  {fleet.workers.map((w) => (
                    <option key={w.name} value={w.name}>
                      {w.name} ({getWorkerTypeLabel(w.type)})
                    </option>
                  ))}
                </select>
              )}
              <textarea
                value={task.description}
                onChange={(e) => updateTask(idx, 'description', e.target.value)}
                placeholder="Describe what the worker should do..."
                rows={2}
                className="w-full px-2 py-1.5 text-sm rounded border border-border dark:border-dark-border bg-bg-primary dark:bg-dark-bg-primary text-text-primary dark:text-dark-text-primary placeholder:text-text-tertiary resize-none"
              />
            </div>
          ))}
          <button
            onClick={addTask}
            className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80"
          >
            <Plus className="w-4 h-4" /> Add another task
          </button>
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-border dark:border-dark-border bg-bg-primary dark:bg-dark-bg-primary p-4 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-border dark:border-dark-border text-text-secondary dark:text-dark-text-secondary hover:bg-bg-tertiary dark:hover:bg-dark-bg-tertiary"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={isAdding}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {isAdding ? 'Adding...' : 'Add Tasks'}
          </button>
        </div>
      </div>
    </div>
  );
}
