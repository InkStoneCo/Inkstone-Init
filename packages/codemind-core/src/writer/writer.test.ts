// Writer 單元測試
import { describe, it, expect } from 'vitest';
import {
  createWriter,
  serializeProperties,
  serializeContent,
  serializeNote,
  generateMap,
  groupNotesByFile,
} from './index.js';
import { createParser } from '../parser/index.js';
import type { Note, NoteId, NoteProperties, NoteLine, ProjectRoot } from '../types/index.js';

// 輔助函數：建立測試用筆記
function createTestNote(overrides: Partial<Note> = {}): Note {
  const defaultProps: NoteProperties = {
    id: 'cm.abc123' as NoteId,
    file: 'test.ts',
    line: 10,
    author: 'human',
    created: '2024-12-01',
  };

  return {
    properties: { ...defaultProps, ...overrides.properties },
    content: overrides.content || [{ indent: 0, content: 'Test content' }],
    children: overrides.children || [],
    displayPath: overrides.displayPath || 'test.ts/abc123',
  };
}

describe('serializeProperties', () => {
  // 新格式：serializeProperties 現在是 formatMetadata 的別名
  // 返回 "author · date · line X" 格式
  it('should serialize basic properties', () => {
    const props: NoteProperties = {
      id: 'cm.abc123' as NoteId,
      author: 'human',
      created: '2024-12-01',
    };

    const result = serializeProperties(props);
    expect(result).toBe('human · 2024-12-01');
  });

  it('should serialize optional properties', () => {
    const props: NoteProperties = {
      id: 'cm.abc123' as NoteId,
      file: 'main.py',
      line: 15,
      author: 'ai',
      created: '2024-12-01',
      parent: 'cm.parent' as NoteId,
      related: ['cm.rel1' as NoteId, 'cm.rel2' as NoteId],
      backlinks: ['cm.back1' as NoteId],
      backlink_count: 1,
    };

    const result = serializeProperties(props);
    // 新格式只包含 author · date · line
    expect(result).toBe('ai · 2024-12-01 · line 15');
  });
});

describe('serializeContent', () => {
  it('should serialize content lines with correct indentation', () => {
    const content: NoteLine[] = [
      { indent: 0, content: 'First line' },
      { indent: 1, content: 'Nested line' },
      { indent: 0, content: 'Back to root' },
    ];

    const lines = serializeContent(content, 1);
    expect(lines[0]).toBe('  - First line');
    expect(lines[1]).toBe('    - Nested line');
    expect(lines[2]).toBe('  - Back to root');
  });
});

describe('serializeNote', () => {
  it('should serialize a complete note', () => {
    const note = createTestNote();
    const result = serializeNote(note, 0);

    expect(result).toContain('- [[cm.abc123|test.ts/abc123]]');
    expect(result).toContain('  id:: cm.abc123');
    expect(result).toContain('  - Test content');
  });

  it('should serialize nested child notes', () => {
    const child = createTestNote({
      properties: {
        id: 'cm.child' as NoteId,
        author: 'human',
        created: '2024-12-01',
        parent: 'cm.abc123' as NoteId,
      },
      displayPath: 'test.ts/abc123/child',
      content: [{ indent: 0, content: 'Child content' }],
    });

    const parent = createTestNote({
      children: [child],
    });

    const result = serializeNote(parent, 0);
    expect(result).toContain('- [[cm.abc123|test.ts/abc123]]');
    expect(result).toContain('  - [[cm.child|test.ts/abc123/child]]');
    expect(result).toContain('    - Child content');
  });
});

describe('groupNotesByFile', () => {
  it('should group notes by file', () => {
    const notes = [
      createTestNote({
        properties: { id: 'cm.a1' as NoteId, file: 'a.ts', author: 'human', created: '2024-12-01' },
      }),
      createTestNote({
        properties: { id: 'cm.a2' as NoteId, file: 'a.ts', author: 'human', created: '2024-12-01' },
      }),
      createTestNote({
        properties: { id: 'cm.b1' as NoteId, file: 'b.ts', author: 'human', created: '2024-12-01' },
      }),
    ];

    const grouped = groupNotesByFile(notes);
    expect(grouped.get('a.ts')?.length).toBe(2);
    expect(grouped.get('b.ts')?.length).toBe(1);
  });
});

