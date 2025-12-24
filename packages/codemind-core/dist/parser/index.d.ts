import type { ParseResult, Note, NoteId, ProjectRoot } from '../types/index.js';
/**
 * Parser 介面
 */
export interface Parser {
    parse(content: string): ParseResult;
    parseNoteBlock(lines: string[], startLine: number): Note | null;
    extractReferences(content: string): NoteId[];
}
/**
 * 提取筆記引用
 */
declare function extractReferences(content: string): NoteId[];
/**
 * 解析新格式（Bullet + Indent）
 */
declare function parseNewFormat(lines: string[]): {
    projectRoot: ProjectRoot | null;
    notes: Note[];
};
/**
 * 解析舊格式（Logseq 風格）
 */
declare function parseOldFormat(lines: string[]): {
    projectRoot: ProjectRoot | null;
    notes: Note[];
};
/**
 * 檢測格式類型
 */
declare function detectFormat(content: string): 'new' | 'old';
/**
 * 建立 Parser 實例
 */
export declare function createParser(): Parser;
export { extractReferences, detectFormat, parseNewFormat, parseOldFormat };
export declare function parseLine(line: string, lineNumber: number): {
    lineNumber: number;
    indent: number;
    content: string;
    isBullet: boolean;
    raw: string;
};
export declare function parseProperty(content: string): {
    key: string;
    value: string;
} | null;
export declare function isNoteBlockStart(content: string): NoteId | null;
//# sourceMappingURL=index.d.ts.map