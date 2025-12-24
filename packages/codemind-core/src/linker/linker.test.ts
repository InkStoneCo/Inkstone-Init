// BacklinkManager 單元測試
import { describe, it, expect } from 'vitest';
import {
  createBacklinkManager,
  extractReferencesFromContent,
  extractAllReferences,
} from './index.js';
import type { Note, NoteId, NoteProperties } from '../types/index.js';

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

describe('extractReferencesFromContent', () => {
  it('should extract simple references', () => {
    const refs = extractReferencesFromContent('See [[cm.abc123]] for details');
    expect(refs).toEqual(['cm.abc123' as NoteId]);
  });

  it('should extract references with display text', () => {
    const refs = extractReferencesFromContent('Check [[cm.def456|my note]] here');
    expect(refs).toEqual(['cm.def456' as NoteId]);
  });

  it('should extract multiple references', () => {
    const refs = extractReferencesFromContent('Links: [[cm.aaa111]], [[cm.bbb222]]');
    expect(refs).toEqual(['cm.aaa111', 'cm.bbb222'] as NoteId[]);
  });

  it('should deduplicate references', () => {
    const refs = extractReferencesFromContent('[[cm.abc123]] and [[cm.abc123]] again');
    expect(refs).toEqual(['cm.abc123' as NoteId]);
  });

  it('should return empty array for no references', () => {
    const refs = extractReferencesFromContent('No references here');
    expect(refs).toEqual([]);
  });
});

describe('extractAllReferences', () => {
  it('should extract from related property', () => {
    const note = createTestNote({
      properties: {
        id: 'cm.test' as NoteId,
        author: 'human',
        created: '2024-12-01',
        related: ['cm.rel1' as NoteId, 'cm.rel2' as NoteId],
      },
    });

    const refs = extractAllReferences(note);
    expect(refs).toContain('cm.rel1');
    expect(refs).toContain('cm.rel2');
  });

  it('should extract from content references property', () => {
    const note = createTestNote({
      content: [{ indent: 0, content: 'Line with ref', references: ['cm.ref1' as NoteId] }],
    });

    const refs = extractAllReferences(note);
    expect(refs).toContain('cm.ref1');
  });

  it('should extract from content text', () => {
    const note = createTestNote({
      content: [{ indent: 0, content: 'See [[cm.inline]] for info' }],
    });

    const refs = extractAllReferences(note);
    expect(refs).toContain('cm.inline');
  });

  it('should combine all sources without duplicates', () => {
    const note = createTestNote({
      properties: {
        id: 'cm.test' as NoteId,
        author: 'human',
        created: '2024-12-01',
        related: ['cm.shared' as NoteId],
      },
      content: [
        { indent: 0, content: 'See [[cm.shared]] again', references: ['cm.shared' as NoteId] },
      ],
    });

    const refs = extractAllReferences(note);
    expect(refs).toEqual(['cm.shared' as NoteId]);
  });
});

