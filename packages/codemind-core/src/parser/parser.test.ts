// Parser 單元測試
import { describe, it, expect } from 'vitest';
import {
  createParser,
  parseLine,
  parseProperty,
  extractReferences,
  isNoteBlockStart,
} from './index.js';
import type { NoteId } from '../types/index.js';

describe('parseLine', () => {
  it('should parse a simple bullet line', () => {
    const result = parseLine('- Hello world', 1);
    expect(result.isBullet).toBe(true);
    expect(result.indent).toBe(0);
    expect(result.content).toBe('Hello world');
    expect(result.lineNumber).toBe(1);
  });

  it('should parse indented bullet lines', () => {
    const result1 = parseLine('  - Level 1', 2);
    expect(result1.indent).toBe(1);
    expect(result1.content).toBe('Level 1');

    const result2 = parseLine('    - Level 2', 3);
    expect(result2.indent).toBe(2);
    expect(result2.content).toBe('Level 2');
  });

  it('should handle non-bullet lines', () => {
    const result = parseLine('Just text', 1);
    expect(result.isBullet).toBe(false);
    expect(result.content).toBe('Just text');
  });

  it('should handle empty lines', () => {
    const result = parseLine('', 1);
    expect(result.isBullet).toBe(false);
    expect(result.content).toBe('');
  });
});

describe('parseProperty', () => {
  it('should parse key:: value format', () => {
    const result = parseProperty('id:: cm.abc123');
    expect(result).toEqual({ key: 'id', value: 'cm.abc123' });
  });

  it('should parse property with spaces in value', () => {
    const result = parseProperty('name:: My Project Name');
    expect(result).toEqual({ key: 'name', value: 'My Project Name' });
  });

  it('should return null for non-property lines', () => {
    expect(parseProperty('Hello world')).toBeNull();
    expect(parseProperty('key: value')).toBeNull(); // single colon
    expect(parseProperty('::value')).toBeNull(); // no key
  });

  it('should handle empty values', () => {
    const result = parseProperty('empty::');
    expect(result).toEqual({ key: 'empty', value: '' });
  });
});

describe('extractReferences', () => {
  it('should extract simple references', () => {
    const refs = extractReferences('See [[cm.abc123]] for details');
    expect(refs).toEqual(['cm.abc123' as NoteId]);
  });

  it('should extract references with display text', () => {
    const refs = extractReferences('Check [[cm.def456|my note]] here');
    expect(refs).toEqual(['cm.def456' as NoteId]);
  });

  it('should extract multiple references', () => {
    const refs = extractReferences('Links: [[cm.aaa111]], [[cm.bbb222]], [[cm.ccc333]]');
    expect(refs).toEqual(['cm.aaa111', 'cm.bbb222', 'cm.ccc333'] as NoteId[]);
  });

  it('should deduplicate references', () => {
    const refs = extractReferences('[[cm.abc123]] and [[cm.abc123]] again');
    expect(refs).toEqual(['cm.abc123' as NoteId]);
  });

  it('should return empty array for no references', () => {
    const refs = extractReferences('No references here');
    expect(refs).toEqual([]);
  });
});

describe('isNoteBlockStart', () => {
  it('should detect note block start', () => {
    expect(isNoteBlockStart('- [[cm.abc123]]')).toBe('cm.abc123');
    expect(isNoteBlockStart('- [[cm.xyz789|display]]')).toBe('cm.xyz789');
  });

  it('should return null for non-note block lines', () => {
    expect(isNoteBlockStart('- Hello')).toBeNull();
    expect(isNoteBlockStart('Hello world')).toBeNull();
    expect(isNoteBlockStart('- [[invalid]]')).toBeNull();
    expect(isNoteBlockStart('[[invalid]]')).toBeNull();
  });

  it('should work with or without bullet prefix', () => {
    // 支援 parseLine 已處理過的內容
    expect(isNoteBlockStart('[[cm.abc123]]')).toBe('cm.abc123');
    expect(isNoteBlockStart('- [[cm.abc123]]')).toBe('cm.abc123');
  });
});

