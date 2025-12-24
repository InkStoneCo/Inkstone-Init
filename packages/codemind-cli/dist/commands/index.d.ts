/**
 * init 指令 - 初始化專案
 */
export declare function initCommand(options: {
    name?: string;
}): Promise<void>;
/**
 * daemon 指令 - Daemon 管理
 */
export declare function daemonCommand(action: 'start' | 'stop' | 'status'): Promise<void>;
/**
 * map 指令 - 顯示專案地圖
 */
export declare function mapCommand(): Promise<void>;
/**
 * list 指令 - 列出所有筆記
 */
export declare function listCommand(options: {
    file?: string;
    limit?: number;
}): Promise<void>;
/**
 * show 指令 - 顯示筆記詳情
 */
export declare function showCommand(id: string): Promise<void>;
/**
 * tree 指令 - 樹狀顯示筆記
 */
export declare function treeCommand(options: {
    file?: string;
}): Promise<void>;
/**
 * add 指令 - 新增筆記
 */
export declare function addCommand(file: string, content: string, options: {
    parent?: string;
}): Promise<void>;
/**
 * edit 指令 - 編輯筆記
 */
export declare function editCommand(id: string, content: string): Promise<void>;
/**
 * delete 指令 - 刪除筆記
 */
export declare function deleteCommand(id: string): Promise<void>;
/**
 * link 指令 - 建立連結
 */
export declare function linkCommand(fromId: string, toId: string): Promise<void>;
/**
 * unlink 指令 - 移除連結
 */
export declare function unlinkCommand(fromId: string, toId: string): Promise<void>;
/**
 * search 指令 - 搜尋筆記
 */
export declare function searchCommand(query: string, options: {
    limit?: number;
}): Promise<void>;
/**
 * refs 指令 - 顯示引用
 */
export declare function refsCommand(id: string): Promise<void>;
/**
 * orphans 指令 - 列出孤立筆記
 */
export declare function orphansCommand(): Promise<void>;
/**
 * popular 指令 - 列出最多引用的筆記
 */
export declare function popularCommand(options: {
    limit?: number;
}): Promise<void>;
/**
 * expand 指令 - 展開檔案中的筆記
 */
export declare function expandCommand(file: string): Promise<void>;
/**
 * scan 指令 - 手動掃描
 */
export declare function scanCommand(): Promise<void>;
/**
 * check 指令 - 檢查一致性
 */
export declare function checkCommand(): Promise<void>;
/**
 * export 指令 - 匯出筆記
 */
export declare function exportCommand(options: {
    json?: boolean;
}): Promise<void>;
/**
 * stats 指令 - 顯示統計
 */
export declare function statsCommand(): Promise<void>;
//# sourceMappingURL=index.d.ts.map