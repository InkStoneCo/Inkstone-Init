import { type ProcessChange } from './processor.js';
/**
 * Daemon 設定
 */
export interface DaemonConfig {
    /** 專案根目錄 */
    rootDir: string;
    /** codemind.md 檔案路徑 */
    codemindPath?: string;
    /** 監控的副檔名 */
    watchExtensions: string[];
    /** 忽略的模式 */
    ignorePatterns: string[];
    /** 防抖動延遲 (毫秒) */
    debounceMs: number;
    /** 最大重試次數 */
    maxRetries: number;
    /** 日誌函數 */
    logger?: Logger;
}
/**
 * 日誌介面
 */
export interface Logger {
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
    debug(message: string, ...args: unknown[]): void;
}
/**
 * Daemon 狀態
 */
export interface DaemonStatus {
    running: boolean;
    startTime?: number;
    uptime?: number;
    lastScan?: string;
    watchedFiles: number;
    queueLength: number;
    processedFiles: number;
    errors: number;
}
/**
 * 掃描結果
 */
export interface ScanResult {
    filesScanned: number;
    notesCreated: number;
    notesUpdated: number;
    errors: string[];
}
/**
 * Daemon 介面
 */
export interface Daemon {
    start(): Promise<void>;
    stop(): Promise<void>;
    status(): DaemonStatus;
    scan(): Promise<ScanResult>;
    processFile(filePath: string): Promise<ProcessChange[]>;
}
/**
 * 建立 Daemon
 */
export declare function createDaemon(config: DaemonConfig): Daemon;
//# sourceMappingURL=daemon.d.ts.map