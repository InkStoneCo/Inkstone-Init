// Processor 單元測試
import { describe, it, expect } from 'vitest';
import {
  createProcessor,
  PATTERNS,
  parseMultilineContent,
  formatNoteContent,
} from './processor.js';
import type { NoteId } from '@uncle6/codemind-core';

describe('PATTERNS', () => {
  describe('newNote', () => {
    it('should match simple new note marker', () => {
      const text = '[[cm.ywdgm7|packages/daemon/src/processor.test.ts/ywdgm7]]';
      const pattern = new RegExp(PATTERNS.newNote.source, 'gs');
      const match = pattern.exec(text);

      expect(match).not.toBeNull();
      expect(match![1]).toBe('This is a note');
    });

    it('should match multiline content', () => {
      const text = '[[cm.o87r95|packages/daemon/src/processor.test.ts/o87r95]]';
      const pattern = new RegExp(PATTERNS.newNote.source, 'gs');
      const match = pattern.exec(text);

      expect(match).not.toBeNull();
      expect(match![1]).toBe('Line 1\nLine 2');
    });
  });

  describe('childNote', () => {
    it('should match child note marker', () => {
      const text = '{{codemind.cm.abc123: Child content}}';
      const pattern = new RegExp(PATTERNS.childNote.source, 'gs');
      const match = pattern.exec(text);

      expect(match).not.toBeNull();
      expect(match![1]).toBe('cm.abc123');
      expect(match![2]).toBe('Child content');
    });
  });

  describe('updateNote', () => {
    it('should match update marker', () => {
      const text = '[[cm.abc123]]: Updated content';
      const pattern = new RegExp(PATTERNS.updateNote.source, 'gm');
      const match = pattern.exec(text);

      expect(match).not.toBeNull();
      expect(match![1]).toBe('cm.abc123');
      expect(match![2]).toBe('Updated content');
    });

    it('should match update with display text', () => {
      const text = '[[cm.abc123|display]]: Updated content';
      const pattern = new RegExp(PATTERNS.updateNote.source, 'gm');
      const match = pattern.exec(text);

      expect(match).not.toBeNull();
      expect(match![1]).toBe('cm.abc123');
      expect(match![2]).toBe('Updated content');
    });
  });

  describe('reference', () => {
    it('should match simple reference', () => {
      const text = '[[cm.abc123]]';
      const pattern = new RegExp(PATTERNS.reference.source, 'g');
      const match = pattern.exec(text);

      expect(match).not.toBeNull();
      expect(match![1]).toBe('cm.abc123');
    });

    it('should match reference with display text', () => {
      const text = '[[cm.abc123|My Note]]';
      const pattern = new RegExp(PATTERNS.reference.source, 'g');
      const match = pattern.exec(text);

      expect(match).not.toBeNull();
      expect(match![1]).toBe('cm.abc123');
      expect(match![2]).toBe('My Note');
    });
  });
});

