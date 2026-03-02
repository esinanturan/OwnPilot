/**
 * Permission Review Modal
 *
 * Shows required and optional permissions before skill installation,
 * and for managing permissions of installed skills.
 */

import { useState } from 'react';
import { X, Shield } from './icons';

export interface PermissionItem {
  name: string;
  description: string;
  sensitivity: 'low' | 'medium' | 'high';
}

interface PermissionReviewModalProps {
  /** All available permissions */
  permissions: PermissionItem[];
  /** Required permissions (must be granted) */
  required?: string[];
  /** Optional permissions (user chooses) */
  optional?: string[];
  /** Already granted permissions (for edit mode) */
  granted?: string[];
  /** Called when user approves with granted permissions */
  onApprove: (granted: string[]) => void;
  /** Called when user cancels */
  onCancel: () => void;
  /** Modal title override */
  title?: string;
}

const SENSITIVITY_COLORS: Record<string, string> = {
  high: 'text-danger bg-danger/10 border-danger/20',
  medium: 'text-warning bg-warning/10 border-warning/20',
  low: 'text-success bg-success/10 border-success/20',
};

const SENSITIVITY_LABELS: Record<string, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export function PermissionReviewModal({
  permissions,
  required = [],
  optional = [],
  granted = [],
  onApprove,
  onCancel,
  title = 'Permission Review',
}: PermissionReviewModalProps) {
  // Initialize checked state: required are always checked, optional start from granted
  const [checked, setChecked] = useState<Set<string>>(() => {
    const initial = new Set(required);
    for (const g of granted) {
      initial.add(g);
    }
    return initial;
  });

  const toggle = (name: string) => {
    // Required permissions cannot be unchecked
    if (required.includes(name)) return;

    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleApprove = () => {
    onApprove(Array.from(checked));
  };

  // Separate permissions into required, optional, and other
  const requiredPerms = permissions.filter((p) => required.includes(p.name));
  const optionalPerms = permissions.filter(
    (p) => optional.includes(p.name) && !required.includes(p.name)
  );
  // In edit mode (no required/optional specified), show all
  const editMode = required.length === 0 && optional.length === 0;
  const allPerms = editMode ? permissions : [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-full max-w-lg bg-bg-primary dark:bg-dark-bg-primary border border-border dark:border-dark-border rounded-xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border dark:border-dark-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">
                {title}
              </h2>
            </div>
            <button
              onClick={onCancel}
              className="p-1.5 text-text-muted dark:text-dark-text-muted hover:bg-bg-tertiary dark:hover:bg-dark-bg-tertiary rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="mt-2 text-sm text-text-muted dark:text-dark-text-muted">
            {editMode
              ? 'Select which permissions to grant this skill.'
              : 'Review the permissions this skill requires.'}
          </p>
        </div>

        {/* Permission List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Required */}
          {requiredPerms.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-text-secondary dark:text-dark-text-secondary mb-2">
                Required Permissions
              </h3>
              <div className="space-y-2">
                {requiredPerms.map((p) => (
                  <PermissionRow
                    key={p.name}
                    permission={p}
                    checked={true}
                    disabled={true}
                    onChange={() => {}}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Optional */}
          {optionalPerms.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-text-secondary dark:text-dark-text-secondary mb-2">
                Optional Permissions
              </h3>
              <div className="space-y-2">
                {optionalPerms.map((p) => (
                  <PermissionRow
                    key={p.name}
                    permission={p}
                    checked={checked.has(p.name)}
                    disabled={false}
                    onChange={() => toggle(p.name)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Edit mode: all permissions */}
          {allPerms.length > 0 && (
            <div className="space-y-2">
              {allPerms.map((p) => (
                <PermissionRow
                  key={p.name}
                  permission={p}
                  checked={checked.has(p.name)}
                  disabled={false}
                  onChange={() => toggle(p.name)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border dark:border-dark-border flex items-center justify-between">
          <span className="text-sm text-text-muted dark:text-dark-text-muted">
            {checked.size} permission(s) selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-text-secondary dark:text-dark-text-secondary hover:bg-bg-tertiary dark:hover:bg-dark-bg-tertiary rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleApprove}
              className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              {editMode ? 'Save Permissions' : 'Approve & Install'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Sub-component
// =============================================================================

function PermissionRow({
  permission,
  checked,
  disabled,
  onChange,
}: {
  permission: PermissionItem;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
        checked
          ? 'border-primary/30 bg-primary/5'
          : 'border-border dark:border-dark-border hover:bg-bg-secondary dark:hover:bg-dark-bg-secondary'
      } ${disabled ? 'cursor-not-allowed opacity-80' : ''}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="mt-0.5 rounded border-border"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary dark:text-dark-text-primary">
            {permission.name}
          </span>
          <span
            className={`px-1.5 py-0.5 text-xs rounded border ${SENSITIVITY_COLORS[permission.sensitivity] ?? ''}`}
          >
            {SENSITIVITY_LABELS[permission.sensitivity] ?? permission.sensitivity}
          </span>
        </div>
        <p className="text-xs text-text-muted dark:text-dark-text-muted mt-0.5">
          {permission.description}
        </p>
      </div>
    </label>
  );
}
