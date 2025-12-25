// Requirements 模組單元測試
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  REQUIREMENT_TYPES,
  getRequirements,
  type RequirementType,
  type RequirementTypeInfo,
  type Requirement,
} from './index.js';

describe('Requirements Module', () => {
  describe('REQUIREMENT_TYPES', () => {
    it('should have 4 requirement types', () => {
      expect(REQUIREMENT_TYPES.length).toBe(4);
    });

    it('should have feature type', () => {
      const feature = REQUIREMENT_TYPES.find(t => t.id === 'feature');
      expect(feature).toBeDefined();
      expect(feature!.name).toContain('Feature');
      expect(feature!.prefix).toBe('feat');
    });

    it('should have fix type', () => {
      const fix = REQUIREMENT_TYPES.find(t => t.id === 'fix');
      expect(fix).toBeDefined();
      expect(fix!.name).toContain('Fix');
      expect(fix!.prefix).toBe('fix');
    });

    it('should have enhancement type', () => {
      const enhancement = REQUIREMENT_TYPES.find(t => t.id === 'enhancement');
      expect(enhancement).toBeDefined();
      expect(enhancement!.name).toContain('Enhancement');
      expect(enhancement!.prefix).toBe('enhance');
    });

    it('should have refactor type', () => {
      const refactor = REQUIREMENT_TYPES.find(t => t.id === 'refactor');
      expect(refactor).toBeDefined();
      expect(refactor!.name).toContain('Refactor');
      expect(refactor!.prefix).toBe('refactor');
    });

    it('should have icons for all types', () => {
      REQUIREMENT_TYPES.forEach(type => {
        expect(type.icon).toBeTruthy();
        expect(typeof type.icon).toBe('string');
      });
    });

    it('should have descriptions for all types', () => {
      REQUIREMENT_TYPES.forEach(type => {
        expect(type.description).toBeTruthy();
        expect(typeof type.description).toBe('string');
      });
    });

    it('should have unique IDs', () => {
      const ids = REQUIREMENT_TYPES.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have unique prefixes', () => {
      const prefixes = REQUIREMENT_TYPES.map(t => t.prefix);
      const uniquePrefixes = new Set(prefixes);
      expect(uniquePrefixes.size).toBe(prefixes.length);
    });
  });

  describe('RequirementType type', () => {
    it('should allow valid requirement types', () => {
      const types: RequirementType[] = ['feature', 'fix', 'enhancement', 'refactor'];
      expect(types).toHaveLength(4);
    });
  });

  describe('RequirementTypeInfo interface', () => {
    it('should have correct structure', () => {
      const typeInfo: RequirementTypeInfo = {
        id: 'feature',
        name: '新功能',
        description: '全新的功能需求',
        icon: 'sparkle',
        prefix: 'feat',
      };

      expect(typeInfo.id).toBe('feature');
      expect(typeInfo.name).toBe('新功能');
      expect(typeInfo.description).toBe('全新的功能需求');
      expect(typeInfo.icon).toBe('sparkle');
      expect(typeInfo.prefix).toBe('feat');
    });
  });

  describe('Requirement interface', () => {
    it('should have correct structure', () => {
      const requirement: Requirement = {
        id: '20241225-feat-test',
        name: 'test',
        type: 'feature',
        path: '/test/requirements/20241225-feat-test',
        createdAt: new Date(),
        hasRfp: true,
        hasProposal: true,
        hasGherkin: false,
      };

      expect(requirement.id).toBe('20241225-feat-test');
      expect(requirement.name).toBe('test');
      expect(requirement.type).toBe('feature');
      expect(requirement.hasRfp).toBe(true);
      expect(requirement.hasProposal).toBe(true);
      expect(requirement.hasGherkin).toBe(false);
    });

    it('should track status flags correctly', () => {
      const requirement: Requirement = {
        id: '20241225-fix-bug',
        name: 'bug fix',
        type: 'fix',
        path: '/test/requirements/20241225-fix-bug',
        createdAt: new Date(),
        hasRfp: false,
        hasProposal: false,
        hasGherkin: false,
      };

      expect(requirement.hasRfp).toBe(false);
      expect(requirement.hasProposal).toBe(false);
      expect(requirement.hasGherkin).toBe(false);
    });
  });

  describe('getRequirements', () => {
    it('should return an array', () => {
      const requirements = getRequirements();
      expect(Array.isArray(requirements)).toBe(true);
    });

    it('should return a copy (immutable)', () => {
      const requirements1 = getRequirements();
      const requirements2 = getRequirements();

      expect(requirements1).not.toBe(requirements2);
    });
  });

  describe('Requirement ID format', () => {
    it('should follow YYYYMMDD-prefix-name pattern', () => {
      const idPattern = /^\d{8}-[a-z]+-[a-z0-9-]+$/;

      const validIds = [
        '20241225-feat-user-login',
        '20241225-fix-bug-123',
        '20241225-enhance-performance',
        '20241225-refactor-database',
      ];

      validIds.forEach(id => {
        expect(id).toMatch(idPattern);
      });
    });
  });
});
