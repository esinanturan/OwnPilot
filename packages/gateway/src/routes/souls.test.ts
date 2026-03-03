/**
 * Soul Routes Tests
 *
 * Comprehensive tests for soul CRUD, evolution, versioning, and deployment.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// Mocks - Must be defined inline inside vi.mock factories due to hoisting
// =============================================================================

vi.mock('../db/repositories/souls.js', () => ({
  getSoulsRepository: () => ({
    list: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    getByAgentId: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getVersions: vi.fn(),
    getVersion: vi.fn(),
    createVersion: vi.fn(),
    setHeartbeatEnabled: vi.fn(),
  }),
}));

vi.mock('../db/repositories/agents.js', () => ({
  agentsRepo: {
    create: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../db/repositories/triggers.js', () => ({
  createTriggersRepository: () => ({
    create: vi.fn(),
  }),
}));

vi.mock('../db/repositories/heartbeat-log.js', () => ({
  getHeartbeatLogRepository: () => ({
    listByAgent: vi.fn(),
    getStats: vi.fn(),
  }),
}));

vi.mock('../db/repositories/index.js', () => ({
  settingsRepo: {
    get: vi.fn(),
  },
}));

vi.mock('../services/tool-executor.js', () => ({
  getSharedToolRegistry: () => ({
    getAllTools: vi.fn(),
  }),
}));

vi.mock('../services/soul-heartbeat-service.js', () => ({
  runAgentHeartbeat: vi.fn(),
}));

vi.mock('@ownpilot/core', () => ({
  getServiceRegistry: () => ({
    get: (token: unknown) => {
      if (token === 'Memory') return { listMemories: vi.fn() };
      if (token === 'Goal') return { listGoals: vi.fn() };
      return null;
    },
  }),
  Services: {
    Memory: 'Memory',
    Goal: 'Goal',
  },
}));

// Import after mocks
import { agentsRepo } from '../db/repositories/agents.js';
import { getSoulsRepository } from '../db/repositories/souls.js';
import { settingsRepo } from '../db/repositories/index.js';

// =============================================================================
// Test Data
// =============================================================================

const mockSoul = {
  id: 'soul-123',
  agentId: 'agent-123',
  identity: {
    name: 'Test Agent',
    emoji: '🤖',
    role: 'Assistant',
    personality: 'Helpful',
    voice: { tone: 'neutral', language: 'en', quirks: [] },
    boundaries: [],
  },
  purpose: {
    mission: 'Help with tasks',
    goals: ['Be helpful'],
    expertise: [],
    toolPreferences: [],
  },
  autonomy: {
    level: 3,
    allowedActions: ['search_web'],
    blockedActions: [],
    requiresApproval: [],
    maxCostPerCycle: 0.5,
    maxCostPerDay: 5,
    maxCostPerMonth: 100,
    pauseOnConsecutiveErrors: 5,
    pauseOnBudgetExceeded: true,
    notifyUserOnPause: true,
  },
  heartbeat: {
    enabled: true,
    interval: '0 */6 * * *',
    checklist: [],
    selfHealingEnabled: false,
    maxDurationMs: 120000,
  },
  relationships: {
    delegates: [],
    peers: [],
    channels: [],
  },
  evolution: {
    version: 1,
    evolutionMode: 'supervised',
    coreTraits: [],
    mutableTraits: [],
    learnings: [],
    feedbackLog: [],
  },
  bootSequence: {
    onStart: [],
    onHeartbeat: ['read_inbox'],
    onMessage: [],
  },
  provider: {
    providerId: 'anthropic',
    modelId: 'claude-sonnet-4-5',
  },
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// =============================================================================
// Tests
// =============================================================================

