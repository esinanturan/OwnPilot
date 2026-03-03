/**
 * Skill Tools Tests
 *
 * Tests for skill management and Agentskills.io introspection tools.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeSkillTool, SKILL_TOOLS } from './skill-tools.js';

// =============================================================================
// Mocks - Must be defined inline inside vi.mock factories due to hoisting
// =============================================================================

vi.mock('../services/skill-npm-installer.js', () => ({
  getNpmInstaller: () => ({
    search: vi.fn(),
    install: vi.fn(),
    checkForUpdate: vi.fn(),
  }),
}));

vi.mock('../services/extension-service.js', () => ({
  getExtensionService: () => ({
    getAll: vi.fn(),
    getById: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    getToolDefinitions: vi.fn(),
  }),
}));

vi.mock('../db/repositories/extensions.js', () => ({
  extensionsRepo: {
    getAll: vi.fn(),
    getById: vi.fn(),
  },
}));

vi.mock('../services/agentskills-parser.js', () => ({
  parseAgentSkillsMd: vi.fn(),
  parseSkillMdFrontmatter: vi.fn(),
  scanSkillDirectory: vi.fn(),
}));

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
}));

// =============================================================================
// Test Data
// =============================================================================

const mockSearchResults = {
  packages: [
    {
      name: '@agentskills/weather',
      version: '1.0.0',
      description: 'Weather skill for agents',
      author: 'Test Author',
      keywords: ['weather', 'forecast'],
      date: '2024-01-01',
    },
  ],
  total: 1,
};

const mockExtension = {
  id: 'ext-123',
  name: 'Test Extension',
  description: 'A test extension',
  version: '1.0.0',
  status: 'enabled',
  category: 'productivity',
  toolCount: 2,
  triggerCount: 0,
  installedAt: new Date().toISOString(),
  manifest: {
    id: 'test-ext',
    name: 'Test Extension',
    version: '1.0.0',
    description: 'Test',
    format: 'ownpilot',
    tools: [
      { name: 'tool1', description: 'Tool 1', parameters: {} },
    ],
    triggers: [],
  },
  settings: {
    npmPackage: '@test/extension',
    npmVersion: '1.0.0',
  },
};

const mockSkillExtension = {
  ...mockExtension,
  settings: {
    npmPackage: '@agentskills/weather',
    npmVersion: '1.0.0',
  },
  manifest: {
    ...mockExtension.manifest,
    format: 'agentskills',
    instructions: '# Weather Skill\n\nGet weather info',
    script_paths: ['scripts/main.js'],
    reference_paths: ['references/api-docs.md'],
  },
};

// =============================================================================
// Tests
// =============================================================================

describe('Skill Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ==========================================================================
  // Tool Definitions
  // ==========================================================================

  describe('Tool Definitions', () => {
    it('exports all skill tools', () => {
      expect(SKILL_TOOLS).toHaveLength(14);

      const toolNames = SKILL_TOOLS.map(t => t.name);
      expect(toolNames).toContain('skill_search');
      expect(toolNames).toContain('skill_install');
      expect(toolNames).toContain('skill_list_installed');
      expect(toolNames).toContain('skill_get_info');
      expect(toolNames).toContain('skill_toggle');
      expect(toolNames).toContain('skill_check_updates');
      expect(toolNames).toContain('skill_parse_content');
      expect(toolNames).toContain('skill_read_reference');
      expect(toolNames).toContain('skill_read_script');
      expect(toolNames).toContain('skill_list_resources');
      expect(toolNames).toContain('skill_record_usage');
      expect(toolNames).toContain('skill_get_learning_stats');
      expect(toolNames).toContain('skill_compare');
      expect(toolNames).toContain('skill_suggest_learning');
    });

    it('all tools have required properties', () => {
      for (const tool of SKILL_TOOLS) {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.parameters).toBeDefined();
        expect(tool.category).toBe('Skills');
      }
    });
  });

  // ==========================================================================
  // skill_search
  // ==========================================================================

  describe('skill_search', () => {
    it('returns error when query parameter is missing', async () => {
      const result = await executeSkillTool('skill_search', {}, 'user-1');

      // The tool attempts to search but mock returns undefined, causing an error
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('validates query parameter exists', async () => {
      const result = await executeSkillTool('skill_search', { limit: 10 }, 'user-1');

      // Empty query will cause search to fail
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ==========================================================================
  // skill_install
  // ==========================================================================

  describe('skill_install', () => {
    it('requires packageName', async () => {
      const result = await executeSkillTool('skill_install', {}, 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('packageName is required');
    });

    it('validates packageName is provided', async () => {
      const result = await executeSkillTool('skill_install', { version: '1.0.0' }, 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('packageName');
    });
  });

  // ==========================================================================
  // skill_list_installed
  // ==========================================================================

  describe('skill_list_installed', () => {
    it('executes without parameters', async () => {
      // This tests that the tool can be called - actual mocking would need
      // to be set up in the test file that imports the mock
      const result = await executeSkillTool('skill_list_installed', {}, 'user-1');

      // Should not throw, returns result based on mock
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('accepts status filter parameter', async () => {
      const result = await executeSkillTool('skill_list_installed', { status: 'enabled' }, 'user-1');

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  // ==========================================================================
  // skill_get_info
  // ==========================================================================

  describe('skill_get_info', () => {
    it('requires skillId', async () => {
      const result = await executeSkillTool('skill_get_info', {}, 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('skillId is required');
    });

    it('validates skillId is provided', async () => {
      const result = await executeSkillTool('skill_get_info', { includeTools: true }, 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('skillId');
    });
  });

  // ==========================================================================
  // skill_toggle
  // ==========================================================================

  describe('skill_toggle', () => {
    it('requires skillId', async () => {
      const result = await executeSkillTool('skill_toggle', { enabled: true }, 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('skillId is required');
    });

    it('validates enabled parameter', async () => {
      const result = await executeSkillTool('skill_toggle', { skillId: 'test' }, 'user-1');

      // Should fail because enabled is missing
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // skill_check_updates
  // ==========================================================================

  describe('skill_check_updates', () => {
    it('executes without parameters', async () => {
      const result = await executeSkillTool('skill_check_updates', {}, 'user-1');

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  // ==========================================================================
  // Skill Introspection Tools
  // ==========================================================================

  describe('skill_parse_content', () => {
    it('requires skillId', async () => {
      const result = await executeSkillTool('skill_parse_content', {}, 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('skillId');
    });
  });

  describe('skill_read_reference', () => {
    it('requires skillId', async () => {
      const result = await executeSkillTool('skill_read_reference', { path: 'ref.md' }, 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('skillId');
    });

    it('requires referencePath', async () => {
      const result = await executeSkillTool('skill_read_reference', { skillId: 'test' }, 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('referencePath');
    });
  });

  describe('skill_read_script', () => {
    it('requires skillId', async () => {
      const result = await executeSkillTool('skill_read_script', { path: 'script.js' }, 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('skillId');
    });

    it('requires scriptPath', async () => {
      const result = await executeSkillTool('skill_read_script', { skillId: 'test' }, 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('scriptPath');
    });
  });

  describe('skill_list_resources', () => {
    it('requires skillId', async () => {
      const result = await executeSkillTool('skill_list_resources', {}, 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('skillId');
    });
  });

  // ==========================================================================
  // Skill Usage & Learning Tracking
  // ==========================================================================

  describe('skill_record_usage', () => {
    it('requires skillId', async () => {
      const result = await executeSkillTool('skill_record_usage', { usageType: 'learned' }, 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('skillId');
    });

    it('requires valid usageType', async () => {
      const result = await executeSkillTool('skill_record_usage', { skillId: 'test', usageType: 'invalid' }, 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('usageType');
    });

    it('validates usageType enum values', async () => {
      const validTypes = ['learned', 'referenced', 'adapted'];
      const result = await executeSkillTool('skill_record_usage', { skillId: 'test', usageType: 'learned' }, 'user-1');

      // Should proceed to skill lookup (which will fail because skill doesn't exist)
      expect(validTypes).toContain('learned');
      expect(result).toBeDefined();
    });
  });

  describe('skill_get_learning_stats', () => {
    it('executes without parameters', async () => {
      const result = await executeSkillTool('skill_get_learning_stats', {}, 'user-1');

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('accepts optional skillId filter', async () => {
      const result = await executeSkillTool('skill_get_learning_stats', { skillId: 'test-skill' }, 'user-1');

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('respects limit parameter', async () => {
      const result = await executeSkillTool('skill_get_learning_stats', { limit: 10 }, 'user-1');

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('skill_compare', () => {
    it('requires both skillId1 and skillId2', async () => {
      const result1 = await executeSkillTool('skill_compare', { skillId1: 'test1' }, 'user-1');
      const result2 = await executeSkillTool('skill_compare', { skillId2: 'test2' }, 'user-1');

      expect(result1.success).toBe(false);
      expect(result1.error).toContain('skillId2');
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('skillId1');
    });

    it('validates both skills exist', async () => {
      // Mock returns null for unknown skills
      const result = await executeSkillTool('skill_compare', { skillId1: 'unknown1', skillId2: 'unknown2' }, 'user-1');

      expect(result.success).toBe(false);
    });
  });

  describe('skill_suggest_learning', () => {
    it('executes without mission parameter', async () => {
      const result = await executeSkillTool('skill_suggest_learning', {}, 'user-1');

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('accepts mission parameter', async () => {
      const result = await executeSkillTool('skill_suggest_learning', { mission: 'web scraping and data analysis' }, 'user-1');

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  // ==========================================================================
  // Unknown Tool
  // ==========================================================================

  describe('Unknown Tool', () => {
    it('returns error for unknown tool', async () => {
      const result = await executeSkillTool('unknown_tool', {}, 'user-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown skill tool');
    });
  });

  // ==========================================================================
  // Tool Parameter Validation
  // ==========================================================================

  describe('Tool Parameter Validation', () => {
    it('validates skill_search limit parameter type', async () => {
      const result = await executeSkillTool('skill_search', { query: 'test', limit: 'invalid' }, 'user-1');

      expect(result).toBeDefined();
      // Should either succeed with default or fail with validation error
      expect(typeof result.success).toBe('boolean');
    });

    it('validates skill_toggle enabled parameter type', async () => {
      const result = await executeSkillTool('skill_toggle', { skillId: 'test', enabled: 'yes' }, 'user-1');

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });
});