describe('generateMap', () => {
  it('should generate map with file groups', () => {
    const notes = [
      createTestNote({
        properties: {
          id: 'cm.a1' as NoteId,
          file: 'main.py',
          author: 'human',
          created: '2024-12-01',
          backlink_count: 3,
        },
        displayPath: 'main.py/a1',
        content: [{ indent: 0, content: 'Main entry' }],
      }),
      createTestNote({
        properties: {
          id: 'cm.b1' as NoteId,
          file: 'utils.py',
          author: 'human',
          created: '2024-12-01',
          backlink_count: 1,
        },
        displayPath: 'utils.py/b1',
        content: [{ indent: 0, content: 'Utility function' }],
      }),
    ];

    const map = generateMap(notes);
    expect(map).toContain('## Map');
    expect(map).toContain('collapsed:: true');
    expect(map).toContain('📄 main.py');
    expect(map).toContain('📄 utils.py');
    expect(map).toContain('[3]');
    expect(map).toContain('[1]');
  });
});

describe('Writer.write', () => {
  it('should write notes without project root', () => {
    const writer = createWriter();
    const notes = [
      createTestNote({
        properties: {
          id: 'cm.abc' as NoteId,
          file: 'test.ts',
          author: 'human',
          created: '2024-12-01',
        },
        displayPath: 'test.ts/abc',
      }),
    ];

    const result = writer.write(null, notes);
    expect(result).toContain('- [[cm.abc|test.ts/abc]]');
  });

  it('should write with project root', () => {
    const writer = createWriter();
    const projectRoot: ProjectRoot = {
      id: 'project-root',
      type: 'project',
      name: 'Test Project',
      created: '2024-12-01',
      projectNotes: [],
      map: { collapsed: true, files: [] },
    };

    const notes = [
      createTestNote({
        properties: {
          id: 'cm.abc' as NoteId,
          file: 'test.ts',
          author: 'human',
          created: '2024-12-01',
        },
        displayPath: 'test.ts/abc',
      }),
    ];

    const result = writer.write(projectRoot, notes);
    expect(result).toContain('- # CodeMind');
    expect(result).toContain('id:: project-root');
    expect(result).toContain('name:: Test Project');
    expect(result).toContain('- [[cm.abc|test.ts/abc]]');
  });

  it('should sort notes by ID when sortNotes is true', () => {
    const writer = createWriter();
    const notes = [
      createTestNote({
        properties: {
          id: 'cm.zzz' as NoteId,
          file: 'test.ts',
          author: 'human',
          created: '2024-12-01',
        },
        displayPath: 'test.ts/zzz',
      }),
      createTestNote({
        properties: {
          id: 'cm.aaa' as NoteId,
          file: 'test.ts',
          author: 'human',
          created: '2024-12-01',
        },
        displayPath: 'test.ts/aaa',
      }),
    ];

    const result = writer.write(null, notes, { sortNotes: true });
    const aaaIndex = result.indexOf('cm.aaa');
    const zzzIndex = result.indexOf('cm.zzz');
    expect(aaaIndex).toBeLessThan(zzzIndex);
  });
});

describe('Round-trip: Parse -> Write -> Parse', () => {
  it('should produce equivalent result after round-trip', () => {
    const parser = createParser();
    const writer = createWriter();

    const originalContent = `- [[cm.abc123]]
  id:: cm.abc123
  file:: main.py
  line:: 15
  author:: human
  created:: 2024-12-01
  - First line of content
  - Second line
- [[cm.def456]]
  id:: cm.def456
  file:: utils.py
  author:: ai
  created:: 2024-12-02
  related:: [[cm.abc123]]
  - Utils content`;

    // Parse original
    const parsed1 = parser.parse(originalContent);
    expect(parsed1.notes.size).toBe(2);

    // Write back
    const written = writer.write(null, [...parsed1.notes.values()]);

    // Parse again
    const parsed2 = parser.parse(written);

    // Compare
    expect(parsed2.notes.size).toBe(parsed1.notes.size);

    for (const [id, note1] of parsed1.notes) {
      const note2 = parsed2.notes.get(id);
      expect(note2).toBeDefined();
      expect(note2?.properties.id).toBe(note1.properties.id);
      expect(note2?.properties.file).toBe(note1.properties.file);
      expect(note2?.properties.author).toBe(note1.properties.author);
      expect(note2?.content.length).toBe(note1.content.length);
    }
  });
});
