// BacklinkManager module - 雙向連結管理
// Phase 1.4 實作

import type { Note, NoteId, LinkGraph, LinkEdge } from '../types/index.js';

/**
 * BacklinkManager 介面
 */
export interface BacklinkManager {
  rebuildAll(notes: Note[]): void;
  updateForNote(note: Note, oldContent: string, newContent: string): NoteId[];
  removeNote(id: NoteId): NoteId[];
  getLinkGraph(): LinkGraph;
  getForwardLinks(id: NoteId): NoteId[];
  getBackwardLinks(id: NoteId): NoteId[];
  getBacklinkCount(id: NoteId): number;
}

/**
 * 正則表達式：提取筆記引用
 */
const NOTE_REF_PATTERN = /\[\[(cm\.[a-z0-9]+)(?:\|[^\]]+)?\]\]/g;

/**
 * 從內容中提取所有筆記引用
 */
function extractReferencesFromContent(content: string): NoteId[] {
  const refs: NoteId[] = [];
  const regex = new RegExp(NOTE_REF_PATTERN.source, 'g');
  let match;
  while ((match = regex.exec(content)) !== null) {
    const id = match[1] as NoteId;
    if (!refs.includes(id)) {
      refs.push(id);
    }
  }
  return refs;
}

/**
 * 從筆記中提取所有引用（包含 related 屬性和內容）
 */
function extractAllReferences(note: Note): NoteId[] {
  const refs: NoteId[] = [];

  // 從 related 屬性
  if (note.properties.related) {
    for (const ref of note.properties.related) {
      if (!refs.includes(ref)) {
        refs.push(ref);
      }
    }
  }

  // 從內容
  for (const line of note.content) {
    if (line.references) {
      for (const ref of line.references) {
        if (!refs.includes(ref)) {
          refs.push(ref);
        }
      }
    }
    // 也解析內容文字中的引用
    const contentRefs = extractReferencesFromContent(line.content);
    for (const ref of contentRefs) {
      if (!refs.includes(ref)) {
        refs.push(ref);
      }
    }
  }

  return refs;
}

/**
 * 建立 BacklinkManager 實例
 */
