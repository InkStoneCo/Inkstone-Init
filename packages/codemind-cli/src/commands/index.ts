// CLI Commands module
// Phase 4.2 實作

import * as fs from 'fs';
import * as path from 'path';
import {
  createNoteStore,
  type NoteStore,
  type Note,
  type NoteId,
} from '@uncle6/codemind-core';
import { createDaemon, type Daemon, type DaemonStatus } from '@uncle6/codemind-daemon';
import {
  output,
  ensureCodemindExists,
  truncate,
  handleError,
  formatDate,
} from '../utils.js';

/**
 * 取得 NoteStore
 */
function getStore(): NoteStore {
  const codemindPath = ensureCodemindExists();
  return createNoteStore(codemindPath, { autoSave: true });
}

/**
 * init 指令 - 初始化專案
 */
export async function initCommand(options: { name?: string }): Promise<void> {
  try {
    const cwd = process.cwd();
    const codemindPath = path.join(cwd, 'codemind.md');

    // 檢查是否已存在
    if (fs.existsSync(codemindPath)) {
      output.warn('codemind.md already exists in this directory.');
      return;
    }

    // 取得專案名稱
    const projectName = options.name || path.basename(cwd);
    const today = formatDate(new Date());

    // 建立初始內容
    const content = `# ${projectName}

- [[project-root]]
  id:: project-root
  name:: ${projectName}
  created:: ${today}
  - Project initialization

## Map

`;

    fs.writeFileSync(codemindPath, content, 'utf-8');
    output.success(`Initialized Code-Mind project: ${projectName}`);
    output.info(`Created: ${codemindPath}`);
  } catch (error) {
    handleError(error);
  }
}

/**
 * daemon 指令 - Daemon 管理
 */
