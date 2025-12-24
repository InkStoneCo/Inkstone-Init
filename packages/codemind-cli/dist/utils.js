// CLI Utilities module
// Phase 4.1 實作
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
/**
 * 尋找 codemind.md 檔案路徑
 * 從當前目錄向上搜尋
 */
export function findCodemindPath(startDir = process.cwd()) {
    let currentDir = startDir;
    while (currentDir !== path.dirname(currentDir)) {
        const codemindPath = path.join(currentDir, 'codemind.md');
        if (fs.existsSync(codemindPath)) {
            return codemindPath;
        }
        currentDir = path.dirname(currentDir);
    }
    // 檢查根目錄
    const rootPath = path.join(currentDir, 'codemind.md');
    if (fs.existsSync(rootPath)) {
        return rootPath;
    }
    return null;
}
/**
 * 取得專案根目錄
 */
export function getProjectRoot(startDir = process.cwd()) {
    const codemindPath = findCodemindPath(startDir);
    return codemindPath ? path.dirname(codemindPath) : null;
}
/**
 * 輸出格式化工具
 */
export const output = {
    success(message) {
        console.log(chalk.green('✓'), message);
    },
    error(message) {
        console.error(chalk.red('✗'), message);
    },
    warn(message) {
        console.log(chalk.yellow('⚠'), message);
    },
    info(message) {
        console.log(chalk.blue('ℹ'), message);
    },
    title(message) {
        console.log(chalk.bold.cyan(message));
    },
    subtitle(message) {
        console.log(chalk.gray(message));
    },
    item(message, indent = 0) {
        const prefix = '  '.repeat(indent);
        console.log(`${prefix}•`, message);
    },
    note(id, displayPath, summary) {
        const idStr = chalk.cyan(`[[${id}]]`);
        const pathStr = chalk.white(displayPath);
        if (summary) {
            console.log(`  ${idStr} ${pathStr}`);
            console.log(`    ${chalk.gray(summary)}`);
        }
        else {
            console.log(`  ${idStr} ${pathStr}`);
        }
    },
    reference(count) {
        if (count === 0)
            return chalk.gray('[0]');
        if (count < 5)
            return chalk.yellow(`[${count}]`);
        return chalk.green(`[${count}]`);
    },
    divider() {
        console.log(chalk.gray('─'.repeat(50)));
    },
    blank() {
        console.log('');
    },
    json(data) {
        console.log(JSON.stringify(data, null, 2));
    },
};
/**
 * 錯誤處理
 */
export function handleError(error) {
    if (error instanceof Error) {
        output.error(error.message);
    }
    else {
        output.error(String(error));
    }
    process.exit(1);
}
/**
 * 確保 codemind.md 存在
 */
export function ensureCodemindExists() {
    const codemindPath = findCodemindPath();
    if (!codemindPath) {
        output.error('No codemind.md found. Run "codemind init" first.');
        process.exit(1);
    }
    return codemindPath;
}
/**
 * 格式化日期
 */
export function formatDate(date) {
    if (typeof date === 'string') {
        return date;
    }
    return date.toISOString().split('T')[0] || '';
}
/**
 * 截斷文字
 */
export function truncate(text, maxLength) {
    if (text.length <= maxLength)
        return text;
    return text.slice(0, maxLength - 3) + '...';
}
/**
 * 計算相對路徑
 */
export function relativePath(filePath, basePath) {
    const base = basePath || process.cwd();
    const relative = path.relative(base, filePath);
    return relative || filePath;
}
//# sourceMappingURL=utils.js.map