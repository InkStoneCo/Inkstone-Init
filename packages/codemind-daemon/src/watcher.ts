// FileWatcher module - 檔案監控
// Phase 2.1 實作

import chokidar, { type FSWatcher } from 'chokidar';
import * as path from 'path';

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
 * 預設忽略模式
 */
const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/.codemind/**',
  '**/codemind.md', // 避免無限迴圈
];

/**
 * 建立檔案監控器
 */
export function createFileWatcher(config: FileWatcherConfig): FileWatcher {
  const { rootDir, extensions, ignore, debounceMs } = config;

  let watcher: FSWatcher | null = null;
  let running = false;
  const callbacks: Set<FileChangeCallback> = new Set();

  // 防抖動計時器
  const debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * 檢查副檔名是否符合
   */
  function matchesExtension(filePath: string): boolean {
    if (extensions.length === 0) return true;
    const ext = path.extname(filePath);
    return extensions.includes(ext);
  }

  /**
   * 發送事件（含防抖動）
   */
  function emitEvent(type: FileChangeType, filePath: string): void {
    // 取消現有計時器
    const existingTimer = debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 設置新計時器
    const timer = setTimeout(() => {
      debounceTimers.delete(filePath);

      const event: FileChangeEvent = {
        type,
        filePath,
        timestamp: Date.now(),
      };

      for (const callback of callbacks) {
        try {
          callback(event);
        } catch (error) {
          console.error(`FileWatcher callback error:`, error);
        }
      }
    }, debounceMs);

    debounceTimers.set(filePath, timer);
  }

  /**
   * 處理檔案事件
   */
  function handleFileEvent(type: FileChangeType, filePath: string): void {
    if (!matchesExtension(filePath)) return;
    emitEvent(type, filePath);
  }

  return {
    async start(): Promise<void> {
      if (running) return;

      const ignorePatterns = [...DEFAULT_IGNORE, ...ignore];

      watcher = chokidar.watch(rootDir, {
        ignored: ignorePatterns,
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 50,
        },
      });

      watcher.on('add', filePath => handleFileEvent('add', filePath));
      watcher.on('change', filePath => handleFileEvent('change', filePath));
      watcher.on('unlink', filePath => handleFileEvent('unlink', filePath));

      // 等待 watcher 準備好
      await new Promise<void>(resolve => {
        watcher!.on('ready', resolve);
      });

      running = true;
    },

    async stop(): Promise<void> {
      if (!running || !watcher) return;

      // 清除所有防抖動計時器
      for (const timer of debounceTimers.values()) {
        clearTimeout(timer);
      }
      debounceTimers.clear();

      await watcher.close();
      watcher = null;
      running = false;
    },

    isRunning(): boolean {
      return running;
    },

    onFileChange(callback: FileChangeCallback): void {
      callbacks.add(callback);
    },

    offFileChange(callback: FileChangeCallback): void {
      callbacks.delete(callback);
    },

    getWatchedPaths(): string[] {
      if (!watcher) return [];
      const watched = watcher.getWatched();
      const paths: string[] = [];
      for (const [dir, files] of Object.entries(watched)) {
        for (const file of files) {
          if (file !== '..') {
            paths.push(path.join(dir, file));
          }
        }
      }
      return paths;
    },
  };
}