describe('BacklinkManager', () => {
  describe('rebuildAll', () => {
    it('should build forward and backward links from notes', () => {
      const manager = createBacklinkManager();

      const noteA = createTestNote({
        properties: { id: 'cm.aaa' as NoteId, author: 'human', created: '2024-12-01' },
        content: [{ indent: 0, content: 'Links to [[cm.bbb]]' }],
      });

      const noteB = createTestNote({
        properties: { id: 'cm.bbb' as NoteId, author: 'human', created: '2024-12-01' },
        content: [{ indent: 0, content: 'Links to [[cm.ccc]]' }],
      });

      const noteC = createTestNote({
        properties: { id: 'cm.ccc' as NoteId, author: 'human', created: '2024-12-01' },
        content: [{ indent: 0, content: 'No links' }],
      });

      manager.rebuildAll([noteA, noteB, noteC]);

      // Forward links
      expect(manager.getForwardLinks('cm.aaa' as NoteId)).toEqual(['cm.bbb']);
      expect(manager.getForwardLinks('cm.bbb' as NoteId)).toEqual(['cm.ccc']);
      expect(manager.getForwardLinks('cm.ccc' as NoteId)).toEqual([]);

      // Backward links
      expect(manager.getBackwardLinks('cm.aaa' as NoteId)).toEqual([]);
      expect(manager.getBackwardLinks('cm.bbb' as NoteId)).toEqual(['cm.aaa']);
      expect(manager.getBackwardLinks('cm.ccc' as NoteId)).toEqual(['cm.bbb']);
    });

    it('should handle nested notes', () => {
      const manager = createBacklinkManager();

      const child = createTestNote({
        properties: {
          id: 'cm.child' as NoteId,
          author: 'human',
          created: '2024-12-01',
          parent: 'cm.parent' as NoteId,
        },
        content: [{ indent: 0, content: 'Links to [[cm.other]]' }],
      });

      const parent = createTestNote({
        properties: { id: 'cm.parent' as NoteId, author: 'human', created: '2024-12-01' },
        content: [{ indent: 0, content: 'Parent content' }],
        children: [child],
      });

      const other = createTestNote({
        properties: { id: 'cm.other' as NoteId, author: 'human', created: '2024-12-01' },
        content: [{ indent: 0, content: 'Other note' }],
      });

      manager.rebuildAll([parent, other]);

      expect(manager.getForwardLinks('cm.child' as NoteId)).toEqual(['cm.other']);
      expect(manager.getBackwardLinks('cm.other' as NoteId)).toEqual(['cm.child']);
    });
  });

  describe('updateForNote', () => {
    it('should add new links', () => {
      const manager = createBacklinkManager();

      const noteA = createTestNote({
        properties: { id: 'cm.aaa' as NoteId, author: 'human', created: '2024-12-01' },
        content: [{ indent: 0, content: 'No links yet' }],
      });

      const noteB = createTestNote({
        properties: { id: 'cm.bbb' as NoteId, author: 'human', created: '2024-12-01' },
        content: [{ indent: 0, content: 'Note B' }],
      });

      manager.rebuildAll([noteA, noteB]);

      // Update noteA to link to noteB
      noteA.content = [{ indent: 0, content: 'Now links to [[cm.bbb]]' }];
      const affected = manager.updateForNote(noteA, 'No links yet', 'Now links to [[cm.bbb]]');

      expect(affected).toContain('cm.bbb');
      expect(manager.getForwardLinks('cm.aaa' as NoteId)).toEqual(['cm.bbb']);
      expect(manager.getBackwardLinks('cm.bbb' as NoteId)).toEqual(['cm.aaa']);
    });

    it('should remove old links', () => {
      const manager = createBacklinkManager();

      const noteA = createTestNote({
        properties: { id: 'cm.aaa' as NoteId, author: 'human', created: '2024-12-01' },
        content: [{ indent: 0, content: 'Links to [[cm.bbb]]' }],
      });

      const noteB = createTestNote({
        properties: { id: 'cm.bbb' as NoteId, author: 'human', created: '2024-12-01' },
        content: [{ indent: 0, content: 'Note B' }],
      });

      manager.rebuildAll([noteA, noteB]);

      // Update noteA to remove link
      noteA.content = [{ indent: 0, content: 'No links now' }];
      const affected = manager.updateForNote(noteA, 'Links to [[cm.bbb]]', 'No links now');

      expect(affected).toContain('cm.bbb');
      expect(manager.getForwardLinks('cm.aaa' as NoteId)).toEqual([]);
      expect(manager.getBackwardLinks('cm.bbb' as NoteId)).toEqual([]);
    });
  });

  describe('removeNote', () => {
    it('should remove all links for a note', () => {
      const manager = createBacklinkManager();

      const noteA = createTestNote({
        properties: { id: 'cm.aaa' as NoteId, author: 'human', created: '2024-12-01' },
        content: [{ indent: 0, content: 'Links to [[cm.bbb]]' }],
      });

      const noteB = createTestNote({
        properties: { id: 'cm.bbb' as NoteId, author: 'human', created: '2024-12-01' },
        content: [{ indent: 0, content: 'Links to [[cm.aaa]]' }],
      });

      manager.rebuildAll([noteA, noteB]);

      const affected = manager.removeNote('cm.aaa' as NoteId);

      expect(affected).toContain('cm.bbb');
      expect(manager.getForwardLinks('cm.aaa' as NoteId)).toEqual([]);
      expect(manager.getBackwardLinks('cm.aaa' as NoteId)).toEqual([]);
      expect(manager.getBackwardLinks('cm.bbb' as NoteId)).toEqual([]);
    });
  });

  describe('getLinkGraph', () => {
    it('should return complete link graph', () => {
      const manager = createBacklinkManager();

      const noteA = createTestNote({
        properties: { id: 'cm.aaa' as NoteId, author: 'human', created: '2024-12-01' },
        content: [{ indent: 0, content: 'Links to [[cm.bbb]]' }],
      });

      const noteB = createTestNote({
        properties: { id: 'cm.bbb' as NoteId, author: 'human', created: '2024-12-01' },
        content: [{ indent: 0, content: 'Links to [[cm.ccc]]' }],
      });

      const noteC = createTestNote({
        properties: { id: 'cm.ccc' as NoteId, author: 'human', created: '2024-12-01' },
        content: [{ indent: 0, content: 'No links' }],
      });

      manager.rebuildAll([noteA, noteB, noteC]);

      const graph = manager.getLinkGraph();

      expect(graph.nodes).toContain('cm.aaa');
      expect(graph.nodes).toContain('cm.bbb');
      expect(graph.nodes).toContain('cm.ccc');
      expect(graph.edges).toContainEqual({ from: 'cm.aaa', to: 'cm.bbb' });
      expect(graph.edges).toContainEqual({ from: 'cm.bbb', to: 'cm.ccc' });
    });
  });

  describe('getBacklinkCount', () => {
    it('should return correct backlink count', () => {
      const manager = createBacklinkManager();

      const noteA = createTestNote({
        properties: { id: 'cm.aaa' as NoteId, author: 'human', created: '2024-12-01' },
        content: [{ indent: 0, content: 'Links to [[cm.ccc]]' }],
      });

      const noteB = createTestNote({
        properties: { id: 'cm.bbb' as NoteId, author: 'human', created: '2024-12-01' },
        content: [{ indent: 0, content: 'Also links to [[cm.ccc]]' }],
      });

      const noteC = createTestNote({
        properties: { id: 'cm.ccc' as NoteId, author: 'human', created: '2024-12-01' },
        content: [{ indent: 0, content: 'Popular note' }],
      });

      manager.rebuildAll([noteA, noteB, noteC]);

      expect(manager.getBacklinkCount('cm.ccc' as NoteId)).toBe(2);
      expect(manager.getBacklinkCount('cm.aaa' as NoteId)).toBe(0);
    });
  });
});
