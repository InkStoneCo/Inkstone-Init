/**
 * 檔案變更事件類型
 */
export type FileChangeType = 'add' | 'change' | 'unlink';
/**
 * 檔案變更事件
 */
export interface FileChangeEvent {
    type: FileChangeType;
    filePath: string;
    timestamp: number;
}
/**
 * 檔案監控器設定
 */
export interface FileWatcherConfig {
    /** 監控的根目錄 */
    rootDir: string;
    /** 監控的副檔名 (例如: ['.ts', '.js', '.md']) */
    extensions: string[];
    /** 忽略的目錄/檔案模式 */
    ignore: string[];
    /** 防抖動延遲 (毫秒) */
    debounceMs: number;
}
/**
 * 檔案變更回調函數
 */
export type FileChangeCallback = (event: FileChangeEvent) => void;
/**
 * 檔案監控器介面
 */
export interface FileWatcher {
    start(): Promise<void>;
    stop(): Promise<void>;
    isRunning(): boolean;
    onFileChange(callback: FileChangeCallback): void;
    offFileChange(callback: FileChangeCallback): void;
    getWatchedPaths(): string[];
}
/**
 * 建立檔案監控器
 */
export declare function createFileWatcher(config: FileWatcherConfig): FileWatcher;
//# sourceMappingURL=watcher.d.ts.map