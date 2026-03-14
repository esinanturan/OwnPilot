/**
 * ToolNode — ReactFlow node for tool execution in workflows.
 * Clean utility look with colored left border strip, monospace tool name,
 * and args count badge.
 */

import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { Wrench, CheckCircle2, XCircle, AlertCircle, Activity } from '../icons';
import type { NodeExecutionStatus } from '../../api/types';

// Extended data type with runtime execution state.
// Index signature required by ReactFlow's Node<Record<string, unknown>> constraint.
export interface ToolNodeData extends Record<string, unknown> {
  toolName: string;
  toolArgs: Record<string, unknown>;
  label: string;
  description?: string;
  executionStatus?: NodeExecutionStatus;
  executionError?: string;
  executionDuration?: number;
  executionOutput?: unknown;
  resolvedArgs?: Record<string, unknown>;
}

/** ReactFlow Node typed with ToolNodeData */
export type ToolNodeType = Node<ToolNodeData>;

const statusStyles: Record<NodeExecutionStatus, { border: string; bg: string }> = {
  pending: { border: 'border-border dark:border-dark-border', bg: '' },
  running: { border: 'border-warning', bg: 'bg-warning/5' },
  success: { border: 'border-success', bg: 'bg-success/5' },
  error: { border: 'border-error', bg: 'bg-error/5' },
  skipped: { border: 'border-text-muted/50', bg: 'bg-text-muted/5' },
};

const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  running: Activity,
  success: CheckCircle2,
  error: XCircle,
  skipped: AlertCircle,
};

function ToolNodeComponent({ data, selected }: NodeProps<ToolNodeType>) {
  const status = (data.executionStatus as NodeExecutionStatus | undefined) ?? 'pending';
  const style = statusStyles[status];
  const StatusIcon = statusIcons[status];
  const toolName = (data.toolName as string) ?? '';
  const toolArgs = data.toolArgs as Record<string, unknown> | undefined;
  const argsCount = toolArgs ? Object.keys(toolArgs).length : 0;

  // Split tool name into namespace prefix and base name
  const dotIndex = toolName.lastIndexOf('.');
  const namespace = dotIndex > 0 ? toolName.slice(0, dotIndex + 1) : '';
  const baseName = dotIndex > 0 ? toolName.slice(dotIndex + 1) : toolName;

  return (
    <div
      className={`
        relative min-w-[170px] max-w-[260px] rounded-lg border shadow-sm overflow-hidden
        bg-white dark:bg-gray-900
        ${style.border} ${style.bg}
        ${selected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
        ${status === 'running' ? 'animate-pulse' : ''}
        transition-all duration-200
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-primary !border-2 !border-white dark:!border-dark-bg-secondary"
      />

      {/* Blue left accent strip */}
      <div className="flex">
        <div className="w-1 shrink-0 bg-blue-500" />

        {/* Content */}
        <div className="px-3 py-2 flex-1 min-w-0">
          {/* Header: icon + label + status */}
          <div className="flex items-center gap-2">
            <Wrench className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="font-medium text-sm text-text-primary dark:text-dark-text-primary truncate flex-1">
              {(data.label as string) || toolName}
            </span>
            {StatusIcon && (
              <StatusIcon
                className={`w-4 h-4 shrink-0 ${
                  status === 'success'
                    ? 'text-success'
                    : status === 'error'
                      ? 'text-error'
                      : status === 'running'
                        ? 'text-warning'
                        : 'text-text-muted'
                }`}
              />
            )}
          </div>

          {/* Tool name in monospace with dimmed namespace */}
          {toolName && (
            <p className="text-[10px] font-mono mt-1 truncate">
              <span className="text-gray-400 dark:text-gray-600">{namespace}</span>
              <span className="text-blue-600 dark:text-blue-400">{baseName}</span>
            </p>
          )}

          {/* Args count badge + description row */}
          <div className="flex items-center gap-1.5 mt-1">
            {argsCount > 0 && (
              <span className="inline-block px-1.5 py-0.5 text-[9px] font-semibold rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                {argsCount} arg{argsCount > 1 ? 's' : ''}
              </span>
            )}
            {data.description && (
              <p className="text-[10px] text-text-secondary dark:text-dark-text-secondary truncate flex-1">
                {data.description as string}
              </p>
            )}
          </div>

          {/* Error message */}
          {status === 'error' && data.executionError && (
            <p className="text-xs text-error mt-1 truncate" title={data.executionError as string}>
              {data.executionError as string}
            </p>
          )}

          {/* Duration */}
          {data.executionDuration != null && (
            <p className="text-[10px] text-text-muted dark:text-dark-text-muted mt-1">
              {(data.executionDuration as number) < 1000
                ? `${data.executionDuration}ms`
                : `${((data.executionDuration as number) / 1000).toFixed(1)}s`}
            </p>
          )}
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-primary !border-2 !border-white dark:!border-dark-bg-secondary"
      />
    </div>
  );
}

export const ToolNode = memo(ToolNodeComponent);