describe('Parser.parse', () => {
  it('should parse a simple note without project root', () => {
    const parser = createParser();
    const content = `- [[cm.abc123]]
  id:: cm.abc123
  file:: main.py
  author:: human
  created:: 2024-12-01
  - This is content`;

    const result = parser.parse(content);
    expect(result.notes.size).toBe(1);
    expect(result.notes.get('cm.abc123' as NoteId)).toBeDefined();
  });

  it('should parse a complete codemind.md', () => {
    const parser = createParser();
    const content = `
- # CodeMind
  id:: project-root
  type:: project
  name:: Test Project
  created:: 2024-12-01
- [[cm.abc123]]
  id:: cm.abc123
  file:: main.py
  line:: 15
  author:: human
  created:: 2024-12-01
  - This is the note content
  - Second line of content
- [[cm.def456]]
  id:: cm.def456
  file:: utils.py
  line:: 30
  author:: ai
  created:: 2024-12-02
  related:: [[cm.abc123]]
  - Utils note content
  - Uses [[cm.abc123]] for reference
`.trim();

    const result = parser.parse(content);

    // Check project root
    expect(result.projectRoot).not.toBeNull();
    expect(result.projectRoot?.name).toBe('Test Project');
    expect(result.projectRoot?.created).toBe('2024-12-01');

    // Check notes
    expect(result.notes.size).toBe(2);

    const note1 = result.notes.get('cm.abc123' as NoteId);
    expect(note1).toBeDefined();
    expect(note1?.properties.file).toBe('main.py');
    expect(note1?.properties.line).toBe(15);
    expect(note1?.properties.author).toBe('human');
    expect(note1?.content.length).toBe(2);

    const note2 = result.notes.get('cm.def456' as NoteId);
    expect(note2).toBeDefined();
    expect(note2?.properties.related).toEqual(['cm.abc123' as NoteId]);

    // Check forward links
    expect(result.forwardLinks.get('cm.def456' as NoteId)).toContain('cm.abc123');

    // Check backward links
    expect(result.backwardLinks.get('cm.abc123' as NoteId)).toContain('cm.def456');

    // Check no errors
    expect(result.errors.length).toBe(0);
  });

  it('should detect duplicate IDs', () => {
    const parser = createParser();
    const content = `
- [[cm.abc123]]
  id:: cm.abc123
  author:: human
  created:: 2024-12-01
- [[cm.abc123]]
  id:: cm.abc123
  author:: human
  created:: 2024-12-01
`.trim();

    const result = parser.parse(content);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.type).toBe('duplicate_id');
  });

  it('should warn about orphan references', () => {
    const parser = createParser();
    const content = `
- [[cm.abc123]]
  id:: cm.abc123
  author:: human
  created:: 2024-12-01
  - References [[cm.nonexistent]]
`.trim();

    const result = parser.parse(content);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]?.type).toBe('orphan_reference');
  });

  it('should parse nested child notes', () => {
    const parser = createParser();
    const content = `
- [[cm.parent]]
  id:: cm.parent
  author:: human
  created:: 2024-12-01
  - Parent content
  - [[cm.child]]
    id:: cm.child
    author:: human
    created:: 2024-12-01
    parent:: cm.parent
    - Child content
`.trim();

    const result = parser.parse(content);

    const parent = result.notes.get('cm.parent' as NoteId);
    expect(parent).toBeDefined();
    expect(parent?.children.length).toBe(1);
    expect(parent?.children[0]?.properties.id).toBe('cm.child');

    const child = result.notes.get('cm.child' as NoteId);
    expect(child).toBeDefined();
    expect(child?.properties.parent).toBe('cm.parent');
  });
});

describe('Parser.extractReferences', () => {
  it('should extract references from content', () => {
    const parser = createParser();
    const refs = parser.extractReferences('See [[cm.abc123]] and [[cm.def456|display]]');
    expect(refs).toEqual(['cm.abc123', 'cm.def456'] as NoteId[]);
  });
});

describe('Parser.parseNoteBlock', () => {
  it('should parse a single note block', () => {
    const parser = createParser();
    const lines = [
      '- [[cm.test123]]',
      '  id:: cm.test123',
      '  file:: test.ts',
      '  author:: human',
      '  created:: 2024-12-01',
      '  - Test content',
    ];

    const note = parser.parseNoteBlock(lines, 1);
    expect(note).not.toBeNull();
    expect(note?.properties.id).toBe('cm.test123');
    expect(note?.properties.file).toBe('test.ts');
    expect(note?.content.length).toBe(1);
  });
});
