// MCP Tools 單元測試
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createMCPTools, type MCPTools } from './index.js';

// 測試用的 codemind.md 內容
const TEST_CONTENT = `- # CodeMind
  id:: project-root
  type:: project
  name:: Test Project
  created:: 2024-12-01
  - ## Map
    collapsed:: true

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
  created:: 2024-12-02
  - Another note
  - Referenced by abc123

- [[cm.orphan|other.ts/orphan]]
  id:: cm.orphan
  file:: other.ts
  line:: 5
  author:: human
  created:: 2024-12-03
  - This is an orphan note
`;

describe('MCPTools', () => {
  let tempDir: string;
  let codemindPath: string;
  let tools: MCPTools;

  beforeEach(() => {
    // 建立臨時目錄和檔案
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-tools-test-'));
    codemindPath = path.join(tempDir, 'codemind.md');
    fs.writeFileSync(codemindPath, TEST_CONTENT, 'utf-8');

    // 建立 tools
    tools = createMCPTools(codemindPath);
  });

  afterEach(() => {
    // 清理臨時目錄
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('expand_file', () => {
    it('should expand notes in a file', async () => {
      const result = await tools.expand_file('test.ts');

      expect(result).toContain('# Notes in test.ts');
      expect(result).toContain('[[cm.abc123|test.ts/abc123]]');
      expect(result).toContain('[[cm.def456|test.ts/def456]]');
      expect(result).toContain('This is a test note');
    });

    it('should return message for empty file', async () => {
      const result = await tools.expand_file('nonexistent.ts');

      expect(result).toContain('No notes found');
    });
  });

  describe('get_map', () => {
    it('should return project map', async () => {
      const result = await tools.get_map();

      expect(result).toContain('# Code-Mind Map');
      expect(result).toContain('Test Project');
      expect(result).toContain('## 📄 test.ts');
      expect(result).toContain('## 📄 other.ts');
    });

    it('should show backlink counts', async () => {
      const result = await tools.get_map();

      expect(result).toMatch(/\[\d+\]/);
    });
  });

  describe('get_note', () => {
    it('should return note details', async () => {
      const result = await tools.get_note('cm.abc123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('cm.abc123');
      expect(result?.displayPath).toBe('test.ts/abc123');
      expect(result?.content).toContain('test note');
    });

    it('should include backlinks', async () => {
      const result = await tools.get_note('cm.def456');

      expect(result).not.toBeNull();
      expect(result?.backlinks.length).toBe(1);
      expect(result?.backlinks[0]?.noteId).toBe('cm.abc123');
    });

    it('should return null for non-existent note', async () => {
      const result = await tools.get_note('cm.nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('search_notes', () => {
    it('should find notes by content', async () => {
      const results = await tools.search_notes('test note');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.note.properties.id).toBe('cm.abc123');
    });

    it('should find notes by file', async () => {
      const results = await tools.search_notes('other.ts');

      expect(results.some(r => r.note.properties.file === 'other.ts')).toBe(true);
    });

    it('should respect limit', async () => {
      const results = await tools.search_notes('note', 1);

      expect(results.length).toBe(1);
    });
  });

  describe('get_backlinks', () => {
    it('should return backlinks', async () => {
      const backlinks = await tools.get_backlinks('cm.def456');

      expect(backlinks.length).toBe(1);
      expect(backlinks[0]?.noteId).toBe('cm.abc123');
      expect(backlinks[0]?.displayPath).toBe('test.ts/abc123');
    });

    it('should return empty for no backlinks', async () => {
      const backlinks = await tools.get_backlinks('cm.abc123');

      expect(backlinks.length).toBe(0);
    });
  });

  describe('get_related', () => {
    it('should return related notes', async () => {
      const related = await tools.get_related('cm.abc123', 1);

      expect(related.length).toBeGreaterThan(0);
      expect(related.some(r => r.id === 'cm.def456')).toBe(true);
    });
  });

  describe('add_note', () => {
    it('should add a new note', async () => {
      const result = await tools.add_note('new.ts', 'New note content');

      expect(result.noteId).toMatch(/^cm\.[a-z0-9]+$/);

      // 驗證新筆記已加入
      const note = await tools.get_note(result.noteId);
      expect(note).not.toBeNull();
      expect(note?.content).toContain('New note content');
    });
  });

  describe('get_project_context', () => {
    it('should return project context', async () => {
      const context = await tools.get_project_context();

      expect(context.name).toBe('Test Project');
      expect(context.description).toContain('notes');
      expect(context.map).toContain('# Code-Mind Map');
      expect(context.topReferenced.length).toBeGreaterThanOrEqual(0);
      expect(context.recent.length).toBeGreaterThan(0);
    });
  });

  describe('reload', () => {
    it('should reload data from file', async () => {
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

      tools.reload();

      const note = await tools.get_note('cm.newone');
      expect(note).not.toBeNull();
    });
  });
});
