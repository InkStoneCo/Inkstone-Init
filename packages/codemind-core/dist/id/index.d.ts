import type { NoteId, NotePath } from '../types/index.js';
/**
 * ID 產生器介面
 */
export interface IdGenerator {
    generateId(): NoteId;
    generateUniqueId(existingIds: Set<NoteId>): NoteId;
    isValidId(id: string): id is NoteId;
    generateDisplayPath(file: string, id: NoteId, parentId?: NoteId): NotePath;
    extractIdFromRef(ref: string): NoteId | null;
    parseDisplayPath(displayPath: NotePath): {
        file: string;
        id: string;
        parentId?: string;
    } | null;
}
/**
 * ID 產生器選項
 */
export interface IdGeneratorOptions {
    /** ID 長度 (預設: 6) */
    idLength?: number;
    /** 字元集 (預設: 小寫字母 + 數字) */
    alphabet?: string;
    /** 自訂隨機函數 (供測試使用) */
    randomFn?: () => number;
}
/**
 * 建立 ID 產生器實例
 */
export declare function createIdGenerator(options?: IdGeneratorOptions): IdGenerator;
export declare const generateId: () => NoteId;
export declare const generateUniqueId: (existingIds: Set<NoteId>) => NoteId;
export declare const isValidId: (id: string) => id is NoteId;
export declare const generateDisplayPath: (file: string, id: NoteId, parentId?: NoteId) => NotePath;
export declare const extractIdFromRef: (ref: string) => NoteId | null;
export declare const parseDisplayPath: (displayPath: NotePath) => {
    file: string;
    id: string;
    parentId?: string;
} | null;
//# sourceMappingURL=index.d.ts.map