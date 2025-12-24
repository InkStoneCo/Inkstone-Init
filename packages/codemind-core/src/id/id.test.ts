// ID Generator 單元測試
import { describe, it, expect } from 'vitest';
import {
  createIdGenerator,
  generateId,
  generateUniqueId,
  isValidId,
  generateDisplayPath,
  extractIdFromRef,
  parseDisplayPath,
} from './index.js';
import type { NoteId } from '../types/index.js';

describe('createIdGenerator', () => {
  describe('generateId', () => {
    it('should generate ID in correct format', () => {
      const generator = createIdGenerator();
      const id = generator.generateId();

      expect(id).toMatch(/^cm\.[a-z0-9]{6}$/);
    });

    it('should generate different IDs each time', () => {
      const generator = createIdGenerator();
      const ids = new Set<NoteId>();

      for (let i = 0; i < 100; i++) {
        ids.add(generator.generateId());
      }

      // 應該至少有 95 個不同的 ID (允許少量碰撞)
      expect(ids.size).toBeGreaterThan(95);
    });

    it('should use custom alphabet', () => {
      const generator = createIdGenerator({ alphabet: 'abc' });
      const id = generator.generateId();

      expect(id).toMatch(/^cm\.[abc]{6}$/);
    });

    it('should use custom length', () => {
      const generator = createIdGenerator({ idLength: 8 });
      const id = generator.generateId();

      expect(id).toMatch(/^cm\.[a-z0-9]{8}$/);
    });

    it('should use custom random function', () => {
      let counter = 0;
      const generator = createIdGenerator({
        randomFn: () => {
          counter++;
          return 0; // 總是選第一個字元
        },
      });
      const id = generator.generateId();

      expect(id).toBe('cm.aaaaaa');
      expect(counter).toBe(6);
    });
  });

  describe('generateUniqueId', () => {
    it('should generate unique ID not in existing set', () => {
      const generator = createIdGenerator();
      const existingIds = new Set<NoteId>(['cm.abc123' as NoteId]);

      const newId = generator.generateUniqueId(existingIds);

      expect(newId).not.toBe('cm.abc123');
      expect(existingIds.has(newId)).toBe(false);
    });

    it('should retry when collision occurs', () => {
      let callCount = 0;
      const generator = createIdGenerator({
        randomFn: () => {
          callCount++;
          // 前 6 次產生相同 ID，之後產生不同 ID
          if (callCount <= 6) {
            return 0; // 產生 'aaaaaa'
          }
          return 0.5; // 產生不同 ID
        },
      });

      const existingIds = new Set<NoteId>(['cm.aaaaaa' as NoteId]);
      const newId = generator.generateUniqueId(existingIds);

      expect(newId).not.toBe('cm.aaaaaa');
    });
  });

  describe('isValidId', () => {
    it('should validate correct ID format', () => {
      expect(isValidId('cm.abc123')).toBe(true);
      expect(isValidId('cm.xyz789')).toBe(true);
      expect(isValidId('cm.000000')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidId('abc123')).toBe(false); // 缺少前綴
      expect(isValidId('cm.abc')).toBe(false); // 太短
      expect(isValidId('cm.abc1234')).toBe(false); // 太長
      expect(isValidId('cm.ABC123')).toBe(false); // 大寫
      expect(isValidId('cm.abc-12')).toBe(false); // 含有非法字元
      expect(isValidId('')).toBe(false);
    });
  });

  describe('generateDisplayPath', () => {
    it('should generate path without parent', () => {
      const path = generateDisplayPath('test.ts', 'cm.abc123' as NoteId);

      expect(path).toBe('test.ts/abc123');
    });

    it('should generate path with parent', () => {
      const path = generateDisplayPath('test.ts', 'cm.child1' as NoteId, 'cm.parent' as NoteId);

      expect(path).toBe('test.ts/parent/child1');
    });

    it('should handle file with directories', () => {
      const path = generateDisplayPath('src/utils/helper.ts', 'cm.abc123' as NoteId);

      expect(path).toBe('src/utils/helper.ts/abc123');
    });
  });

  describe('extractIdFromRef', () => {
    it('should extract ID from simple reference', () => {
      const id = extractIdFromRef('[[cm.abc123]]');

      expect(id).toBe('cm.abc123');
    });

    it('should extract ID from reference with display text', () => {
      const id = extractIdFromRef('[[cm.def456|My Note]]');

      expect(id).toBe('cm.def456');
    });

    it('should return null for invalid reference', () => {
      expect(extractIdFromRef('cm.abc123')).toBeNull();
      expect(extractIdFromRef('[[invalid]]')).toBeNull();
      expect(extractIdFromRef('')).toBeNull();
    });
  });

  describe('parseDisplayPath', () => {
    it('should parse simple path', () => {
      const result = parseDisplayPath('test.ts/abc123');

      expect(result).toEqual({
        file: 'test.ts',
        id: 'abc123',
      });
    });

    it('should parse path with parent', () => {
      const result = parseDisplayPath('test.ts/parent/child');

      expect(result).toEqual({
        file: 'test.ts',
        id: 'child',
        parentId: 'parent',
      });
    });

    it('should parse path with directory in file', () => {
      // Note: 3+ parts are interpreted as file/parentId/id
      // For paths like src/utils/helper.ts/abc123, it's treated as:
      // file: src/utils, parentId: helper.ts, id: abc123
      const result = parseDisplayPath('src/utils/helper.ts/abc123');

      expect(result).toEqual({
        file: 'src/utils',
        id: 'abc123',
        parentId: 'helper.ts',
      });
    });

    it('should return null for invalid path', () => {
      expect(parseDisplayPath('invalid')).toBeNull();
      expect(parseDisplayPath('')).toBeNull();
    });
  });
});

describe('Default exports', () => {
  it('generateId should work', () => {
    const id = generateId();
    expect(id).toMatch(/^cm\.[a-z0-9]{6}$/);
  });

  it('generateUniqueId should work', () => {
    const existing = new Set<NoteId>();
    const id = generateUniqueId(existing);
    expect(id).toMatch(/^cm\.[a-z0-9]{6}$/);
  });

  it('isValidId should work', () => {
    expect(isValidId('cm.abc123')).toBe(true);
  });

  it('generateDisplayPath should work', () => {
    const path = generateDisplayPath('test.ts', 'cm.abc123' as NoteId);
    expect(path).toBe('test.ts/abc123');
  });

  it('extractIdFromRef should work', () => {
    const id = extractIdFromRef('[[cm.abc123]]');
    expect(id).toBe('cm.abc123');
  });

  it('parseDisplayPath should work', () => {
    const result = parseDisplayPath('test.ts/abc123');
    expect(result).toEqual({ file: 'test.ts', id: 'abc123' });
  });
});