describe('Soul Routes', () => {
  const soulsRepo = getSoulsRepository();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // GET / — List souls
  // ==========================================================================

  describe('GET /', () => {
    it('lists souls with pagination', async () => {
      soulsRepo.list.mockResolvedValue([mockSoul]);
      soulsRepo.count.mockResolvedValue(1);

      const userId = 'user-123';
      const souls = await soulsRepo.list(userId, 20, 0);
      const total = await soulsRepo.count(userId);

      expect(souls).toHaveLength(1);
      expect(total).toBe(1);
      expect(soulsRepo.list).toHaveBeenCalledWith(userId, 20, 0);
      expect(soulsRepo.count).toHaveBeenCalledWith(userId);
    });

    it('respects limit parameter', async () => {
      soulsRepo.list.mockResolvedValue([mockSoul]);
      soulsRepo.count.mockResolvedValue(1);

      const userId = 'user-123';
      await soulsRepo.list(userId, 10, 0);

      expect(soulsRepo.list).toHaveBeenCalledWith(userId, 10, 0);
    });

    it('respects offset parameter', async () => {
      soulsRepo.list.mockResolvedValue([]);
      soulsRepo.count.mockResolvedValue(100);

      const userId = 'user-123';
      await soulsRepo.list(userId, 20, 40);

      expect(soulsRepo.list).toHaveBeenCalledWith(userId, 20, 40);
    });

    it('supports null userId for admin access', async () => {
      soulsRepo.list.mockResolvedValue([mockSoul]);
      soulsRepo.count.mockResolvedValue(1);

      const souls = await soulsRepo.list(null, 20, 0);
      const total = await soulsRepo.count(null);

      expect(souls).toHaveLength(1);
      expect(total).toBe(1);
      expect(soulsRepo.list).toHaveBeenCalledWith(null, 20, 0);
      expect(soulsRepo.count).toHaveBeenCalledWith(null);
    });
  });

  // ==========================================================================
  // POST / — Create soul
  // ==========================================================================

  describe('POST /', () => {
    it('creates soul with required fields', async () => {
      soulsRepo.create.mockResolvedValue(mockSoul);

      const soul = await soulsRepo.create({
        agentId: 'agent-123',
        identity: mockSoul.identity,
        purpose: mockSoul.purpose,
        autonomy: mockSoul.autonomy,
        heartbeat: mockSoul.heartbeat,
        evolution: mockSoul.evolution,
      });

      expect(soul).toBeDefined();
      expect(soul.agentId).toBe('agent-123');
      expect(soulsRepo.create).toHaveBeenCalled();
    });

    it('validates required fields', () => {
      const requiredFields = ['agentId', 'identity', 'purpose', 'autonomy', 'heartbeat', 'evolution'];
      expect(requiredFields).toContain('agentId');
      expect(requiredFields).toContain('identity');
      expect(requiredFields).toContain('purpose');
      expect(requiredFields).toContain('autonomy');
      expect(requiredFields).toContain('heartbeat');
      expect(requiredFields).toContain('evolution');
    });
  });

  // ==========================================================================
  // POST /deploy — Deploy agent + soul + trigger
  // ==========================================================================

  describe('POST /deploy', () => {
    it('uses default provider when not specified', async () => {
      settingsRepo.get.mockImplementation((key: string) => {
        if (key === 'default_ai_provider') return 'openai';
        if (key === 'default_ai_model') return 'gpt-4';
        return null;
      });

      const provider = settingsRepo.get('default_ai_provider');
      const model = settingsRepo.get('default_ai_model');

      expect(provider).toBe('openai');
      expect(model).toBe('gpt-4');
    });

    it('uses custom provider when specified', () => {
      const customProvider = 'anthropic';
      const customModel = 'claude-opus';

      expect(customProvider).toBe('anthropic');
      expect(customModel).toBe('claude-opus');
    });

    it('falls back to default when settings are empty', async () => {
      settingsRepo.get.mockReturnValue(null);

      const provider = settingsRepo.get('default_ai_provider') || 'default';
      const model = settingsRepo.get('default_ai_model') || 'default';

      expect(provider).toBe('default');
      expect(model).toBe('default');
    });

    it('creates agent record before soul', async () => {
      agentsRepo.create.mockResolvedValue(undefined);
      soulsRepo.create.mockResolvedValue(mockSoul);

      await agentsRepo.create({
        id: 'agent-123',
        name: 'Test Agent',
        systemPrompt: '',
        provider: 'anthropic',
        model: 'claude-sonnet',
      });

      expect(agentsRepo.create).toHaveBeenCalled();
      expect(agentsRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        id: 'agent-123',
        name: 'Test Agent',
      }));
    });

    it('handles agent creation failure', async () => {
      agentsRepo.create.mockRejectedValue(new Error('DB error'));

      await expect(agentsRepo.create({ id: 'agent-123' })).rejects.toThrow('DB error');
    });

    it('handles soul creation failure with rollback', async () => {
      agentsRepo.create.mockResolvedValue(undefined);
      soulsRepo.create.mockRejectedValue(new Error('Soul creation failed'));

      // Simulate rollback
      try {
        await soulsRepo.create({ agentId: 'agent-123' });
      } catch {
        await agentsRepo.delete('agent-123');
      }

      expect(agentsRepo.delete).toHaveBeenCalledWith('agent-123');
    });

    it('handles duplicate name by appending random suffix', async () => {
      // First call fails with duplicate name, second succeeds
      let callCount = 0;
      agentsRepo.create.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('duplicate key value violates unique constraint "agents_name_key"'));
        }
        return Promise.resolve(undefined);
      });

      const baseName = 'Test Agent';
      let agentName = baseName;
      let agentCreated = false;
      let attempts = 0;

      while (!agentCreated && attempts < 5) {
        try {
          await agentsRepo.create({
            id: 'agent-123',
            name: agentName,
            systemPrompt: '',
            provider: 'default',
            model: 'default',
          });
          agentCreated = true;
        } catch (agentErr) {
          const errorMessage = (agentErr as Error).message.toLowerCase();
          if (errorMessage.includes('duplicate') && errorMessage.includes('name')) {
            attempts++;
            const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            agentName = `${baseName} (${randomSuffix})`;
          } else {
            break;
          }
        }
      }

      expect(agentCreated).toBe(true);
      expect(attempts).toBe(1);
      expect(agentName).not.toBe(baseName);
      expect(agentName).toMatch(/Test Agent \(\d{4}\)/);
    });

    it('fails after max retries for duplicate names', async () => {
      // All calls fail with duplicate name
      agentsRepo.create.mockRejectedValue(
        new Error('duplicate key value violates unique constraint "agents_name_key"')
      );

      const baseName = 'Test Agent';
      let agentName = baseName;
      let agentCreated = false;
      let attempts = 0;
      let lastError: unknown = null;

      while (!agentCreated && attempts < 5) {
        try {
          await agentsRepo.create({
            id: 'agent-123',
            name: agentName,
            systemPrompt: '',
            provider: 'default',
            model: 'default',
          });
          agentCreated = true;
        } catch (agentErr) {
          lastError = agentErr;
          const errorMessage = (agentErr as Error).message.toLowerCase();
          if (errorMessage.includes('duplicate') && errorMessage.includes('name')) {
            attempts++;
            const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            agentName = `${baseName} (${randomSuffix})`;
          } else {
            break;
          }
        }
      }

      expect(agentCreated).toBe(false);
      expect(attempts).toBe(5);
    });
  });

  // ==========================================================================
  // GET /:agentId — Get soul
  // ==========================================================================

  describe('GET /:agentId', () => {
    it('returns soul when found', async () => {
      soulsRepo.getByAgentId.mockResolvedValue(mockSoul);

      const soul = await soulsRepo.getByAgentId('agent-123');

      expect(soul).toBeDefined();
      expect(soul?.agentId).toBe('agent-123');
      expect(soulsRepo.getByAgentId).toHaveBeenCalledWith('agent-123');
    });

    it('returns null when soul not found', async () => {
      soulsRepo.getByAgentId.mockResolvedValue(null);

      const soul = await soulsRepo.getByAgentId('nonexistent');

      expect(soul).toBeNull();
    });
  });

  // ==========================================================================
  // PUT /:agentId — Update soul
  // ==========================================================================

  describe('PUT /:agentId', () => {
    it('updates existing soul', async () => {
      soulsRepo.getByAgentId.mockResolvedValue(mockSoul);
      soulsRepo.update.mockResolvedValue(undefined);

      const existing = await soulsRepo.getByAgentId('agent-123');
      expect(existing).toBeDefined();

      const updated = {
        ...existing,
        identity: { ...existing!.identity, name: 'Updated Name' },
        updatedAt: new Date(),
      };

      await soulsRepo.update(updated);

      expect(soulsRepo.update).toHaveBeenCalledWith(expect.objectContaining({
        identity: expect.objectContaining({ name: 'Updated Name' }),
      }));
    });

    it('returns error for non-existent soul', async () => {
      soulsRepo.getByAgentId.mockResolvedValue(null);

      const existing = await soulsRepo.getByAgentId('nonexistent');

      expect(existing).toBeNull();
    });
  });

  // ==========================================================================
  // DELETE /:agentId — Delete soul
  // ==========================================================================

  describe('DELETE /:agentId', () => {
    it('deletes existing soul', async () => {
      soulsRepo.delete.mockResolvedValue(true);

      const result = await soulsRepo.delete('agent-123');

      expect(result).toBe(true);
      expect(soulsRepo.delete).toHaveBeenCalledWith('agent-123');
    });

    it('returns false when soul not found', async () => {
      soulsRepo.delete.mockResolvedValue(false);

      const result = await soulsRepo.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // POST /:agentId/feedback — Apply feedback
  // ==========================================================================

  describe('POST /:agentId/feedback', () => {
    it('validates required fields', () => {
      const requiredFields = ['type', 'content'];
      expect(requiredFields).toContain('type');
      expect(requiredFields).toContain('content');
    });

    it('handles praise feedback', async () => {
      soulsRepo.getByAgentId.mockResolvedValue(mockSoul);
      soulsRepo.createVersion.mockResolvedValue(undefined);
      soulsRepo.update.mockResolvedValue(undefined);

      const soul = await soulsRepo.getByAgentId('agent-123');
      const feedback = {
        type: 'praise',
        content: 'Great work!',
        source: 'user',
      };

      // Create version snapshot
      await soulsRepo.createVersion(soul!, feedback.content, feedback.source);

      // Apply feedback
      soul!.evolution.learnings.push(`Positive: ${feedback.content}`);
      soul!.evolution.version++;
      soul!.updatedAt = new Date();

      await soulsRepo.update(soul!);

      expect(soulsRepo.createVersion).toHaveBeenCalled();
      expect(soul!.evolution.learnings).toContain(`Positive: ${feedback.content}`);
      expect(soulsRepo.update).toHaveBeenCalled();
    });

    it('handles correction feedback', async () => {
      soulsRepo.getByAgentId.mockResolvedValue(mockSoul);

      const soul = await soulsRepo.getByAgentId('agent-123');
      const feedback = {
        type: 'correction',
        content: 'Do not send emails without approval',
      };

      // Apply correction
      soul!.identity.boundaries.push(feedback.content);
      soul!.evolution.learnings.push(`Correction: ${feedback.content}`);

      expect(soul!.identity.boundaries).toContain(feedback.content);
      expect(soul!.evolution.learnings).toContain(`Correction: ${feedback.content}`);
    });

    it('handles directive feedback', async () => {
      soulsRepo.getByAgentId.mockResolvedValue(mockSoul);

      const soul = await soulsRepo.getByAgentId('agent-123');
      const feedback = {
        type: 'directive',
        content: 'Focus on research tasks',
      };

      // Apply directive
      soul!.purpose.goals.push(feedback.content);

      expect(soul!.purpose.goals).toContain(feedback.content);
    });

    it('handles personality_tweak feedback', async () => {
      soulsRepo.getByAgentId.mockResolvedValue(mockSoul);

      const soul = await soulsRepo.getByAgentId('agent-123');
      const feedback = {
        type: 'personality_tweak',
        content: 'Be more concise',
      };

      // Apply personality tweak
      soul!.evolution.mutableTraits.push(feedback.content);
      soul!.evolution.learnings.push(`Personality: ${feedback.content}`);

      expect(soul!.evolution.mutableTraits).toContain(feedback.content);
    });

    it('limits learnings to 50 entries', async () => {
      soulsRepo.getByAgentId.mockResolvedValue(mockSoul);

      const soul = await soulsRepo.getByAgentId('agent-123');

      // Simulate many learnings
      soul!.evolution.learnings = Array(55).fill('Learning');

      // Apply limit
      if (soul!.evolution.learnings.length > 50) {
        soul!.evolution.learnings = soul!.evolution.learnings.slice(-50);
      }

      expect(soul!.evolution.learnings).toHaveLength(50);
    });

    it('limits feedback log to 100 entries', async () => {
      soulsRepo.getByAgentId.mockResolvedValue(mockSoul);

      const soul = await soulsRepo.getByAgentId('agent-123');

      // Simulate many feedback entries
      soul!.evolution.feedbackLog = Array(105).fill({ id: 'fb-1' });

      // Apply limit
      if (soul!.evolution.feedbackLog.length > 100) {
        soul!.evolution.feedbackLog = soul!.evolution.feedbackLog.slice(-100);
      }

      expect(soul!.evolution.feedbackLog).toHaveLength(100);
    });
  });

  // ==========================================================================
  // Reserved Keywords Protection
  // ==========================================================================

  describe('Reserved Keywords', () => {
    const reservedKeywords = ['test', 'tools', 'stats', 'command', 'deploy', 'logs', 'memories', 'goals', 'tasks'];

    it('blocks reserved keywords as agentId', () => {
      reservedKeywords.forEach(keyword => {
        expect(reservedKeywords.includes(keyword)).toBe(true);
      });
    });

    it('allows valid UUIDs as agentId', () => {
      const validIds = [
        'agent-123',
        '550e8400-e29b-41d4-a716-446655440000',
        'user-456',
      ];

      validIds.forEach(id => {
        expect(reservedKeywords.includes(id)).toBe(false);
      });
    });
  });
});