export function createBacklinkManager(): BacklinkManager {
  // 正向連結: noteId -> [引用的 noteIds]
  const forwardLinks = new Map<NoteId, NoteId[]>();
  // 反向連結: noteId -> [被哪些 noteIds 引用]
  const backwardLinks = new Map<NoteId, NoteId[]>();
  // 所有已知的筆記 ID
  const knownNotes = new Set<NoteId>();

  /**
   * 新增正向連結
   */
  function addForwardLink(fromId: NoteId, toId: NoteId): void {
    const existing = forwardLinks.get(fromId) || [];
    if (!existing.includes(toId)) {
      existing.push(toId);
      forwardLinks.set(fromId, existing);
    }
  }

  /**
   * 新增反向連結
   */
  function addBackwardLink(fromId: NoteId, toId: NoteId): void {
    const existing = backwardLinks.get(toId) || [];
    if (!existing.includes(fromId)) {
      existing.push(fromId);
      backwardLinks.set(toId, existing);
    }
  }

  /**
   * 移除正向連結
   */
  function removeForwardLink(fromId: NoteId, toId: NoteId): void {
    const existing = forwardLinks.get(fromId) || [];
    const idx = existing.indexOf(toId);
    if (idx !== -1) {
      existing.splice(idx, 1);
      forwardLinks.set(fromId, existing);
    }
  }

  /**
   * 移除反向連結
   */
  function removeBackwardLink(fromId: NoteId, toId: NoteId): void {
    const existing = backwardLinks.get(toId) || [];
    const idx = existing.indexOf(fromId);
    if (idx !== -1) {
      existing.splice(idx, 1);
      backwardLinks.set(toId, existing);
    }
  }

  /**
   * 清除某筆記的所有連結
   */
  function clearLinksForNote(id: NoteId): void {
    // 清除此筆記的正向連結
    const forwards = forwardLinks.get(id) || [];
    for (const toId of forwards) {
      removeBackwardLink(id, toId);
    }
    forwardLinks.delete(id);

    // 清除指向此筆記的反向連結
    const backwards = backwardLinks.get(id) || [];
    for (const fromId of backwards) {
      removeForwardLink(fromId, id);
    }
    backwardLinks.delete(id);
  }

  /**
   * 重建所有連結
   */
  function rebuildAll(notes: Note[]): void {
    // 清空所有連結
    forwardLinks.clear();
    backwardLinks.clear();
    knownNotes.clear();

    // 收集所有筆記 ID
    function collectNotes(noteList: Note[]) {
      for (const note of noteList) {
        knownNotes.add(note.properties.id);
        if (note.children.length > 0) {
          collectNotes(note.children);
        }
      }
    }
    collectNotes(notes);

    // 建立連結
    function processNotes(noteList: Note[]) {
      for (const note of noteList) {
        const refs = extractAllReferences(note);
        for (const refId of refs) {
          addForwardLink(note.properties.id, refId);
          addBackwardLink(note.properties.id, refId);
        }

        if (note.children.length > 0) {
          processNotes(note.children);
        }
      }
    }
    processNotes(notes);
  }

  /**
   * 更新筆記的連結（當內容變更時）
   * 返回受影響的筆記 ID 列表
   */
  function updateForNote(note: Note, oldContent: string, _newContent: string): NoteId[] {
    const noteId = note.properties.id;
    const affected: NoteId[] = [];

    // 提取舊引用和新引用
    const oldRefs = extractReferencesFromContent(oldContent);
    const newRefs = extractAllReferences(note);

    // 找出被移除的引用
    for (const oldRef of oldRefs) {
      if (!newRefs.includes(oldRef)) {
        removeForwardLink(noteId, oldRef);
        removeBackwardLink(noteId, oldRef);
        if (!affected.includes(oldRef)) {
          affected.push(oldRef);
        }
      }
    }

    // 找出新增的引用
    for (const newRef of newRefs) {
      if (!oldRefs.includes(newRef)) {
        addForwardLink(noteId, newRef);
        addBackwardLink(noteId, newRef);
        if (!affected.includes(newRef)) {
          affected.push(newRef);
        }
      }
    }

    return affected;
  }

  /**
   * 移除筆記時清理連結
   * 返回受影響的筆記 ID 列表
   */
  function removeNote(id: NoteId): NoteId[] {
    const affected: NoteId[] = [];

    // 收集受影響的筆記
    const forwards = forwardLinks.get(id) || [];
    const backwards = backwardLinks.get(id) || [];

    for (const refId of forwards) {
      if (!affected.includes(refId)) {
        affected.push(refId);
      }
    }
    for (const refId of backwards) {
      if (!affected.includes(refId)) {
        affected.push(refId);
      }
    }

    // 清除連結
    clearLinksForNote(id);
    knownNotes.delete(id);

    return affected;
  }

  /**
   * 取得連結圖
   */
  function getLinkGraph(): LinkGraph {
    const nodes = [...knownNotes];
    const edges: LinkEdge[] = [];

    for (const [fromId, toIds] of forwardLinks) {
      for (const toId of toIds) {
        edges.push({ from: fromId, to: toId });
      }
    }

    return { nodes, edges };
  }

  /**
   * 取得某筆記的正向連結
   */
  function getForwardLinks(id: NoteId): NoteId[] {
    return forwardLinks.get(id) || [];
  }

  /**
   * 取得某筆記的反向連結
   */
  function getBackwardLinks(id: NoteId): NoteId[] {
    return backwardLinks.get(id) || [];
  }

  /**
   * 取得某筆記的被引用次數
   */
  function getBacklinkCount(id: NoteId): number {
    return (backwardLinks.get(id) || []).length;
  }

  return {
    rebuildAll,
    updateForNote,
    removeNote,
    getLinkGraph,
    getForwardLinks,
    getBackwardLinks,
    getBacklinkCount,
  };
}

// 導出輔助函數供測試使用
export { extractReferencesFromContent, extractAllReferences };
