// NoteStore module - 資料存取層
// Phase 1.5 實作

import * as fs from 'fs';
import type {
  Note,
  NoteId,
  NotePath,
  NoteProperties,
  NoteLine,
  RelatedNote,
  SearchResult,
  SearchMatch,
  ProjectRoot,
  ParseResult,
} from '../types/index.js';
import { createParser } from '../parser/index.js';
import { createWriter } from '../writer/index.js';
import { createBacklinkManager, type BacklinkManager } from '../linker/index.js';

/**
 * NoteStore 介面
 */
export interface NoteStore {
  // 查詢
  getNote(id: NoteId): Note | null;
  getNoteByPath(path: NotePath): Note | null;
  getAllNotes(): Note[];
  getNotesInFile(file: string): Note[];
  getChildren(parentId: NoteId): Note[];

  // 連結查詢
  getBacklinks(id: NoteId): Note[];
  getRelated(id: NoteId, depth?: number): RelatedNote[];
  getOrphans(): Note[];
  getPopular(limit?: number): Note[];

  // 搜尋
  search(query: string, limit?: number): SearchResult[];

  // 修改
  addNote(file: string, content: string, parentId?: NoteId, noteId?: NoteId): Note;
  updateNote(id: NoteId, content: string): Note;
  deleteNote(id: NoteId): void;
  moveNote(id: NoteId, newFile: string, newLine?: number): Note;

  // 同步
  reload(): void;
  save(): void;

  // 存取內部狀態 (供測試和進階用途)
  getProjectRoot(): ProjectRoot | null;
  getParseResult(): ParseResult | null;
}

/**
 * NoteStore 選項
 */
export interface NoteStoreOptions {
  /** ID 產生器 (可選，預設使用內建) */
  generateId?: () => NoteId;
  /** 是否自動儲存 (預設: true) */
  autoSave?: boolean;
}

/**
 * 預設 ID 產生器 (簡單版本，後續 Phase 1.6 會改進)
 */
