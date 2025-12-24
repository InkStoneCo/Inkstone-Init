import type { NoteId } from '@uncle6/codemind-core';
/**
 * 標記模式
 */
export declare const PATTERNS: {
    readonly newNote: RegExp;
    readonly childNote: RegExp;
    readonly updateNote: RegExp;
    readonly reference: RegExp;
};
/**
 * 處理變更類型
 */
export type ChangeType = 'create' | 'create_child' | 'update';
/**
 * 處理變更
 */
export interface ProcessChange {
    type: ChangeType;
    noteId: NoteId;
    parentId?: NoteId;
    content: string;
    line: number;
    originalText: string;
}
/**
 * 處理結果
 */
export interface ProcessResult {
    modified: boolean;
    newContent: string;
    changes: ProcessChange[];
}
/**
 * 處理器設定
 */
export interface ProcessorConfig {
    /** ID 產生器 */
    generateId: () => NoteId;
    /** 取得筆記 (驗證 ID 是否存在) */
    noteExists?: (id: NoteId) => boolean;
}
/**
 * 處理器介面
 */
export interface Processor {
    processFile(filePath: string, content: string): ProcessResult;
    findMarkers(content: string): MarkerMatch[];
    findReferences(content: string): ReferenceMatch[];
}
/**
 * 標記匹配
 */
export interface MarkerMatch {
    type: 'new' | 'child' | 'update';
    fullMatch: string;
    content: string;
    parentId?: NoteId;
    noteId?: NoteId;
    startIndex: number;
    endIndex: number;
    line: number;
}
/**
 * 引用匹配
 */
export interface ReferenceMatch {
    fullMatch: string;
    noteId: NoteId;
    displayText?: string;
    startIndex: number;
    endIndex: number;
    line: number;
}
/**
 * 建立處理器
 */
export declare function createProcessor(config: ProcessorConfig): Processor;
/**
 * 檢測多行內容
 * 用於處理跨行的標記內容
 */
export declare function parseMultilineContent(content: string): string[];
/**
 * 格式化為筆記內容
 */
export declare function formatNoteContent(lines: string[]): string;
//# sourceMappingURL=processor.d.ts.map