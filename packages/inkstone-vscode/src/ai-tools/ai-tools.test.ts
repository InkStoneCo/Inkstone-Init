// AI Tools 模組單元測試
import { describe, it, expect } from 'vitest';
import {
  AI_TOOLS,
  getAIStatus,
  generateGeminiConfig,
  generateAgentsMd,
  type AIToolType,
  type AIToolInfo,
  type ProjectAIStatus,
} from './index.js';

describe('AI Tools Module', () => {
  describe('AI_TOOLS', () => {
    it('should have 5 AI tools', () => {
      expect(AI_TOOLS.length).toBe(5);
    });

    it('should have Claude tool', () => {
      const claude = AI_TOOLS.find(t => t.id === 'claude');
      expect(claude).toBeDefined();
      expect(claude!.name).toBe('Claude Code');
      expect(claude!.configFile).toBe('CLAUDE.md');
    });

    it('should have Gemini tool', () => {
      const gemini = AI_TOOLS.find(t => t.id === 'gemini');
      expect(gemini).toBeDefined();
      expect(gemini!.name).toBe('Gemini CLI');
      expect(gemini!.configFile).toBe('config.yaml');
      expect(gemini!.configDir).toBe('.gemini');
    });

    it('should have Codex tool', () => {
      const codex = AI_TOOLS.find(t => t.id === 'codex');
      expect(codex).toBeDefined();
      expect(codex!.name).toContain('Codex');
      expect(codex!.configFile).toBe('AGENTS.md');
    });

    it('should have Cursor tool', () => {
      const cursor = AI_TOOLS.find(t => t.id === 'cursor');
      expect(cursor).toBeDefined();
      expect(cursor!.name).toBe('Cursor');
      expect(cursor!.configFile).toBe('.cursorrules');
    });

    it('should have Windsurf tool', () => {
      const windsurf = AI_TOOLS.find(t => t.id === 'windsurf');
      expect(windsurf).toBeDefined();
      expect(windsurf!.name).toBe('Windsurf');
      expect(windsurf!.configFile).toBe('.windsurfrules');
    });

    it('should have icons for all tools', () => {
      AI_TOOLS.forEach(tool => {
        expect(tool.icon).toBeTruthy();
        expect(typeof tool.icon).toBe('string');
      });
    });

    it('should have descriptions for all tools', () => {
      AI_TOOLS.forEach(tool => {
        expect(tool.description).toBeTruthy();
        expect(typeof tool.description).toBe('string');
      });
    });

    it('should have unique IDs', () => {
      const ids = AI_TOOLS.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('generateGeminiConfig', () => {
    it('should generate YAML config', () => {
      const config = generateGeminiConfig('TestProject');

      expect(config).toContain('Gemini CLI Configuration');
      expect(config).toContain('TestProject');
    });

    it('should include safety settings', () => {
      const config = generateGeminiConfig('Test');

      expect(config).toContain('safety_settings');
    });

    it('should include model configuration', () => {
      const config = generateGeminiConfig('Test');

      expect(config).toContain('model:');
    });

    it('should handle project name with spaces', () => {
      const config = generateGeminiConfig('My Test Project');

      expect(config).toContain('My Test Project');
    });
  });

  describe('generateAgentsMd', () => {
    it('should generate markdown content', () => {
      const content = generateAgentsMd('TestProject');

      expect(content).toContain('# AGENTS.md');
      expect(content).toContain('TestProject');
    });

    it('should include project structure section', () => {
      const content = generateAgentsMd('Test');

      expect(content).toContain('## 專案結構');
    });

    it('should include development guidelines', () => {
      const content = generateAgentsMd('Test');

      expect(content).toContain('開發指引');
    });
  });

  describe('getAIStatus', () => {
    it('should return status object', () => {
      const status = getAIStatus();
      expect(status).toBeDefined();
    });

    it('should have configuredTools array', () => {
      const status = getAIStatus();
      expect(Array.isArray(status.configuredTools)).toBe(true);
    });

    it('should have activeFiles map', () => {
      const status = getAIStatus();
      expect(status.activeFiles instanceof Map).toBe(true);
    });

    it('should return a copy (immutable)', () => {
      const status1 = getAIStatus();
      const status2 = getAIStatus();

      expect(status1).not.toBe(status2);
      expect(status1.activeFiles).not.toBe(status2.activeFiles);
    });
  });

  describe('AIToolType type', () => {
    it('should allow valid tool IDs', () => {
      const ids: AIToolType[] = ['claude', 'gemini', 'codex', 'cursor', 'windsurf'];
      expect(ids).toHaveLength(5);
    });
  });

  describe('AIToolInfo interface', () => {
    it('should have correct structure', () => {
      const tool: AIToolInfo = {
        id: 'claude',
        name: 'Claude Code',
        description: 'AI 助手',
        icon: 'robot',
        configFile: 'CLAUDE.md',
      };

      expect(tool.id).toBe('claude');
      expect(tool.configDir).toBeUndefined();
    });

    it('should allow optional configDir', () => {
      const tool: AIToolInfo = {
        id: 'gemini',
        name: 'Gemini CLI',
        description: 'Google AI',
        icon: 'google',
        configFile: 'config.yaml',
        configDir: '.gemini',
      };

      expect(tool.configDir).toBe('.gemini');
    });
  });

  describe('ProjectAIStatus interface', () => {
    it('should have correct structure', () => {
      const status: ProjectAIStatus = {
        configuredTools: ['claude', 'gemini'],
        activeFiles: new Map([['claude', 'CLAUDE.md']]),
      };

      expect(status.configuredTools).toHaveLength(2);
      expect(status.activeFiles.size).toBe(1);
      expect(status.lastSync).toBeUndefined();
    });

    it('should allow optional lastSync', () => {
      const status: ProjectAIStatus = {
        configuredTools: [],
        activeFiles: new Map(),
        lastSync: new Date(),
      };

      expect(status.lastSync).toBeDefined();
    });
  });
});
