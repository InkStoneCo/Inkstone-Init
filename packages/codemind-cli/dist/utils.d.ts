/**
 * 尋找 codemind.md 檔案路徑
 * 從當前目錄向上搜尋
 */
export declare function findCodemindPath(startDir?: string): string | null;
/**
 * 取得專案根目錄
 */
export declare function getProjectRoot(startDir?: string): string | null;
/**
 * 輸出格式化工具
 */
export declare const output: {
    success(message: string): void;
    error(message: string): void;
    warn(message: string): void;
    info(message: string): void;
    title(message: string): void;
    subtitle(message: string): void;
    item(message: string, indent?: number): void;
    note(id: string, displayPath: string, summary?: string): void;
    reference(count: number): string;
    divider(): void;
    blank(): void;
    json(data: unknown): void;
};
/**
 * 錯誤處理
 */
export declare function handleError(error: unknown): never;
/**
 * 確保 codemind.md 存在
 */
export declare function ensureCodemindExists(): string;
/**
 * 格式化日期
 */
export declare function formatDate(date: string | Date): string;
/**
 * 截斷文字
 */
export declare function truncate(text: string, maxLength: number): string;
/**
 * 計算相對路徑
 */
export declare function relativePath(filePath: string, basePath?: string): string;
//# sourceMappingURL=utils.d.ts.map