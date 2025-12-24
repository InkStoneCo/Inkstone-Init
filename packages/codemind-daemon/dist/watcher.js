// FileWatcher module - 檔案監控
// Phase 2.1 實作
import chokidar from 'chokidar';
import * as path from 'path';
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
export function createFileWatcher(config) {
    const { rootDir, extensions, ignore, debounceMs } = config;
    let watcher = null;
    let running = false;
    const callbacks = new Set();
    // 防抖動計時器
    const debounceTimers = new Map();
    /**
     * 檢查副檔名是否符合
     */
    function matchesExtension(filePath) {
        if (extensions.length === 0)
            return true;
        const ext = path.extname(filePath);
        return extensions.includes(ext);
    }
    /**
     * 發送事件（含防抖動）
     */
    function emitEvent(type, filePath) {
        // 取消現有計時器
        const existingTimer = debounceTimers.get(filePath);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }
        // 設置新計時器
        const timer = setTimeout(() => {
            debounceTimers.delete(filePath);
            const event = {
                type,
                filePath,
                timestamp: Date.now(),
            };
            for (const callback of callbacks) {
                try {
                    callback(event);
                }
                catch (error) {
                    console.error(`FileWatcher callback error:`, error);
                }
            }
        }, debounceMs);
        debounceTimers.set(filePath, timer);
    }
    /**
     * 處理檔案事件
     */
    function handleFileEvent(type, filePath) {
        if (!matchesExtension(filePath))
            return;
        emitEvent(type, filePath);
    }
    return {
        async start() {
            if (running)
                return;
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
            await new Promise(resolve => {
                watcher.on('ready', resolve);
            });
            running = true;
        },
        async stop() {
            if (!running || !watcher)
                return;
            // 清除所有防抖動計時器
            for (const timer of debounceTimers.values()) {
                clearTimeout(timer);
            }
            debounceTimers.clear();
            await watcher.close();
            watcher = null;
            running = false;
        },
        isRunning() {
            return running;
        },
        onFileChange(callback) {
            callbacks.add(callback);
        },
        offFileChange(callback) {
            callbacks.delete(callback);
        },
        getWatchedPaths() {
            if (!watcher)
                return [];
            const watched = watcher.getWatched();
            const paths = [];
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
//# sourceMappingURL=watcher.js.map