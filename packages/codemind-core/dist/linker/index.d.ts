import type { Note, NoteId, LinkGraph } from '../types/index.js';
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
 * 從內容中提取所有筆記引用
 */
declare function extractReferencesFromContent(content: string): NoteId[];
/**
 * 從筆記中提取所有引用（包含 related 屬性和內容）
 */
declare function extractAllReferences(note: Note): NoteId[];
/**
 * 建立 BacklinkManager 實例
 */
export declare function createBacklinkManager(): BacklinkManager;
export { extractReferencesFromContent, extractAllReferences };
//# sourceMappingURL=index.d.ts.map