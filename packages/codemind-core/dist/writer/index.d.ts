import type { ProjectRoot, Note, NoteLine, NoteProperties } from '../types/index.js';
/**
 * 寫入選項
 */
export interface WriteOptions {
    preserveFormatting?: boolean;
    sortNotes?: boolean;
}
/**
 * Writer 介面
 */
export interface Writer {
    write(projectRoot: ProjectRoot | null, notes: Note[], options?: WriteOptions): string;
    serializeNote(note: Note, indent: number): string;
    generateMap(notes: Note[]): string;
}
/**
 * 按檔案分組筆記
 */
declare function groupNotesByFile(notes: Note[]): Map<string, Note[]>;
/**
 * 取得筆記摘要（第一行內容，截斷）
 */
declare function getSummary(note: Note, maxLength?: number): string;
/**
 * 格式化元數據行（bullet 格式）
 * 格式: - author · date · line X
 */
declare function formatMetadata(props: NoteProperties): string;
/**
 * 序列化筆記內容（bullet 格式）
 */
declare function serializeContent(content: NoteLine[], baseIndent: number): string[];
/**
 * 序列化單一筆記（bullet + indent 格式）
 */
declare function serializeNote(note: Note, baseIndent?: number): string;
/**
 * 產生 Map 區塊（保留兼容性，但簡化）
 */
declare function generateMap(_notes: Note[]): string;
/**
 * 序列化專案頭部（bullet 格式）
 */
declare function serializeProjectHeader(projectRoot: ProjectRoot): string;
/**
 * 建立 Writer 實例
 */
export declare function createWriter(): Writer;
export { serializeContent, serializeNote, serializeProjectHeader, generateMap, groupNotesByFile, getSummary, formatMetadata, };
export declare const serializeProperties: typeof formatMetadata;
export declare const serializeProjectRoot: typeof serializeProjectHeader;
//# sourceMappingURL=index.d.ts.map