import type { Note, NoteId, NotePath, NoteProperties, RelatedNote, SearchResult, ProjectRoot, ParseResult } from '../types/index.js';
/**
 * NoteStore 介面
 */
export interface NoteStore {
    getNote(id: NoteId): Note | null;
    getNoteByPath(path: NotePath): Note | null;
    getAllNotes(): Note[];
    getNotesInFile(file: string): Note[];
    getChildren(parentId: NoteId): Note[];
    getBacklinks(id: NoteId): Note[];
    getRelated(id: NoteId, depth?: number): RelatedNote[];
    getOrphans(): Note[];
    getPopular(limit?: number): Note[];
    search(query: string, limit?: number): SearchResult[];
    addNote(file: string, content: string, parentId?: NoteId, noteId?: NoteId, extraProperties?: Partial<NoteProperties>): Note;
    updateNote(id: NoteId, content: string): Note;
    deleteNote(id: NoteId): void;
    moveNote(id: NoteId, newFile: string, newLine?: number): Note;
    reload(): void;
    save(): void;
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
 * 建立 NoteStore 實例
 */
export declare function createNoteStore(codemindPath: string, options?: NoteStoreOptions): NoteStore;
//# sourceMappingURL=index.d.ts.map