export async function daemonCommand(
  action: 'start' | 'stop' | 'status'
): Promise<void> {
  try {
    const codemindPath = ensureCodemindExists();
    const rootDir = path.dirname(codemindPath);

    const daemon: Daemon = createDaemon({
      rootDir,
      codemindPath,
      watchExtensions: ['.ts', '.js', '.tsx', '.jsx', '.md'],
      ignorePatterns: [],
      debounceMs: 500,
      maxRetries: 3,
    });

    switch (action) {
      case 'start':
        await daemon.start();
        output.success('Daemon started');
        output.info('Watching for file changes...');
        // Note: In real usage, daemon would run persistently
        // For CLI, we just report that it started
        break;

      case 'stop':
        await daemon.stop();
        output.success('Daemon stopped');
        break;

      case 'status': {
        const status: DaemonStatus = daemon.status();
        output.title('Daemon Status');
        output.item(`Running: ${status.running ? 'Yes' : 'No'}`);
        output.item(`Files watched: ${status.watchedFiles}`);
        output.item(`Queue length: ${status.queueLength}`);
        output.item(`Processed: ${status.processedFiles}`);
        output.item(`Errors: ${status.errors}`);
        if (status.lastScan) {
          output.item(`Last scan: ${status.lastScan}`);
        }
        break;
      }

      default:
        output.error(`Unknown daemon action: ${action}`);
        output.info('Valid actions: start, stop, status');
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * map 指令 - 顯示專案地圖
 */
export async function mapCommand(): Promise<void> {
  try {
    const store = getStore();
    const projectRoot = store.getProjectRoot();
    const allNotes = store.getAllNotes();

    output.title('Code-Mind Map');
    output.blank();

    if (projectRoot) {
      output.info(`Project: ${projectRoot.name}`);
      output.info(`Created: ${projectRoot.created}`);
      output.blank();
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
      output.subtitle(`📄 ${file}`);
      const fileNotes = byFile.get(file) || [];

      // 按 backlink 數量排序
      const sorted = [...fileNotes].sort(
        (a, b) =>
          (b.properties.backlink_count || 0) -
          (a.properties.backlink_count || 0)
      );

      for (const note of sorted) {
        const count = note.properties.backlink_count || 0;
        const summary = note.content[0]?.content || '';
        const truncatedSummary = truncate(summary, 50);
        console.log(
          `  [[${note.properties.id}]] ${truncatedSummary} ${output.reference(count)}`
        );

        // 子筆記
        for (const child of note.children) {
          const childCount = child.properties.backlink_count || 0;
          const childSummary = child.content[0]?.content || '';
          const childTruncated = truncate(childSummary, 40);
          console.log(
            `    [[${child.properties.id}]] ${childTruncated} ${output.reference(childCount)}`
          );
        }
      }
      output.blank();
    }

    output.divider();
    output.info(`Total: ${allNotes.length} notes`);
  } catch (error) {
    handleError(error);
  }
}

/**
 * list 指令 - 列出所有筆記
 */
export async function listCommand(options: {
  file?: string;
  limit?: number;
}): Promise<void> {
  try {
    const store = getStore();
    let notes: Note[];

    if (options.file) {
      notes = store.getNotesInFile(options.file);
    } else {
      notes = store.getAllNotes();
    }

    // 排除子筆記，只顯示頂層
    notes = notes.filter(n => !n.properties.parent);

    // 限制數量
    if (options.limit && options.limit > 0) {
      notes = notes.slice(0, options.limit);
    }

    output.title('Notes');
    output.blank();

    if (notes.length === 0) {
      output.info('No notes found.');
      return;
    }

    for (const note of notes) {
      const count = note.properties.backlink_count || 0;
      const summary = note.content[0]?.content || '';
      const truncatedSummary = truncate(summary, 60);
      output.note(note.properties.id, note.displayPath, truncatedSummary);
      console.log(`    refs: ${output.reference(count)} | created: ${note.properties.created}`);
    }

    output.blank();
    output.divider();
    output.info(`Showing ${notes.length} notes`);
  } catch (error) {
    handleError(error);
  }
}

/**
 * show 指令 - 顯示筆記詳情
 */
export async function showCommand(id: string): Promise<void> {
  try {
    const store = getStore();
    const note = store.getNote(id as NoteId);

    if (!note) {
      output.error(`Note not found: ${id}`);
      return;
    }

    output.title(`Note: ${note.displayPath}`);
    output.blank();

    // 屬性
    output.subtitle('Properties');
    output.item(`ID: ${note.properties.id}`);
    if (note.properties.file) output.item(`File: ${note.properties.file}`);
    if (note.properties.line) output.item(`Line: ${note.properties.line}`);
    output.item(`Author: ${note.properties.author}`);
    output.item(`Created: ${note.properties.created}`);
    if (note.properties.parent)
      output.item(`Parent: [[${note.properties.parent}]]`);
    output.blank();

    // 內容
    output.subtitle('Content');
    for (const line of note.content) {
      const prefix = '  '.repeat(line.indent);
      console.log(`  ${prefix}${line.content}`);
    }
    output.blank();

    // Backlinks
    const backlinks = store.getBacklinks(note.properties.id);
    if (backlinks.length > 0) {
      output.subtitle(`Backlinks (${backlinks.length})`);
      for (const bl of backlinks) {
        const summary = bl.content[0]?.content || '';
        output.note(bl.properties.id, bl.displayPath, truncate(summary, 50));
      }
      output.blank();
    }

    // 子筆記
    if (note.children.length > 0) {
      output.subtitle(`Children (${note.children.length})`);
      for (const child of note.children) {
        const summary = child.content[0]?.content || '';
        output.note(
          child.properties.id,
          child.displayPath,
          truncate(summary, 50)
        );
      }
      output.blank();
    }

    // Related
    const related = store.getRelated(note.properties.id, 1);
    if (related.length > 0) {
      output.subtitle(`Related (${related.length})`);
      for (const r of related) {
        const dir = r.direction === 'outgoing' ? '→' : '←';
        const summary = r.note.content[0]?.content || '';
        console.log(
          `  ${dir} [[${r.note.properties.id}]] ${truncate(summary, 40)}`
        );
      }
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * tree 指令 - 樹狀顯示筆記
 */
export async function treeCommand(options: { file?: string }): Promise<void> {
  try {
    const store = getStore();
    let notes: Note[];

    if (options.file) {
      notes = store.getNotesInFile(options.file);
    } else {
      notes = store.getAllNotes();
    }

    // 只顯示頂層筆記
    notes = notes.filter(n => !n.properties.parent);

    output.title('Note Tree');
    output.blank();

    const printTree = (note: Note, indent: number = 0): void => {
      const prefix = '  '.repeat(indent);
      const summary = note.content[0]?.content || '';
      const count = note.properties.backlink_count || 0;
      console.log(
        `${prefix}├─ [[${note.properties.id}]] ${truncate(summary, 40)} ${output.reference(count)}`
      );

      for (const child of note.children) {
        printTree(child, indent + 1);
      }
    };

    for (const note of notes) {
      printTree(note);
    }

    output.blank();
    output.info(`Total: ${notes.length} top-level notes`);
  } catch (error) {
    handleError(error);
  }
}

/**
 * add 指令 - 新增筆記
 */
export async function addCommand(
  file: string,
  content: string,
  options: { parent?: string }
): Promise<void> {
  try {
    const store = getStore();
    const note = store.addNote(
      file,
      content,
      options.parent as NoteId | undefined
    );

    output.success(`Note created: [[${note.properties.id}]]`);
    output.info(`Display path: ${note.displayPath}`);
    output.info(`File: ${file}`);
  } catch (error) {
    handleError(error);
  }
}

/**
 * edit 指令 - 編輯筆記
 */
export async function editCommand(id: string, content: string): Promise<void> {
  try {
    const store = getStore();
    const note = store.updateNote(id as NoteId, content);

    output.success(`Note updated: [[${note.properties.id}]]`);
  } catch (error) {
    handleError(error);
  }
}

/**
 * delete 指令 - 刪除筆記
 */
export async function deleteCommand(id: string): Promise<void> {
  try {
    const store = getStore();
    store.deleteNote(id as NoteId);

    output.success(`Note deleted: [[${id}]]`);
  } catch (error) {
    handleError(error);
  }
}

/**
 * link 指令 - 建立連結
 */
export async function linkCommand(fromId: string, toId: string): Promise<void> {
  try {
    const store = getStore();
    const fromNote = store.getNote(fromId as NoteId);
    const toNote = store.getNote(toId as NoteId);

    if (!fromNote) {
      output.error(`Source note not found: ${fromId}`);
      return;
    }
    if (!toNote) {
      output.error(`Target note not found: ${toId}`);
      return;
    }

    // 將 [[toId]] 加到 fromNote 的內容中
    const currentContent = fromNote.content.map(l => l.content).join('\n');
    const newContent = `${currentContent}\n[[${toId}]]`;
    store.updateNote(fromId as NoteId, newContent);

    output.success(`Linked [[${fromId}]] → [[${toId}]]`);
  } catch (error) {
    handleError(error);
  }
}

/**
 * unlink 指令 - 移除連結
 */
export async function unlinkCommand(
  fromId: string,
  toId: string
): Promise<void> {
  try {
    const store = getStore();
    const fromNote = store.getNote(fromId as NoteId);

    if (!fromNote) {
      output.error(`Source note not found: ${fromId}`);
      return;
    }

    // 從內容中移除 [[toId]]
    const pattern = new RegExp(`\\[\\[${toId}(?:\\|[^\\]]+)?\\]\\]`, 'g');
    const currentContent = fromNote.content.map(l => l.content).join('\n');
    const newContent = currentContent.replace(pattern, '').trim();
    store.updateNote(fromId as NoteId, newContent);

    output.success(`Unlinked [[${fromId}]] ✗ [[${toId}]]`);
  } catch (error) {
    handleError(error);
  }
}

/**
 * search 指令 - 搜尋筆記
 */
export async function searchCommand(
  query: string,
  options: { limit?: number }
): Promise<void> {
  try {
    const store = getStore();
    const limit = options.limit || 20;
    const results = store.search(query, limit);

    output.title(`Search: "${query}"`);
    output.blank();

    if (results.length === 0) {
      output.info('No results found.');
      return;
    }

    for (const result of results) {
      const count = result.note.properties.backlink_count || 0;
      console.log(
        `  [[${result.note.properties.id}]] ${result.note.displayPath} ${output.reference(count)}`
      );

      // 顯示匹配的內容
      for (const match of result.matches.slice(0, 2)) {
        console.log(`    ${match.content}`);
      }
    }

    output.blank();
    output.divider();
    output.info(`Found ${results.length} results`);
  } catch (error) {
    handleError(error);
  }
}

/**
 * refs 指令 - 顯示引用
 */
export async function refsCommand(id: string): Promise<void> {
  try {
    const store = getStore();
    const note = store.getNote(id as NoteId);

    if (!note) {
      output.error(`Note not found: ${id}`);
      return;
    }

    const backlinks = store.getBacklinks(id as NoteId);
    const related = store.getRelated(id as NoteId, 1);

    output.title(`References for [[${id}]]`);
    output.blank();

    output.subtitle(`Backlinks (${backlinks.length})`);
    if (backlinks.length === 0) {
      output.info('No backlinks.');
    } else {
      for (const bl of backlinks) {
        const summary = bl.content[0]?.content || '';
        output.note(bl.properties.id, bl.displayPath, truncate(summary, 50));
      }
    }
    output.blank();

    const outgoing = related.filter(r => r.direction === 'outgoing');
    output.subtitle(`Outgoing Links (${outgoing.length})`);
    if (outgoing.length === 0) {
      output.info('No outgoing links.');
    } else {
      for (const r of outgoing) {
        const summary = r.note.content[0]?.content || '';
        output.note(
          r.note.properties.id,
          r.note.displayPath,
          truncate(summary, 50)
        );
      }
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * orphans 指令 - 列出孤立筆記
 */
export async function orphansCommand(): Promise<void> {
  try {
    const store = getStore();
    const orphans = store.getOrphans();

    output.title('Orphan Notes');
    output.blank();

    if (orphans.length === 0) {
      output.success('No orphan notes found!');
      return;
    }

    for (const note of orphans) {
      const summary = note.content[0]?.content || '';
      output.note(note.properties.id, note.displayPath, truncate(summary, 50));
    }

    output.blank();
    output.divider();
    output.warn(`Found ${orphans.length} orphan notes`);
  } catch (error) {
    handleError(error);
  }
}

/**
 * popular 指令 - 列出最多引用的筆記
 */
export async function popularCommand(options: { limit?: number }): Promise<void> {
  try {
    const store = getStore();
    const limit = options.limit || 10;
    const popular = store.getPopular(limit);

    output.title('Most Referenced Notes');
    output.blank();

    if (popular.length === 0) {
      output.info('No notes with references found.');
      return;
    }

    for (let i = 0; i < popular.length; i++) {
      const note = popular[i]!;
      const count = note.properties.backlink_count || 0;
      const summary = note.content[0]?.content || '';
      console.log(
        `  ${i + 1}. [[${note.properties.id}]] ${truncate(summary, 40)} ${output.reference(count)}`
      );
    }

    output.blank();
    output.divider();
    output.info(`Showing top ${popular.length} notes`);
  } catch (error) {
    handleError(error);
  }
}

/**
 * expand 指令 - 展開檔案中的筆記
 */
export async function expandCommand(file: string): Promise<void> {
  try {
    const store = getStore();
    const notes = store.getNotesInFile(file);

    output.title(`Notes in ${file}`);
    output.blank();

    if (notes.length === 0) {
      output.info(`No notes found in ${file}`);
      return;
    }

    // 只展開頂層筆記
    const topLevel = notes.filter(n => !n.properties.parent);

    const formatNote = (note: Note, indent: number = 0): void => {
      const prefix = '  '.repeat(indent);
      console.log(`${prefix}[[${note.properties.id}|${note.displayPath}]]`);
      console.log(`${prefix}  id:: ${note.properties.id}`);
      if (note.properties.file)
        console.log(`${prefix}  file:: ${note.properties.file}`);
      if (note.properties.line)
        console.log(`${prefix}  line:: ${note.properties.line}`);
      console.log(`${prefix}  author:: ${note.properties.author}`);
      console.log(`${prefix}  created:: ${note.properties.created}`);

      // Backlinks
      const backlinks = store.getBacklinks(note.properties.id);
      if (backlinks.length > 0) {
        console.log(
          `${prefix}  backlinks:: ${backlinks.map(bl => `[[${bl.properties.id}]]`).join(', ')}`
        );
        console.log(`${prefix}  backlink_count:: ${backlinks.length}`);
      }

      // 內容
      for (const line of note.content) {
        console.log(
          `${prefix}  ${'  '.repeat(line.indent)}- ${line.content}`
        );
      }

      // 子筆記
      for (const child of note.children) {
        formatNote(child, indent + 1);
      }
    };

    for (const note of topLevel) {
      formatNote(note);
      output.blank();
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * scan 指令 - 手動掃描
 */
export async function scanCommand(): Promise<void> {
  try {
    const codemindPath = ensureCodemindExists();
    const rootDir = path.dirname(codemindPath);

    const daemon: Daemon = createDaemon({
      rootDir,
      codemindPath,
      watchExtensions: ['.ts', '.js', '.tsx', '.jsx', '.md'],
      ignorePatterns: [],
      debounceMs: 0, // 立即處理
      maxRetries: 3,
    });

    output.info('Scanning project for markers...');
    const result = await daemon.scan();
    output.success(
      `Scan complete. ${result.filesScanned} files scanned, ${result.notesCreated} created, ${result.notesUpdated} updated.`
    );
    if (result.errors.length > 0) {
      output.warn(`${result.errors.length} errors occurred`);
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * check 指令 - 檢查一致性
 */
export async function checkCommand(): Promise<void> {
  try {
    const store = getStore();
    const allNotes = store.getAllNotes();
    let issues = 0;

    output.title('Consistency Check');
    output.blank();

    // 檢查孤立筆記
    const orphans = store.getOrphans();
    if (orphans.length > 0) {
      output.warn(`${orphans.length} orphan notes found`);
      issues += orphans.length;
    }

    // 檢查無內容的筆記
    const emptyNotes = allNotes.filter(
      n => n.content.length === 0 || n.content.every(l => !l.content.trim())
    );
    if (emptyNotes.length > 0) {
      output.warn(`${emptyNotes.length} empty notes found`);
      for (const note of emptyNotes) {
        output.item(`[[${note.properties.id}]] has no content`);
      }
      issues += emptyNotes.length;
    }

    // 檢查損壞的父引用
    for (const note of allNotes) {
      if (note.properties.parent) {
        const parent = store.getNote(note.properties.parent);
        if (!parent) {
          output.warn(`[[${note.properties.id}]] has invalid parent: ${note.properties.parent}`);
          issues++;
        }
      }
    }

    output.blank();
    output.divider();
    if (issues === 0) {
      output.success('All checks passed!');
    } else {
      output.warn(`Found ${issues} issues`);
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * export 指令 - 匯出筆記
 */
export async function exportCommand(options: { json?: boolean }): Promise<void> {
  try {
    const store = getStore();
    const allNotes = store.getAllNotes();
    const projectRoot = store.getProjectRoot();

    if (options.json) {
      const data = {
        project: projectRoot
          ? {
              name: projectRoot.name,
              created: projectRoot.created,
            }
          : null,
        notes: allNotes.map(note => ({
          id: note.properties.id,
          displayPath: note.displayPath,
          file: note.properties.file,
          line: note.properties.line,
          author: note.properties.author,
          created: note.properties.created,
          parent: note.properties.parent,
          backlink_count: note.properties.backlink_count || 0,
          content: note.content.map(l => l.content).join('\n'),
          children: note.children.map(c => c.properties.id),
        })),
        stats: {
          totalNotes: allNotes.length,
          orphans: store.getOrphans().length,
          exportedAt: new Date().toISOString(),
        },
      };
      output.json(data);
    } else {
      // Markdown export
      output.title(`# ${projectRoot?.name || 'Code-Mind Export'}`);
      output.blank();
      output.info(`Exported: ${new Date().toISOString()}`);
      output.info(`Total notes: ${allNotes.length}`);
      output.blank();

      for (const note of allNotes.filter(n => !n.properties.parent)) {
        console.log(`## [[${note.properties.id}|${note.displayPath}]]`);
        console.log('');
        for (const line of note.content) {
          console.log(`${'  '.repeat(line.indent)}- ${line.content}`);
        }
        console.log('');
      }
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * stats 指令 - 顯示統計
 */
export async function statsCommand(): Promise<void> {
  try {
    const store = getStore();
    const allNotes = store.getAllNotes();
    const projectRoot = store.getProjectRoot();

    output.title('Code-Mind Statistics');
    output.blank();

    if (projectRoot) {
      output.info(`Project: ${projectRoot.name}`);
      output.info(`Created: ${projectRoot.created}`);
      output.blank();
    }

    // 基本統計
    output.subtitle('Overview');
    output.item(`Total notes: ${allNotes.length}`);
    output.item(`Top-level notes: ${allNotes.filter(n => !n.properties.parent).length}`);
    output.item(`Child notes: ${allNotes.filter(n => n.properties.parent).length}`);
    output.blank();

    // 連結統計
    const orphans = store.getOrphans();
    const popular = store.getPopular(1);
    const totalBacklinks = allNotes.reduce(
      (sum, n) => sum + (n.properties.backlink_count || 0),
      0
    );

    output.subtitle('Links');
    output.item(`Total references: ${totalBacklinks}`);
    output.item(`Orphan notes: ${orphans.length}`);
    if (popular[0]) {
      output.item(
        `Most referenced: [[${popular[0].properties.id}]] (${popular[0].properties.backlink_count || 0})`
      );
    }
    output.blank();

    // 檔案統計
    const byFile = new Map<string, number>();
    for (const note of allNotes) {
      const file = note.properties.file || 'unknown';
      byFile.set(file, (byFile.get(file) || 0) + 1);
    }

    output.subtitle(`Files (${byFile.size})`);
    const sortedFiles = [...byFile.entries()].sort((a, b) => b[1] - a[1]);
    for (const [file, count] of sortedFiles.slice(0, 5)) {
      output.item(`${file}: ${count} notes`);
    }
    if (sortedFiles.length > 5) {
      output.item(`... and ${sortedFiles.length - 5} more files`);
    }
    output.blank();

    // 作者統計
    const byAuthor = new Map<string, number>();
    for (const note of allNotes) {
      const author = note.properties.author || 'unknown';
      byAuthor.set(author, (byAuthor.get(author) || 0) + 1);
    }

    output.subtitle('Authors');
    for (const [author, count] of byAuthor.entries()) {
      output.item(`${author}: ${count} notes`);
    }
  } catch (error) {
    handleError(error);
  }
}
