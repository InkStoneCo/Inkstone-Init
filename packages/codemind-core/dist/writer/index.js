// Writer module - 人類友善 MD 寫入器
// Phase 1.3 v3 - Bullet + Indent 格式
/**
 * 按檔案分組筆記
 */
function groupNotesByFile(notes) {
    const grouped = new Map();
    for (const note of notes) {
        const file = note.properties.file || 'unknown';
        const existing = grouped.get(file) || [];
        existing.push(note);
        grouped.set(file, existing);
    }
    return grouped;
}
/**
 * 取得筆記摘要（第一行內容，截斷）
 */
function getSummary(note, maxLength = 50) {
    if (note.content.length === 0) {
        return '';
    }
    const firstLine = note.content[0]?.content || '';
    if (firstLine.length <= maxLength) {
        return firstLine;
    }
    return firstLine.slice(0, maxLength - 3) + '...';
}
/**
 * 格式化元數據行（bullet 格式）
 * 格式: - author · date · line X
 */
function formatMetadata(props) {
    const parts = [];
    parts.push(props.author);
    parts.push(props.created);
    if (props.line !== undefined) {
        parts.push(`line ${props.line}`);
    }
    return parts.join(' · ');
}
/**
 * 產生縮排字串
 */
function indent(level) {
    return '  '.repeat(level);
}
/**
 * 序列化筆記內容（bullet 格式）
 */
function serializeContent(content, baseIndent) {
    const lines = [];
    for (const line of content) {
        const totalIndent = baseIndent + line.indent;
        lines.push(`${indent(totalIndent)}- ${line.content}`);
    }
    return lines;
}
/**
 * 序列化單一筆記（bullet + indent 格式）
 */
function serializeNote(note, baseIndent = 1) {
    const lines = [];
    // 筆記標題: - [[cm.xxx]] 摘要
    const summary = getSummary(note);
    const titleSuffix = summary ? ` ${summary}` : '';
    lines.push(`${indent(baseIndent)}- [[${note.properties.id}]]${titleSuffix}`);
    // 元數據: - author · date · line
    lines.push(`${indent(baseIndent + 1)}- ${formatMetadata(note.properties)}`);
    // 內容
    const contentLines = serializeContent(note.content, baseIndent + 1);
    lines.push(...contentLines);
    // 子筆記
    if (note.children.length > 0) {
        for (const child of note.children) {
            const childSummary = getSummary(child);
            const childTitleSuffix = childSummary ? ` ${childSummary}` : '';
            lines.push(`${indent(baseIndent + 1)}- [[${child.properties.id}]]${childTitleSuffix}`);
            lines.push(`${indent(baseIndent + 2)}- ${formatMetadata(child.properties)}`);
            const childContentLines = serializeContent(child.content, baseIndent + 2);
            lines.push(...childContentLines);
        }
    }
    return lines.join('\n');
}
/**
 * 產生 Map 區塊（保留兼容性，但簡化）
 */
function generateMap(_notes) {
    // 新格式不需要 Map，返回空字串
    return '';
}
/**
 * 序列化專案頭部（bullet 格式）
 */
function serializeProjectHeader(projectRoot) {
    const lines = [];
    lines.push('# Code-Mind Notes');
    lines.push(`- Project: ${projectRoot.name}`);
    lines.push(`- Created: ${projectRoot.created}`);
    // 專案層級筆記
    if (projectRoot.projectNotes.length > 0) {
        lines.push('');
        lines.push('- Project Notes');
        for (const line of projectRoot.projectNotes) {
            const totalIndent = 1 + line.indent;
            lines.push(`${indent(totalIndent)}- ${line.content}`);
        }
    }
    return lines.join('\n');
}
/**
 * 主寫入函數（bullet + indent 格式）
 */
function write(projectRoot, notes, options = {}) {
    const { sortNotes = true } = options;
    // 過濾出頂層筆記
    const topLevelNotes = notes.filter(n => !n.properties.parent);
    // 排序筆記
    const sortedNotes = [...topLevelNotes];
    if (sortNotes) {
        sortedNotes.sort((a, b) => {
            // 先按檔案排序
            const fileA = a.properties.file || 'unknown';
            const fileB = b.properties.file || 'unknown';
            if (fileA !== fileB) {
                return fileA.localeCompare(fileB);
            }
            // 同檔案按 ID 排序
            return a.properties.id.localeCompare(b.properties.id);
        });
    }
    const lines = [];
    // 專案頭部
    if (projectRoot) {
        lines.push(serializeProjectHeader(projectRoot));
    }
    else {
        lines.push('# Code-Mind Notes');
    }
    // 按檔案分組輸出
    const grouped = groupNotesByFile(sortedNotes);
    const sortedFiles = [...grouped.keys()].sort();
    for (const file of sortedFiles) {
        const fileNotes = grouped.get(file) || [];
        // 檔案標題
        lines.push('');
        lines.push(`- ## ${file}`);
        // 該檔案的筆記
        for (const note of fileNotes) {
            lines.push(serializeNote(note, 1));
        }
    }
    return lines.join('\n').trim() + '\n';
}
/**
 * 建立 Writer 實例
 */
export function createWriter() {
    return {
        write,
        serializeNote,
        generateMap,
    };
}
// 導出輔助函數供測試使用
export { serializeContent, serializeNote, serializeProjectHeader, generateMap, groupNotesByFile, getSummary, formatMetadata, };
// 保留舊的導出名稱以保持兼容性
export const serializeProperties = formatMetadata;
export const serializeProjectRoot = serializeProjectHeader;
//# sourceMappingURL=index.js.map