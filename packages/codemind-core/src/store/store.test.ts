// NoteStore 單元測試
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createNoteStore, type NoteStore } from './index.js';
import type { NoteId } from '../types/index.js';

// 測試用的 codemind.md 內容
const TEST_CONTENT = `- # CodeMind
  id:: project-root
  type:: project
  name:: Test Project
  created:: 2024-12-01
  - ## Map
    collapsed:: true
    - 📄 test.ts
      - test.ts/abc123 Test note [1]

- [[cm.abc123|test.ts/abc123]]
  id:: cm.abc123
  file:: test.ts
  line:: 10
  author:: human
  created:: 2024-12-01
  - This is a test note
  - It references [[cm.def456]]

- [[cm.def456|test.ts/def456]]
  id:: cm.def456
  file:: test.ts
  line:: 20
  author:: ai
  created:: 2024-12-01
  - Another note
  - Referenced by abc123

- [[cm.orphan|other.ts/orphan]]
  id:: cm.orphan
  file:: other.ts
  line:: 5
  author:: human
  created:: 2024-12-01
  - This is an orphan note
`;

describe('NoteStore', () => {
  let tempDir: string;
  let codemindPath: string;
  let store: NoteStore;

  beforeEach(() => {
    // 建立臨時目錄和檔案
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codemind-test-'));
    codemindPath = path.join(tempDir, 'codemind.md');
    fs.writeFileSync(codemindPath, TEST_CONTENT, 'utf-8');

    // 建立 store (關閉 autoSave 以便測試)
    store = createNoteStore(codemindPath, { autoSave: false });
  });

  afterEach(() => {
    // 清理臨時目錄
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Query Operations', () => {
    it('should get note by ID', () => {
      const note = store.getNote('cm.abc123' as NoteId);
      expect(note).not.toBeNull();
      expect(note?.properties.id).toBe('cm.abc123');
      expect(note?.properties.file).toBe('test.ts');
    });

    it('should return null for non-existent note', () => {
      const note = store.getNote('cm.notexist' as NoteId);
      expect(note).toBeNull();
    });

    it('should get note by path', () => {
      const note = store.getNoteByPath('test.ts/abc123');
      expect(note).not.toBeNull();
      expect(note?.properties.id).toBe('cm.abc123');
    });

    it('should get all notes', () => {
      const notes = store.getAllNotes();
      expect(notes.length).toBe(3);
    });

    it('should get notes in file', () => {
      const notes = store.getNotesInFile('test.ts');
      expect(notes.length).toBe(2);
      expect(notes.every(n => n.properties.file === 'test.ts')).toBe(true);
    });

    it('should get children of parent note', () => {
      // 建立一個有子筆記的情況
      const parent = store.addNote('test.ts', 'Parent note');
      const child = store.addNote('test.ts', 'Child note', parent.properties.id);

      const children = store.getChildren(parent.properties.id);
      expect(children.length).toBe(1);
      expect(children[0]?.properties.id).toBe(child.properties.id);
    });
  });

  describe('Link Operations', () => {
    it('should get backlinks', () => {
      const backlinks = store.getBacklinks('cm.def456' as NoteId);
      expect(backlinks.length).toBe(1);
      expect(backlinks[0]?.properties.id).toBe('cm.abc123');
    });

    it('should get related notes', () => {
      const related = store.getRelated('cm.abc123' as NoteId, 1);
      expect(related.length).toBeGreaterThan(0);

      const outgoing = related.filter(r => r.direction === 'outgoing');
      expect(outgoing.some(r => r.note.properties.id === 'cm.def456')).toBe(true);
    });

    it('should get orphan notes', () => {
      const orphans = store.getOrphans();
      expect(orphans.length).toBe(1);
      expect(orphans[0]?.properties.id).toBe('cm.orphan');
    });

    it('should get popular notes', () => {
      const popular = store.getPopular(10);
      expect(popular.length).toBeGreaterThan(0);
      expect(popular[0]?.properties.id).toBe('cm.def456');
    });
  });

  describe('Search Operations', () => {
    it('should search notes by content', () => {
      const results = store.search('test note');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.note.properties.id).toBe('cm.abc123');
    });

    it('should search notes by file name', () => {
      const results = store.search('other.ts');
      expect(results.some(r => r.note.properties.file === 'other.ts')).toBe(true);
    });

    it('should return empty for no matches', () => {
      const results = store.search('xyznonexistent');
      expect(results.length).toBe(0);
    });

    it('should respect limit', () => {
      const results = store.search('note', 1);
      expect(results.length).toBe(1);
    });
  });

  describe('Modification Operations', () => {
    it('should add a new note', () => {
      const note = store.addNote('new.ts', 'New note content');

      expect(note.properties.id).toMatch(/^cm\.[a-z0-9]{6}$/);
      expect(note.properties.file).toBe('new.ts');
      expect(note.content[0]?.content).toBe('New note content');

      // 確認已加入 store
      const retrieved = store.getNote(note.properties.id);
      expect(retrieved).not.toBeNull();
    });

    it('should add a child note', () => {
      const parent = store.addNote('test.ts', 'Parent');
      const child = store.addNote('test.ts', 'Child', parent.properties.id);

      expect(child.properties.parent).toBe(parent.properties.id);
      expect(parent.children.length).toBe(1);
      expect(parent.children[0]?.properties.id).toBe(child.properties.id);
    });

    it('should update note content', () => {
      const note = store.getNote('cm.abc123' as NoteId);
      expect(note).not.toBeNull();

      const updated = store.updateNote('cm.abc123' as NoteId, 'Updated content');
      expect(updated.content[0]?.content).toBe('Updated content');
    });

    it('should throw when updating non-existent note', () => {
      expect(() => {
        store.updateNote('cm.notexist' as NoteId, 'content');
      }).toThrow('Note not found');
    });

    it('should delete a note', () => {
      const note = store.addNote('test.ts', 'To delete');
      const id = note.properties.id;

      store.deleteNote(id);
      expect(store.getNote(id)).toBeNull();
    });

    it('should delete child notes when deleting parent', () => {
      const parent = store.addNote('test.ts', 'Parent');
      const child = store.addNote('test.ts', 'Child', parent.properties.id);

      store.deleteNote(parent.properties.id);

      expect(store.getNote(parent.properties.id)).toBeNull();
      expect(store.getNote(child.properties.id)).toBeNull();
    });

    it('should move note to new file', () => {
      const note = store.addNote('old.ts', 'To move');
      const moved = store.moveNote(note.properties.id, 'new.ts', 100);

      expect(moved.properties.file).toBe('new.ts');
      expect(moved.properties.line).toBe(100);
      expect(moved.displayPath).toContain('new.ts');
    });
  });

  describe('Sync Operations', () => {
    it('should save and reload', () => {
      const note = store.addNote('sync.ts', 'Sync test');
      store.save();

      // 建立新 store 讀取檔案
      const newStore = createNoteStore(codemindPath, { autoSave: false });
      const loaded = newStore.getNote(note.properties.id);

      expect(loaded).not.toBeNull();
      expect(loaded?.content[0]?.content).toBe('Sync test');
    });

    it('should reload from file', () => {
      // 修改檔案
      fs.writeFileSync(
        codemindPath,
        `- [[cm.newone|new.ts/newone]]
  id:: cm.newone
  file:: new.ts
  author:: human
  created:: 2024-12-01
  - Reloaded note
`,
        'utf-8'
      );

      store.reload();

      const note = store.getNote('cm.newone' as NoteId);
      expect(note).not.toBeNull();
      expect(note?.content[0]?.content).toBe('Reloaded note');
    });
  });

  describe('Empty Store', () => {
    it('should handle non-existent file', () => {
      const emptyPath = path.join(tempDir, 'nonexistent.md');
      const emptyStore = createNoteStore(emptyPath, { autoSave: false });

      expect(emptyStore.getAllNotes().length).toBe(0);
      expect(emptyStore.getProjectRoot()).toBeNull();
    });
  });

  describe('Custom ID Generator', () => {
    it('should use custom ID generator', () => {
      let counter = 0;
      const customStore = createNoteStore(codemindPath, {
        autoSave: false,
        generateId: () => `cm.custom${counter++}` as NoteId,
      });

      const note1 = customStore.addNote('test.ts', 'Note 1');
      const note2 = customStore.addNote('test.ts', 'Note 2');

      expect(note1.properties.id).toBe('cm.custom0');
      expect(note2.properties.id).toBe('cm.custom1');
    });
  });
});
