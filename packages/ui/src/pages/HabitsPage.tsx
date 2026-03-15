import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGateway } from '../hooks/useWebSocket';
import {
  Plus,
  Trash2,
  Zap,
  Target,
  CheckCircle2,
  Circle,
  Archive,
  Home,
  ListChecks,
} from '../components/icons';
import { useDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/ToastProvider';
import { SkeletonCard } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { useModalClose } from '../hooks';
import { habitsApi, type Habit, type HabitWithTodayStatus } from '../api/endpoints/personal-data';
// ============================================================================
// Types
// ============================================================================

type TabId = 'home' | 'habits';
const TAB_LABELS: Record<TabId, string> = { home: 'Home', habits: 'Habits' };

// ============================================================================
// Page
// ============================================================================

export function HabitsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as TabId) || 'home';
  const setActiveTab = (t: TabId) => setSearchParams(t === 'home' ? {} : { tab: t });

  const { confirm } = useDialog();
  const toast = useToast();
  const { subscribe } = useGateway();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [todayHabits, setTodayHabits] = useState<HabitWithTodayStatus[]>([]);
  const [todayProgress, setTodayProgress] = useState({ total: 0, completed: 0, rate: 0 });
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editHabit, setEditHabit] = useState<Habit | null>(null);
  const [filter, setFilter] = useState<'active' | 'archived'>('active');

  // ---- Data fetching ----

  const fetchHabits = useCallback(async () => {
    try {
      const [listRes, todayRes] = await Promise.all([
        habitsApi.list({ isArchived: filter === 'archived' ? 'true' : 'false' }),
        habitsApi.getToday(),
      ]);
      setHabits(listRes.habits);
      setTodayHabits(todayRes.habits);
      setTodayProgress(todayRes.progress);
    } catch {
      toast.error('Failed to load habits');
    } finally {
      setLoading(false);
    }
  }, [filter, toast]);

  useEffect(() => {
    setLoading(true);
    fetchHabits();
  }, [fetchHabits]);

  useEffect(() => {
    const unsub = subscribe('data:changed', (payload: Record<string, unknown>) => {
      if (payload.entity === 'habit') fetchHabits();
    });
    return unsub;
  }, [subscribe, fetchHabits]);

  // ---- Actions ----

  const handleLog = async (habitId: string) => {
    try {
      await habitsApi.log(habitId);
      toast.success('Habit logged!');
      fetchHabits();
    } catch {
      toast.error('Failed to log habit');
    }
  };

  const handleDelete = async (habit: Habit) => {
    const ok = await confirm({
      title: 'Delete Habit',
      message: `Permanently delete "${habit.name}" and all its logs?`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await habitsApi.delete(habit.id);
      toast.success('Habit deleted');
      fetchHabits();
    } catch {
      toast.error('Failed to delete habit');
    }
  };

  const handleArchive = async (habit: Habit) => {
    try {
      await habitsApi.archive(habit.id);
      toast.success('Habit archived');
      fetchHabits();
    } catch {
      toast.error('Failed to archive habit');
    }
  };

  const handleUnarchive = async (habit: Habit) => {
    try {
      await habitsApi.update(habit.id, { isArchived: false });
      toast.success('Habit unarchived');
      fetchHabits();
    } catch {
      toast.error('Failed to unarchive habit');
    }
  };

  // ---- Tabs ----

  const tabs = Object.entries(TAB_LABELS).map(([id, label]) => ({
    id: id as TabId,
    label,
    icon: id === 'home' ? Home : ListChecks,
  }));

  // ---- Home stats ----

  const homeStats = [
    { label: 'Active Habits', value: habits.filter((h) => !h.isArchived).length, icon: Target },
    {
      label: 'Completed Today',
      value: `${todayProgress.completed}/${todayProgress.total}`,
      icon: CheckCircle2,
    },
    {
      label: 'Best Streak',
      value: Math.max(0, ...habits.map((h) => h.streakLongest)),
      icon: Zap,
      suffix: ' days',
    },
  ];

  // ---- Render ----

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Tab bar */}
      <div className="shrink-0 border-b border-border dark:border-dark-border px-4">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted dark:text-dark-text-muted hover:text-text dark:hover:text-dark-text'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {activeTab === 'home' && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Stats cards */}
            <div className="grid grid-cols-3 gap-3">
              {homeStats.map((stat) => (
                <div
                  key={stat.label}
                  className="p-4 rounded-xl bg-surface dark:bg-dark-surface border border-border dark:border-dark-border text-center"
                >
                  <stat.icon className="w-5 h-5 mx-auto mb-1.5 text-primary" />
                  <div className="text-xl font-bold">
                    {stat.value}{stat.suffix ?? ''}
                  </div>
                  <div className="text-xs text-text-muted dark:text-dark-text-muted">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* New Habit button */}
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Habit
            </button>

            {/* Today's habits */}
            {todayHabits.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-text-muted dark:text-dark-text-muted">
                  Today&apos;s Habits
                </h3>
                {todayHabits.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-surface dark:bg-dark-surface border border-border dark:border-dark-border"
                  >
                    <button
                      onClick={() => !h.completedToday && handleLog(h.id)}
                      className={`shrink-0 transition-colors ${
                        h.completedToday
                          ? 'text-success'
                          : 'text-text-muted dark:text-dark-text-muted hover:text-primary'
                      }`}
                    >
                      {h.completedToday ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${h.completedToday ? 'line-through opacity-60' : ''}`}>
                        {h.name}
                      </div>
                      {h.category && (
                        <span className="text-xs text-text-muted dark:text-dark-text-muted">
                          {h.category}
                        </span>
                      )}
                    </div>
                    {h.streakCurrent > 0 && (
                      <div className="flex items-center gap-1 text-xs text-warning">
                        <Zap className="w-3.5 h-3.5" />
                        {h.streakCurrent}d
                      </div>
                    )}
                    {h.todayCount > 0 && h.targetCount > 1 && (
                      <span className="text-xs text-text-muted dark:text-dark-text-muted">
                        {h.todayCount}/{h.targetCount}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'habits' && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-border dark:border-dark-border overflow-hidden">
                {(['active', 'archived'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      filter === f
                        ? 'bg-primary text-white'
                        : 'text-text-muted dark:text-dark-text-muted hover:bg-surface dark:hover:bg-dark-surface'
                    }`}
                  >
                    {f === 'active' ? 'Active' : 'Archived'}
                  </button>
                ))}
              </div>
              <div className="flex-1" />
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Habit
              </button>
            </div>

            {/* Habit list */}
            {habits.length === 0 ? (
              <EmptyState
                icon={Target}
                title={filter === 'archived' ? 'No archived habits' : 'No habits yet'}
                description={
                  filter === 'archived'
                    ? 'Archive habits you no longer track'
                    : 'Create your first habit to start building consistent routines'
                }
                action={
                  filter === 'active'
                    ? { label: 'Create Habit', onClick: () => setShowCreate(true) }
                    : undefined
                }
              />
            ) : (
              <div className="space-y-2">
                {habits.map((habit) => (
                  <div
                    key={habit.id}
                    className="flex items-center gap-3 p-4 rounded-lg bg-surface dark:bg-dark-surface border border-border dark:border-dark-border hover:border-primary/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{habit.name}</span>
                        {habit.category && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary">
                            {habit.category}
                          </span>
                        )}
                      </div>
                      {habit.description && (
                        <p className="text-xs text-text-muted dark:text-dark-text-muted mt-0.5 truncate">
                          {habit.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-text-muted dark:text-dark-text-muted">
                        <span className="capitalize">{habit.frequency}</span>
                        {habit.targetCount > 1 && (
                          <span>
                            {habit.targetCount}x{habit.unit ? ` ${habit.unit}` : ''}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-warning" />
                          {habit.streakCurrent}d streak
                        </span>
                        <span>Best: {habit.streakLongest}d</span>
                        <span>{habit.totalCompletions} total</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {!habit.isArchived && (
                        <button
                          onClick={() => handleLog(habit.id)}
                          className="p-1.5 rounded hover:bg-success/10 text-success transition-colors"
                          title="Log completion"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setEditHabit(habit)}
                        className="p-1.5 rounded hover:bg-primary/10 text-text-muted dark:text-dark-text-muted hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <Target className="w-4 h-4" />
                      </button>
                      {habit.isArchived ? (
                        <button
                          onClick={() => handleUnarchive(habit)}
                          className="p-1.5 rounded hover:bg-primary/10 text-text-muted dark:text-dark-text-muted hover:text-primary transition-colors"
                          title="Unarchive"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleArchive(habit)}
                          className="p-1.5 rounded hover:bg-warning/10 text-text-muted dark:text-dark-text-muted hover:text-warning transition-colors"
                          title="Archive"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(habit)}
                        className="p-1.5 rounded hover:bg-error/10 text-text-muted dark:text-dark-text-muted hover:text-error transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreate || editHabit) && (
        <HabitModal
          habit={editHabit}
          onClose={() => {
            setShowCreate(false);
            setEditHabit(null);
          }}
          onSaved={() => {
            setShowCreate(false);
            setEditHabit(null);
            fetchHabits();
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Create/Edit Modal
// ============================================================================

function HabitModal({
  habit,
  onClose,
  onSaved,
}: {
  habit: Habit | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const { onBackdropClick } = useModalClose(onClose);

  const [name, setName] = useState(habit?.name ?? '');
  const [description, setDescription] = useState(habit?.description ?? '');
  const [frequency, setFrequency] = useState(habit?.frequency ?? 'daily');
  const [targetCount, setTargetCount] = useState(habit?.targetCount ?? 1);
  const [unit, setUnit] = useState(habit?.unit ?? '');
  const [category, setCategory] = useState(habit?.category ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || undefined,
        frequency,
        targetCount,
        unit: unit.trim() || undefined,
        category: category.trim() || undefined,
      };
      if (habit) {
        await habitsApi.update(habit.id, body);
        toast.success('Habit updated');
      } else {
        await habitsApi.create(body);
        toast.success('Habit created');
      }
      onSaved();
    } catch {
      toast.error(habit ? 'Failed to update habit' : 'Failed to create habit');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-border dark:border-dark-border bg-background dark:bg-dark-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onBackdropClick}>
      <div className="w-full max-w-md mx-4 rounded-xl bg-surface dark:bg-dark-surface border border-border dark:border-dark-border shadow-xl">
        <div className="p-4 border-b border-border dark:border-dark-border">
          <h2 className="text-lg font-semibold">{habit ? 'Edit Habit' : 'New Habit'}</h2>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-muted dark:text-dark-text-muted mb-1">
              Name *
            </label>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Morning exercise"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted dark:text-dark-text-muted mb-1">
              Description
            </label>
            <input
              className={inputClass}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted dark:text-dark-text-muted mb-1">
                Frequency
              </label>
              <select
                className={inputClass}
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
              >
                <option value="daily">Daily</option>
                <option value="weekdays">Weekdays</option>
                <option value="weekly">Weekly</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted dark:text-dark-text-muted mb-1">
                Target Count
              </label>
              <input
                type="number"
                min={1}
                className={inputClass}
                value={targetCount}
                onChange={(e) => setTargetCount(Number(e.target.value) || 1)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted dark:text-dark-text-muted mb-1">
                Unit
              </label>
              <input
                className={inputClass}
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g., minutes, pages"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted dark:text-dark-text-muted mb-1">
                Category
              </label>
              <input
                className={inputClass}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., health, learning"
              />
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-border dark:border-dark-border flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-text-muted dark:text-dark-text-muted hover:bg-surface-hover dark:hover:bg-dark-surface-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : habit ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
