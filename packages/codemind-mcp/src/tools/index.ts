// MCP Tools module
// Phase 3.2 實作

import {
  createNoteStore,
  type NoteStore,
  type NoteId,
  type Note,
  type SearchResult,
  type RelatedNote,
} from '@uncle6/codemind-core';

/**
 * 筆記詳情
 */
export interface NoteDetail {
  id: NoteId;
  displayPath: string;
  content: string;
  properties: Record<string, unknown>;
  related: NoteId[];
  backlinks: BacklinkInfo[];
  children: NoteId[];
}

/**
 * Backlink 資訊
 */
export interface BacklinkInfo {
  noteId: NoteId;
  displayPath: string;
  context: string;
}

/**
 * 專案上下文
 */
export interface ProjectContext {
  name: string;
  description: string;
  projectNotes: string[];
  map: string;
  topReferenced: { id: NoteId; displayPath: string; backlinkCount: number }[];
  recent: { id: NoteId; displayPath: string; created: string }[];
}

/**
 * MCP Tools 介面
 */
export interface MCPTools {
  expand_file(filePath: string): Promise<string>;
  get_map(): Promise<string>;
  get_note(noteId: string): Promise<NoteDetail | null>;
  search_notes(query: string, limit?: number): Promise<SearchResult[]>;
  get_backlinks(noteId: string): Promise<BacklinkInfo[]>;
  get_related(noteId: string, depth?: number): Promise<NoteDetail[]>;
  add_note(filePath: string, content: string, parentId?: string): Promise<{ noteId: string }>;
  get_project_context(): Promise<ProjectContext>;
  reload(): void;
}

/**
 * 將 Note 轉換為 NoteDetail
 */
function noteToDetail(note: Note, store: NoteStore): NoteDetail {
  const backlinks = store.getBacklinks(note.properties.id);

  return {
    id: note.properties.id,
    displayPath: note.displayPath,
    content: note.content.map(line => '  '.repeat(line.indent) + line.content).join('\n'),
    properties: {
      file: note.properties.file,
      line: note.properties.line,
      author: note.properties.author,
      created: note.properties.created,
      parent: note.properties.parent,
      related: note.properties.related,
      backlink_count: note.properties.backlink_count,
    },
    related: note.properties.related || [],
    backlinks: backlinks.map(bl => ({
      noteId: bl.properties.id,
      displayPath: bl.displayPath,
      context: bl.content[0]?.content || '',
    })),
    children: note.children.map(c => c.properties.id),
  };
}

/**
 * 格式化筆記為展開格式
 */
function formatNoteExpanded(note: Note, store: NoteStore, indent: number = 0): string {
  const lines: string[] = [];
  const prefix = '  '.repeat(indent);

  // 標題行
  lines.push(`${prefix}[[${note.properties.id}|${note.displayPath}]]`);

  // 屬性
  lines.push(`${prefix}  id:: ${note.properties.id}`);
  if (note.properties.file) lines.push(`${prefix}  file:: ${note.properties.file}`);
  if (note.properties.line) lines.push(`${prefix}  line:: ${note.properties.line}`);
  lines.push(`${prefix}  author:: ${note.properties.author}`);
  lines.push(`${prefix}  created:: ${note.properties.created}`);

  // Backlinks 資訊
  const backlinks = store.getBacklinks(note.properties.id);
  if (backlinks.length > 0) {
    lines.push(
      `${prefix}  backlinks:: ${backlinks.map(bl => `[[${bl.properties.id}]]`).join(', ')}`
    );
    lines.push(`${prefix}  backlink_count:: ${backlinks.length}`);
  }

  // 內容
  for (const line of note.content) {
    lines.push(`${prefix}  ${'  '.repeat(line.indent)}- ${line.content}`);
  }

  // 子筆記
  for (const child of note.children) {
    lines.push(formatNoteExpanded(child, store, indent + 1));
  }

  return lines.join('\n');
}

/**
 * 建立 MCP Tools
 */