describe('createProcessor', () => {
  const mockGenerateId = (() => {
    let counter = 0;
    return () => `cm.test${counter++}` as NoteId;
  })();

  describe('findMarkers', () => {
    it('should find new note markers', () => {
      const processor = createProcessor({ generateId: mockGenerateId });
      const content = 'Some text [[cm.ozo7c4|packages/daemon/src/processor.test.ts/ozo7c4]] more text';

      const markers = processor.findMarkers(content);

      expect(markers.length).toBe(1);
      expect(markers[0]?.type).toBe('new');
      expect(markers[0]?.content).toBe('New note');
    });

    it('should find multiple markers', () => {
      const processor = createProcessor({ generateId: mockGenerateId });
      const content = '[[cm.xk18jm|packages/daemon/src/processor.test.ts/xk18jm]] and [[cm.94o4rg|packages/daemon/src/processor.test.ts/94o4rg]]';

      const markers = processor.findMarkers(content);

      expect(markers.length).toBe(2);
      expect(markers[0]?.content).toBe('Note 1');
      expect(markers[1]?.content).toBe('Note 2');
    });

    it('should find child note markers', () => {
      const processor = createProcessor({ generateId: mockGenerateId });
      const content = '{{codemind.cm.parent: Child content}}';

      const markers = processor.findMarkers(content);

      expect(markers.length).toBe(1);
      expect(markers[0]?.type).toBe('child');
      expect(markers[0]?.parentId).toBe('cm.parent');
    });

    it('should find update markers', () => {
      const processor = createProcessor({ generateId: mockGenerateId });
      const content = '[[cm.abc123]]: Updated content';

      const markers = processor.findMarkers(content);

      expect(markers.length).toBe(1);
      expect(markers[0]?.type).toBe('update');
      expect(markers[0]?.noteId).toBe('cm.abc123');
    });

    it('should return empty array for no markers', () => {
      const processor = createProcessor({ generateId: mockGenerateId });
      const content = 'Just normal text with [[cm.ref]] reference';

      const markers = processor.findMarkers(content);

      expect(markers.length).toBe(0);
    });
  });

  describe('findReferences', () => {
    it('should find references', () => {
      const processor = createProcessor({ generateId: mockGenerateId });
      const content = 'See [[cm.abc123]] and [[cm.def456|Display]]';

      const refs = processor.findReferences(content);

      expect(refs.length).toBe(2);
      expect(refs[0]?.noteId).toBe('cm.abc123');
      expect(refs[1]?.noteId).toBe('cm.def456');
      expect(refs[1]?.displayText).toBe('Display');
    });
  });

  describe('processFile', () => {
    it('should process new note marker', () => {
      let idCounter = 0;
      const processor = createProcessor({
        generateId: () => `cm.new${idCounter++}` as NoteId,
      });

      const content = 'Code with [[cm.pc86q4|packages/daemon/src/processor.test.ts/pc86q4]] here';
      const result = processor.processFile('test.ts', content);

      expect(result.modified).toBe(true);
      expect(result.changes.length).toBe(1);
      expect(result.changes[0]?.type).toBe('create');
      expect(result.changes[0]?.content).toBe('Important note');
      expect(result.newContent).toContain('[[cm.new0|test.ts/new0]]');
      expect(result.newContent).not.toContain('[[cm.1molk3|packages/daemon/src/processor.test.ts/1molk3]] and [[cm.16silf|packages/daemon/src/processor.test.ts/16silf]]';
      const result = processor.processFile('test.ts', content);

      expect(result.modified).toBe(true);
      expect(result.changes.length).toBe(2);
      expect(result.newContent).toContain('[[cm.m0|test.ts/m0]]');
      expect(result.newContent).toContain('[[cm.m1|test.ts/m1]]');
    });

    it('should process child note marker', () => {
      let idCounter = 0;
      const processor = createProcessor({
        generateId: () => `cm.c${idCounter++}` as NoteId,
        noteExists: () => true,
      });

      const content = '{{codemind.cm.parent: Child note}}';
      const result = processor.processFile('test.ts', content);

      expect(result.modified).toBe(true);
      expect(result.changes[0]?.type).toBe('create_child');
      expect(result.changes[0]?.parentId).toBe('cm.parent');
      expect(result.newContent).toContain('[[cm.c0|test.ts/parent/c0]]');
    });

    it('should skip child note if parent not found', () => {
      const processor = createProcessor({
        generateId: () => `cm.skip` as NoteId,
        noteExists: () => false,
      });

      const content = '{{codemind.cm.nonexistent: Child note}}';
      const result = processor.processFile('test.ts', content);

      expect(result.modified).toBe(false);
      expect(result.changes.length).toBe(0);
    });

    it('should process update marker', () => {
      const processor = createProcessor({
        generateId: () => `cm.xxx` as NoteId,
        noteExists: () => true,
      });

      const content = '[[cm.abc123]]: New content here';
      const result = processor.processFile('test.ts', content);

      expect(result.modified).toBe(true);
      expect(result.changes[0]?.type).toBe('update');
      expect(result.changes[0]?.noteId).toBe('cm.abc123');
      expect(result.changes[0]?.content).toBe('New content here');
      expect(result.newContent).toBe('[[cm.abc123]]');
    });

    it('should not modify if no markers', () => {
      const processor = createProcessor({ generateId: mockGenerateId });

      const content = 'Normal code without markers';
      const result = processor.processFile('test.ts', content);

      expect(result.modified).toBe(false);
      expect(result.newContent).toBe(content);
    });

    it('should preserve line numbers in changes', () => {
      const processor = createProcessor({
        generateId: () => `cm.ln` as NoteId,
      });

      const content = 'Line 1\nLine 2\n[[cm.z0cl95|packages/daemon/src/processor.test.ts/z0cl95]]\nLine 4';
      const result = processor.processFile('test.ts', content);

      expect(result.changes[0]?.line).toBe(3);
    });
  });
});

describe('parseMultilineContent', () => {
  it('should split and trim lines', () => {
    const content = 'Line 1\n  Line 2  \n\nLine 3';
    const lines = parseMultilineContent(content);

    expect(lines).toEqual(['Line 1', 'Line 2', 'Line 3']);
  });
});

describe('formatNoteContent', () => {
  it('should format lines with bullets', () => {
    const lines = ['Line 1', 'Line 2'];
    const formatted = formatNoteContent(lines);

    expect(formatted).toBe('- Line 1\n- Line 2');
  });
});
