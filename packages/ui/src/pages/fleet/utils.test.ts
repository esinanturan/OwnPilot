import { describe, it, expect } from 'vitest';
import {
  getStateBadge,
  getWorkerTypeIcon,
  getWorkerTypeLabel,
  getWorkerTypeColor,
  getScheduleLabel,
  getTaskStatusColor,
  formatCost,
} from './utils';
import { Bot, Terminal, Globe, Server, Brain } from '../../components/icons';

describe('fleet utils', () => {
  describe('getStateBadge', () => {
    it.each([
      ['running', 'text-emerald-600'],
      ['paused', 'text-amber-600'],
      ['error', 'text-red-600'],
      ['stopped', 'text-zinc-500'],
      ['completed', 'text-blue-600'],
    ] as const)('returns %s classes', (state, color) => {
      expect(getStateBadge(state)).toContain(color);
    });

    it('falls back for null', () => {
      expect(getStateBadge(null)).toContain('bg-zinc-500/10');
    });
  });

  describe('getWorkerTypeIcon', () => {
    it.each([
      ['ai-chat', Bot],
      ['coding-cli', Terminal],
      ['api-call', Globe],
      ['mcp-bridge', Server],
      ['claw', Brain],
    ] as const)('returns the correct icon for %s', (type, expected) => {
      expect(getWorkerTypeIcon(type)).toBe(expected);
    });
  });

  describe('getWorkerTypeLabel', () => {
    it.each([
      ['ai-chat', 'AI Chat'],
      ['coding-cli', 'Coding CLI'],
      ['api-call', 'API Call'],
      ['mcp-bridge', 'MCP Bridge'],
      ['claw', 'Claw Agent'],
    ] as const)('formats %s as %s', (type, expected) => {
      expect(getWorkerTypeLabel(type)).toBe(expected);
    });
  });

  describe('getWorkerTypeColor', () => {
    it.each([
      ['ai-chat', 'violet'],
      ['coding-cli', 'cyan'],
      ['api-call', 'amber'],
      ['mcp-bridge', 'rose'],
      ['claw', 'teal'],
    ] as const)('maps %s to %s palette', (type, palette) => {
      expect(getWorkerTypeColor(type)).toContain(palette);
    });
  });

  describe('getScheduleLabel', () => {
    it.each([
      ['continuous', 'Continuous'],
      ['interval', 'Interval'],
      ['cron', 'Cron'],
      ['event', 'Event-driven'],
      ['on-demand', 'On-demand'],
    ] as const)('formats %s as %s', (type, expected) => {
      expect(getScheduleLabel(type)).toBe(expected);
    });
  });

  describe('getTaskStatusColor', () => {
    it.each([
      ['completed', 'text-success'],
      ['running', 'text-info'],
      ['failed', 'text-error'],
      ['cancelled', 'text-text-tertiary'],
      ['pending', 'text-warning'],
      ['unknown-value', 'text-warning'],
    ])('returns %s color for %s', (status, color) => {
      expect(getTaskStatusColor(status)).toContain(color);
    });
  });

  describe('formatCost', () => {
    it('uses 4 decimals for sub-cent amounts', () => {
      expect(formatCost(0)).toBe('$0.0000');
      expect(formatCost(0.0012)).toBe('$0.0012');
      expect(formatCost(0.0099)).toBe('$0.0099');
    });

    it('uses 2 decimals for amounts >= $0.01', () => {
      expect(formatCost(0.01)).toBe('$0.01');
      expect(formatCost(1.234)).toBe('$1.23');
      expect(formatCost(99.999)).toBe('$100.00');
    });
  });
});
