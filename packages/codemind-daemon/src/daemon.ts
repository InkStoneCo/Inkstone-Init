// Daemon module - 背景服務
// Phase 2.3 實作

import * as fs from 'fs';
import * as path from 'path';
import { createNoteStore, generateId, type NoteStore, type NoteId } from '@inkstone/codemind-core';
import { createFileWatcher, type FileWatcher, type FileChangeEvent } from './watcher.js';
import { createProcessor, type Processor, type ProcessChange } from './processor.js';

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
 * 預設日誌器
 */
const defaultLogger: Logger = {
  info: (msg, ...args) => console.log(`[INFO] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[WARN] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[ERROR] ${msg}`, ...args),
  debug: (msg, ...args) => console.debug(`[DEBUG] ${msg}`, ...args),
};

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
 * 處理佇列項目
 */
interface QueueItem {
  filePath: string;
  event: FileChangeEvent;
  retries: number;
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
 * 預設設定
 */
const DEFAULT_CONFIG: Partial<DaemonConfig> = {
  watchExtensions: ['.ts', '.js', '.tsx', '.jsx', '.md', '.py', '.go', '.rs', '.java'],
  ignorePatterns: [],
  debounceMs: 500,
  maxRetries: 3,
};

/**
 * 建立 Daemon
 */
export function createDaemon(config: DaemonConfig): Daemon {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const {
    rootDir,
    watchExtensions,
    ignorePatterns,
    debounceMs,
    maxRetries,
    logger = defaultLogger,
  } = fullConfig;

  const codemindPath = config.codemindPath || path.join(rootDir, '.codemind', 'codemind.md');

  // 內部狀態
  let running = false;
  let startTime: number | undefined;
  let lastScan: string | undefined;
  let processedFiles = 0;
  let errorCount = 0;

  // 處理佇列
  const queue: QueueItem[] = [];
  let processing = false;

  // 元件
  let watcher: FileWatcher | null = null;
  let store: NoteStore | null = null;
  let processor: Processor | null = null;

  /**
   * 初始化元件
   */
  function initialize(): void {
    // 確保 .codemind 目錄存在
    const codemindDir = path.dirname(codemindPath);
    if (!fs.existsSync(codemindDir)) {
      fs.mkdirSync(codemindDir, { recursive: true });
    }

    // 初始化 NoteStore
    store = createNoteStore(codemindPath, {
      autoSave: true,
      generateId: () => generateId(),
    });

    // 初始化 Processor
    processor = createProcessor({
      generateId: () => generateId(),
      noteExists: (id: NoteId) => store!.getNote(id) !== null,
    });

    // 初始化 FileWatcher
    watcher = createFileWatcher({
      rootDir,
      extensions: watchExtensions!,
      ignore: ignorePatterns!,
      debounceMs: debounceMs!,
    });
  }

  /**
   * 處理檔案變更
   */
  async function handleFileChange(event: FileChangeEvent): Promise<void> {
    logger.debug(`File ${event.type}: ${event.filePath}`);

    if (event.type === 'unlink') {
      // 檔案被刪除，不需處理
      return;
    }

    queue.push({
      filePath: event.filePath,
      event,
      retries: 0,
    });

    await processQueue();
  }

  /**
   * 處理佇列
   */
  async function processQueue(): Promise<void> {
    if (processing || queue.length === 0) return;
    processing = true;

    while (queue.length > 0) {
      const item = queue.shift()!;

      try {
        await processFileInternal(item.filePath);
        processedFiles++;
      } catch (error) {
        errorCount++;
        logger.error(`Error processing ${item.filePath}:`, error);

        if (item.retries < maxRetries!) {
          item.retries++;
          queue.push(item);
          logger.warn(`Retrying ${item.filePath} (attempt ${item.retries}/${maxRetries})`);
        } else {
          logger.error(`Max retries reached for ${item.filePath}`);
        }
      }
    }

    processing = false;
  }

  /**
   * 內部處理單一檔案
   */
  async function processFileInternal(filePath: string): Promise<ProcessChange[]> {
    if (!processor || !store) {
      throw new Error('Daemon not initialized');
    }

    // 讀取檔案內容
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(rootDir, filePath);

    // 處理標記
    const result = processor.processFile(relativePath, content);

    if (!result.modified) {
      return [];
    }

    // 寫回修改後的檔案
    fs.writeFileSync(filePath, result.newContent, 'utf-8');
    logger.info(`Updated ${relativePath} with ${result.changes.length} changes`);

    // 更新 NoteStore
    for (const change of result.changes) {
      switch (change.type) {
        case 'create':
          store.addNote(relativePath, change.content, undefined, change.noteId);
          logger.info(`Created note ${change.noteId}`);
          break;

        case 'create_child':
          store.addNote(relativePath, change.content, change.parentId, change.noteId);
          logger.info(`Created child note ${change.noteId} under ${change.parentId}`);
          break;

        case 'update':
          store.updateNote(change.noteId, change.content);
          logger.info(`Updated note ${change.noteId}`);
          break;
      }
    }

    return result.changes;
  }

  /**
   * 掃描目錄中的所有檔案
   */
  async function scanDirectory(): Promise<ScanResult> {
    const result: ScanResult = {
      filesScanned: 0,
      notesCreated: 0,
      notesUpdated: 0,
      errors: [],
    };

    if (!processor || !store) {
      throw new Error('Daemon not initialized');
    }

    // 遞迴掃描目錄
    function scanDir(dir: string): string[] {
      const files: string[] = [];

      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          // 跳過忽略的目錄
          if (entry.isDirectory()) {
            if (
              entry.name === 'node_modules' ||
              entry.name === '.git' ||
              entry.name === 'dist' ||
              entry.name === '.codemind'
            ) {
              continue;
            }
            files.push(...scanDir(fullPath));
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (watchExtensions!.includes(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        result.errors.push(`Error scanning ${dir}: ${error}`);
      }

      return files;
    }

    const files = scanDir(rootDir);
    result.filesScanned = files.length;

    for (const filePath of files) {
      try {
        const changes = await processFileInternal(filePath);
        for (const change of changes) {
          if (change.type === 'create' || change.type === 'create_child') {
            result.notesCreated++;
          } else if (change.type === 'update') {
            result.notesUpdated++;
          }
        }
      } catch (error) {
        result.errors.push(`Error processing ${filePath}: ${error}`);
      }
    }

    lastScan = new Date().toISOString();
    return result;
  }

  return {
    async start(): Promise<void> {
      if (running) {
        logger.warn('Daemon already running');
        return;
      }

      logger.info('Starting daemon...');
      initialize();

      // 註冊檔案變更回調
      watcher!.onFileChange(handleFileChange);

      // 啟動監控
      await watcher!.start();

      running = true;
      startTime = Date.now();
      logger.info(`Daemon started, watching ${rootDir}`);
    },

    async stop(): Promise<void> {
      if (!running) {
        logger.warn('Daemon not running');
        return;
      }

      logger.info('Stopping daemon...');

      // 停止監控
      if (watcher) {
        await watcher.stop();
      }

      // 儲存 store
      if (store) {
        store.save();
      }

      running = false;
      startTime = undefined;
      logger.info('Daemon stopped');
    },

    status(): DaemonStatus {
      const status: DaemonStatus = {
        running,
        watchedFiles: watcher?.getWatchedPaths().length || 0,
        queueLength: queue.length,
        processedFiles,
        errors: errorCount,
      };

      if (startTime !== undefined) {
        status.startTime = startTime;
        status.uptime = Date.now() - startTime;
      }
      if (lastScan !== undefined) {
        status.lastScan = lastScan;
      }

      return status;
    },

    async scan(): Promise<ScanResult> {
      if (!running) {
        // 臨時初始化以進行掃描
        initialize();
      }

      logger.info('Starting full scan...');
      const result = await scanDirectory();
      logger.info(
        `Scan complete: ${result.filesScanned} files, ${result.notesCreated} created, ${result.notesUpdated} updated`
      );

      return result;
    },

    async processFile(filePath: string): Promise<ProcessChange[]> {
      if (!running) {
        initialize();
      }
      return processFileInternal(filePath);
    },
  };
}