function defaultGenerateId(): NoteId {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let hash = '';
  for (let i = 0; i < 6; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return `cm.${hash}` as NoteId;
}

/**
 * 建立 NoteStore 實例
 */
export function createNoteStore(codemindPath: string, options: NoteStoreOptions = {}): NoteStore {
  const { generateId = defaultGenerateId, autoSave = true } = options;

  // 內部狀態
  let projectRoot: ProjectRoot | null = null;
  let notesMap: Map<NoteId, Note> = new Map();
  let parseResult: ParseResult | null = null;
  let backlinkManager: BacklinkManager = createBacklinkManager();
  let isDirty = false;

  // 工具
  const parser = createParser();
  const writer = createWriter();

  /**
   * 從檔案載入
   */
  function load(): void {
    if (!fs.existsSync(codemindPath)) {
      // 檔案不存在，初始化空狀態
      projectRoot = null;
      notesMap = new Map();
      parseResult = null;
      backlinkManager = createBacklinkManager();
      return;
    }

    const content = fs.readFileSync(codemindPath, 'utf-8');
    parseResult = parser.parse(content);
    projectRoot = parseResult.projectRoot;
    notesMap = parseResult.notes;

    // 重建 backlinks
    const allNotes = getAllNotesInternal();
    backlinkManager.rebuildAll(allNotes);
  }

  /**
   * 取得所有筆記 (內部使用，含子筆記)
   */
  function getAllNotesInternal(): Note[] {
    const all: Note[] = [];
    function collect(notes: Note[]) {
      for (const note of notes) {
        all.push(note);
        if (note.children.length > 0) {
          collect(note.children);
        }
      }
    }
    collect(Array.from(notesMap.values()).filter(n => !n.properties.parent));
    return all;
  }

  /**
   * 取得頂層筆記
   */
  function getTopLevelNotes(): Note[] {
    return Array.from(notesMap.values()).filter(n => !n.properties.parent);
  }

  /**
   * 儲存到檔案
   */
  function saveToFile(): void {
    const topLevelNotes = getTopLevelNotes();
    const content = writer.write(projectRoot, topLevelNotes);

    // Atomic write
    const tempPath = codemindPath + '.tmp';
    fs.writeFileSync(tempPath, content, 'utf-8');
    fs.renameSync(tempPath, codemindPath);
    isDirty = false;
  }

  /**
   * 標記為已修改
   */
  function markDirty(): void {
    isDirty = true;
    if (autoSave) {
      saveToFile();
    }
  }

  /**
   * 建立顯示路徑
   */
  function buildDisplayPath(file: string, id: NoteId, parentId?: NoteId): NotePath {
    const idHash = id.replace('cm.', '');
    if (parentId) {
      const parentHash = parentId.replace('cm.', '');
      return `${file}/${parentHash}/${idHash}`;
    }
    return `${file}/${idHash}`;
  }

  /**
   * 更新 backlink 計數
   */
  function updateBacklinkCounts(): void {
    for (const [id, note] of notesMap) {
      const count = backlinkManager.getBacklinkCount(id);
      if (count > 0) {
        note.properties.backlink_count = count;
        note.properties.backlinks = backlinkManager.getBackwardLinks(id);
      } else {
        delete note.properties.backlink_count;
        delete note.properties.backlinks;
      }
    }
  }

  // 初始載入
  load();

  // 實作 NoteStore 介面
  return {
    // === 查詢 ===

    getNote(id: NoteId): Note | null {
      return notesMap.get(id) || null;
    },

    getNoteByPath(notePath: NotePath): Note | null {
      for (const note of notesMap.values()) {
        if (note.displayPath === notePath) {
          return note;
        }
      }
      return null;
    },

    getAllNotes(): Note[] {
      return Array.from(notesMap.values());
    },

    getNotesInFile(file: string): Note[] {
      return Array.from(notesMap.values()).filter(n => n.properties.file === file);
    },

    getChildren(parentId: NoteId): Note[] {
      const parent = notesMap.get(parentId);
      return parent ? parent.children : [];
    },

    // === 連結查詢 ===

    getBacklinks(id: NoteId): Note[] {
      const backlinkIds = backlinkManager.getBackwardLinks(id);
      return backlinkIds.map(bid => notesMap.get(bid)).filter((n): n is Note => n !== undefined);
    },

    getRelated(id: NoteId, depth: number = 1): RelatedNote[] {
      const result: RelatedNote[] = [];
      const visited = new Set<NoteId>([id]);

      function traverse(
        currentId: NoteId,
        currentDepth: number,
        direction: 'outgoing' | 'incoming'
      ) {
        if (currentDepth > depth) return;

        const links =
          direction === 'outgoing'
            ? backlinkManager.getForwardLinks(currentId)
            : backlinkManager.getBackwardLinks(currentId);

        for (const linkedId of links) {
          if (visited.has(linkedId)) continue;
          visited.add(linkedId);

          const note = notesMap.get(linkedId);
          if (note) {
            result.push({ note, direction, depth: currentDepth });
            traverse(linkedId, currentDepth + 1, direction);
          }
        }
      }

      traverse(id, 1, 'outgoing');
      traverse(id, 1, 'incoming');

      return result;
    },

    getOrphans(): Note[] {
      return Array.from(notesMap.values()).filter(note => {
        const id = note.properties.id;
        const hasBacklinks = backlinkManager.getBacklinkCount(id) > 0;
        const hasForwardLinks = backlinkManager.getForwardLinks(id).length > 0;
        return !hasBacklinks && !hasForwardLinks && !note.properties.parent;
      });
    },

    getPopular(limit: number = 10): Note[] {
      const notesWithCounts = Array.from(notesMap.values())
        .map(note => ({
          note,
          count: backlinkManager.getBacklinkCount(note.properties.id),
        }))
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count);

      return notesWithCounts.slice(0, limit).map(item => item.note);
    },

    // === 搜尋 ===

    search(query: string, limit: number = 20): SearchResult[] {
      const results: SearchResult[] = [];
      const queryLower = query.toLowerCase();
      const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 0);

      for (const note of notesMap.values()) {
        const matches: SearchMatch[] = [];
        let score = 0;

        // 搜尋內容
        note.content.forEach((line, lineIdx) => {
          const contentLower = line.content.toLowerCase();

          for (const term of queryTerms) {
            const idx = contentLower.indexOf(term);
            if (idx !== -1) {
              matches.push({
                line: lineIdx,
                content: line.content,
                highlight: [idx, idx + term.length],
              });
              score += 1;

              // 完全匹配加分
              if (contentLower === term) {
                score += 2;
              }
            }
          }
        });

        let hasPathMatch = false;

        // 搜尋檔案路徑
        if (note.properties.file) {
          const fileLower = note.properties.file.toLowerCase();
          for (const term of queryTerms) {
            if (fileLower.includes(term)) {
              score += 0.5;
              hasPathMatch = true;
            }
          }
        }

        // 搜尋 displayPath
        const pathLower = note.displayPath.toLowerCase();
        for (const term of queryTerms) {
          if (pathLower.includes(term)) {
            score += 0.5;
            hasPathMatch = true;
          }
        }

        // backlink 次數加分 (只有當有其他匹配時)
        if (matches.length > 0 || hasPathMatch) {
          score += backlinkManager.getBacklinkCount(note.properties.id) * 0.1;
        }

        if (matches.length > 0 || hasPathMatch) {
          results.push({ note, matches, score });
        }
      }

      // 按分數排序
      results.sort((a, b) => b.score - a.score);

      return results.slice(0, limit);
    },

    // === 修改 ===

    addNote(file: string, content: string, parentId?: NoteId, noteId?: NoteId): Note {
      // 使用提供的 ID 或產生新 ID (確保唯一)
      let newId: NoteId;
      if (noteId && !notesMap.has(noteId)) {
        newId = noteId;
      } else {
        do {
          newId = generateId();
        } while (notesMap.has(newId));
      }

      // 建立筆記屬性
      const properties: NoteProperties = {
        id: newId,
        file,
        author: 'human',
        created: new Date().toISOString().split('T')[0] || '',
      };

      if (parentId) {
        properties.parent = parentId;
      }

      // 建立筆記內容
      const contentLines: NoteLine[] = content.split('\n').map(line => ({
        indent: 0,
        content: line,
      }));

      // 建立筆記
      const displayPath = buildDisplayPath(file, newId, parentId);
      const newNote: Note = {
        properties,
        content: contentLines,
        children: [],
        displayPath,
      };

      // 加入 Map
      notesMap.set(newId, newNote);

      // 如果有父筆記，加入父筆記的 children
      if (parentId) {
        const parent = notesMap.get(parentId);
        if (parent) {
          parent.children.push(newNote);
        }
      }

      // 更新 backlinks
      backlinkManager.updateForNote(newNote, '', content);
      updateBacklinkCounts();

      markDirty();
      return newNote;
    },

    updateNote(id: NoteId, content: string): Note {
      const note = notesMap.get(id);
      if (!note) {
        throw new Error(`Note not found: ${id}`);
      }

      // 儲存舊內容
      const oldContent = note.content.map(l => l.content).join('\n');

      // 更新內容
      const contentLines: NoteLine[] = content.split('\n').map(line => ({
        indent: 0,
        content: line,
      }));
      note.content = contentLines;

      // 更新 backlinks
      backlinkManager.updateForNote(note, oldContent, content);
      updateBacklinkCounts();

      markDirty();
      return note;
    },

    deleteNote(id: NoteId): void {
      const note = notesMap.get(id);
      if (!note) {
        throw new Error(`Note not found: ${id}`);
      }

      // 先刪除所有子筆記
      for (const child of note.children) {
        this.deleteNote(child.properties.id);
      }

      // 從父筆記中移除
      if (note.properties.parent) {
        const parent = notesMap.get(note.properties.parent);
        if (parent) {
          parent.children = parent.children.filter(c => c.properties.id !== id);
        }
      }

      // 從 backlink manager 移除
      backlinkManager.removeNote(id);

      // 從 Map 移除
      notesMap.delete(id);

      updateBacklinkCounts();
      markDirty();
    },

    moveNote(id: NoteId, newFile: string, newLine?: number): Note {
      const note = notesMap.get(id);
      if (!note) {
        throw new Error(`Note not found: ${id}`);
      }

      // 更新屬性
      note.properties.file = newFile;
      if (newLine !== undefined) {
        note.properties.line = newLine;
      }

      // 更新 displayPath
      note.displayPath = buildDisplayPath(newFile, id, note.properties.parent);

      // 遞迴更新子筆記的 displayPath
      function updateChildrenPath(parentNote: Note) {
        for (const child of parentNote.children) {
          child.properties.file = newFile;
          child.displayPath = buildDisplayPath(
            newFile,
            child.properties.id,
            parentNote.properties.id
          );
          updateChildrenPath(child);
        }
      }
      updateChildrenPath(note);

      markDirty();
      return note;
    },

    // === 同步 ===

    reload(): void {
      load();
    },

    save(): void {
      if (isDirty || !autoSave) {
        saveToFile();
      }
    },

    // === 存取內部狀態 ===

    getProjectRoot(): ProjectRoot | null {
      return projectRoot;
    },

    getParseResult(): ParseResult | null {
      return parseResult;
    },
  };
}