export function createMCPTools(codemindPath: string): MCPTools {
  const store: NoteStore = createNoteStore(codemindPath, { autoSave: true });

  return {
    /**
     * 展開檔案中的所有筆記
     */
    async expand_file(filePath: string): Promise<string> {
      const notes = store.getNotesInFile(filePath);

      if (notes.length === 0) {
        return `# No notes found in ${filePath}`;
      }

      const lines: string[] = [`# Notes in ${filePath}`, ''];

      // 只展開頂層筆記（非子筆記）
      const topLevel = notes.filter(n => !n.properties.parent);

      for (const note of topLevel) {
        lines.push(formatNoteExpanded(note, store));
        lines.push('');
      }

      return lines.join('\n');
    },

    /**
     * 取得專案地圖
     */
    async get_map(): Promise<string> {
      const projectRoot = store.getProjectRoot();
      const allNotes = store.getAllNotes();

      const lines: string[] = ['# Code-Mind Map', ''];

      if (projectRoot) {
        lines.push(`Project: ${projectRoot.name}`);
        lines.push(`Created: ${projectRoot.created}`);
        lines.push('');
      }

      // 按檔案分組
      const byFile = new Map<string, Note[]>();
      for (const note of allNotes) {
        if (note.properties.parent) continue; // 跳過子筆記
        const file = note.properties.file || 'unknown';
        const existing = byFile.get(file) || [];
        existing.push(note);
        byFile.set(file, existing);
      }

      // 輸出每個檔案的筆記
      const sortedFiles = [...byFile.keys()].sort();
      for (const file of sortedFiles) {
        const fileNotes = byFile.get(file) || [];
        lines.push(`## 📄 ${file}`);

        // 按 backlink 數量排序
        const sorted = [...fileNotes].sort(
          (a, b) => (b.properties.backlink_count || 0) - (a.properties.backlink_count || 0)
        );

        for (const note of sorted) {
          const count = note.properties.backlink_count || 0;
          const summary = note.content[0]?.content || '';
          const truncated = summary.length > 50 ? summary.slice(0, 47) + '...' : summary;
          lines.push(`  - [[${note.properties.id}|${note.displayPath}]] ${truncated} [${count}]`);

          // 子筆記
          for (const child of note.children) {
            const childCount = child.properties.backlink_count || 0;
            const childSummary = child.content[0]?.content || '';
            const childTruncated =
              childSummary.length > 40 ? childSummary.slice(0, 37) + '...' : childSummary;
            lines.push(
              `    - [[${child.properties.id}|${child.displayPath}]] ${childTruncated} [${childCount}]`
            );
          }
        }
        lines.push('');
      }

      return lines.join('\n');
    },

    /**
     * 取得筆記詳情
     */
    async get_note(noteId: string): Promise<NoteDetail | null> {
      const note = store.getNote(noteId as NoteId);
      if (!note) return null;
      return noteToDetail(note, store);
    },

    /**
     * 搜尋筆記
     */
    async search_notes(query: string, limit: number = 20): Promise<SearchResult[]> {
      return store.search(query, limit);
    },

    /**
     * 取得 backlinks
     */
    async get_backlinks(noteId: string): Promise<BacklinkInfo[]> {
      const backlinks = store.getBacklinks(noteId as NoteId);
      return backlinks.map(note => ({
        noteId: note.properties.id,
        displayPath: note.displayPath,
        context: note.content[0]?.content || '',
      }));
    },

    /**
     * 取得關聯筆記
     */
    async get_related(noteId: string, depth: number = 1): Promise<NoteDetail[]> {
      const related = store.getRelated(noteId as NoteId, depth);
      return related.map((r: RelatedNote) => noteToDetail(r.note, store));
    },

    /**
     * 新增筆記
     */
    async add_note(
      filePath: string,
      content: string,
      parentId?: string
    ): Promise<{ noteId: string }> {
      const note = store.addNote(filePath, content, parentId as NoteId | undefined);
      return { noteId: note.properties.id };
    },

    /**
     * 取得專案上下文
     */
    async get_project_context(): Promise<ProjectContext> {
      const projectRoot = store.getProjectRoot();
      const allNotes = store.getAllNotes();

      // 取得最多引用的筆記
      const popular = store.getPopular(10);
      const topReferenced = popular.map(note => ({
        id: note.properties.id,
        displayPath: note.displayPath,
        backlinkCount: note.properties.backlink_count || 0,
      }));

      // 取得最近建立的筆記
      const sorted = [...allNotes].sort((a, b) => {
        const dateA = a.properties.created || '';
        const dateB = b.properties.created || '';
        return dateB.localeCompare(dateA);
      });
      const recent = sorted.slice(0, 10).map(note => ({
        id: note.properties.id,
        displayPath: note.displayPath,
        created: note.properties.created,
      }));

      // 產生地圖摘要
      const mapSummary = await this.get_map();

      return {
        name: projectRoot?.name || 'Unnamed Project',
        description: `Project with ${allNotes.length} notes`,
        projectNotes: projectRoot?.projectNotes.map(n => n.content) || [],
        map: mapSummary,
        topReferenced,
        recent,
      };
    },

    /**
     * 重新載入資料
     */
    reload(): void {
      store.reload();
    },
  };
}
